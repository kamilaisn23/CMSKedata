import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requestUser } from '../access.js';
import { canPublish } from '../../lib/access.js';
import { triggerSiteWebhook } from '../webhooks.js';

export const reviewsRouter = express.Router();
const input = z.object({ action: z.enum(['submit', 'approve', 'return']), updatedAt: z.string().datetime(), note: z.string().trim().max(2000).default('') })
  .refine(value => value.action !== 'return' || !!value.note, { message: 'Catatan pengembalian wajib diisi' });
const actions = { submit: 'SUBMIT_REVIEW', approve: 'APPROVE_REVIEW', return: 'RETURN_REVIEW' } as const;
const fail = (res: express.Response, status: number, code: string, message: string) => res.status(status).json({ data: null, error: { code, message } });

reviewsRouter.get('/:kind(pages|posts)/:id/review', async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({ where: { entityType: req.params.kind === 'pages' ? 'Page' : 'Post', entityId: req.params.id, action: { in: Object.values(actions) } }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, action: true, actor: true, createdAt: true, details: true } });
    res.json({ data: logs.map(log => ({ ...log, details: JSON.parse(log.details) })), error: null });
  } catch (error) { next(error); }
});

reviewsRouter.post('/:kind(pages|posts)/:id/review', async (req, res, next) => {
  const parsed = input.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0].message);
  const { action, updatedAt, note } = parsed.data;
  const user = requestUser(req);
  if (action !== 'submit' && !canPublish(user.role)) return fail(res, 403, 'FORBIDDEN', 'Hanya penerbit yang dapat memutuskan review');
  const page = req.params.kind === 'pages';
  try {
    const result = await prisma.$transaction(async tx => {
      const where = { id: req.params.id };
      const record = page ? await tx.page.findUnique({ where }) : await tx.post.findUnique({ where });
      if (!record) return null;
      if (record.status !== (action === 'submit' ? 'DRAFT' : 'IN_REVIEW') || record.updatedAt.toISOString() !== updatedAt) return false;
      const status = action === 'submit' ? 'IN_REVIEW' : action === 'approve' ? 'PUBLISHED' : 'DRAFT';
      const data = { status, ...(action === 'approve' ? { publishedAt: new Date() } : {}) };
      const guarded = { ...where, status: record.status, updatedAt: record.updatedAt };
      const changed = page ? await tx.page.updateMany({ where: guarded, data }) : await tx.post.updateMany({ where: guarded, data });
      if (changed.count !== 1) return false;
      const last = await tx.contentVersion.findFirst({ where: { entityType: page ? 'PAGE' : 'POST', entityId: record.id }, orderBy: { versionNumber: 'desc' } });
      await tx.contentVersion.create({ data: { entityType: page ? 'PAGE' : 'POST', entityId: record.id, versionNumber: (last?.versionNumber || 0) + 1, title: record.title, contentHtml: record.contentHtml, contentJson: record.contentJson, snapshotData: JSON.stringify(record), createdBy: user.email } });
      await tx.auditLog.create({ data: { siteId: record.siteId, actor: user.email, action: actions[action], entityType: page ? 'Page' : 'Post', entityId: record.id, details: JSON.stringify({ note }), ipAddress: req.ip } });
      return page ? tx.page.findUniqueOrThrow({ where }) : tx.post.findUniqueOrThrow({ where });
    });
    if (result === null) return fail(res, 404, 'NOT_FOUND', 'Konten tidak ditemukan');
    if (result === false) return fail(res, 409, 'REVIEW_CONFLICT', 'Status atau isi konten berubah. Muat ulang daftar sebelum melanjutkan.');
    if (action === 'approve') triggerSiteWebhook(result.siteId, page ? 'page.published' : 'post.published', page ? 'Page' : 'Post', result.id, { title: result.title, slug: result.slug });
    return res.json({ data: result, error: null });
  } catch (error) { next(error); }
});
reviewsRouter.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  fail(res, 500, 'INTERNAL_ERROR', 'Gagal memproses review');
});
