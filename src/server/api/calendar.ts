import express from 'express';
import { prisma } from '../db.js';
import { requestUser } from '../access.js';
import { canAccessSite } from '../../lib/access.js';
import { calendarBounds } from '../../lib/calendar.js';

export const calendarRouter = express.Router();
calendarRouter.get('/calendar', async (req, res, next) => {
  let bounds;
  try { if (typeof req.query.month !== 'string') throw new Error(); bounds = calendarBounds(req.query.month); }
  catch { return res.status(400).json({ data: null, error: { code: 'INVALID_MONTH', message: 'Bulan harus berformat YYYY-MM (1900–9998)' } }); }
  if (req.query.siteId !== undefined && (typeof req.query.siteId !== 'string' || !req.query.siteId)) return res.status(400).json({ data: null, error: { code: 'INVALID_SITE', message: 'Situs tidak valid' } });
  const user = requestUser(req);
  const siteId = req.query.siteId as string | undefined;
  if (siteId && !canAccessSite(user, siteId)) return res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'Situs tidak diizinkan' } });
  const scope = { siteId: siteId || (user.role === 'ADMIN' ? undefined : { in: user.siteIds }) };
  const range = { gte: bounds.start, lt: bounds.end };
  const common = { id: true, title: true, siteId: true, status: true, updatedAt: true, site: { select: { name: true } } } as const;
  try {
    const [posts, pages, postQueue, pageQueue, postCounts, pageCounts] = await Promise.all([
      prisma.post.findMany({ where: { ...scope, OR: [{ status: 'SCHEDULED', scheduledAt: range }, { status: 'PUBLISHED', publishedAt: range }] }, select: { ...common, scheduledAt: true, publishedAt: true } }),
      prisma.page.findMany({ where: { ...scope, status: 'PUBLISHED', publishedAt: range }, select: { ...common, publishedAt: true } }),
      prisma.post.findMany({ where: { ...scope, status: { in: ['DRAFT', 'IN_REVIEW'] } }, select: common, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: 12 }),
      prisma.page.findMany({ where: { ...scope, status: { in: ['DRAFT', 'IN_REVIEW'] } }, select: common, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: 12 }),
      prisma.post.groupBy({ by: ['status'], where: { ...scope, status: { in: ['DRAFT', 'IN_REVIEW'] } }, _count: { _all: true } }),
      prisma.page.groupBy({ by: ['status'], where: { ...scope, status: { in: ['DRAFT', 'IN_REVIEW'] } }, _count: { _all: true } }),
    ]);
    const entry = (record: typeof postQueue[number], kind: 'PAGE' | 'POST', at: Date | null) => {
      const { site, ...fields } = record; return { ...fields, kind, siteName: site.name, at };
    };
    const events = [...posts.map(post => entry(post, 'POST', post.status === 'SCHEDULED' ? post.scheduledAt : post.publishedAt)), ...pages.map(page => entry(page, 'PAGE', page.publishedAt))].sort((a, b) => a.at!.getTime() - b.at!.getTime() || a.id.localeCompare(b.id));
    const queue = [...postQueue.map(post => entry(post, 'POST', null)), ...pageQueue.map(page => entry(page, 'PAGE', null))].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || a.id.localeCompare(b.id)).slice(0, 12);
    const count = (status: string) => [...postCounts, ...pageCounts].filter(row => row.status === status).reduce((total, row) => total + row._count._all, 0);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ data: { events, queue, counts: { scheduled: events.filter(event => event.status === 'SCHEDULED').length, published: events.filter(event => event.status === 'PUBLISHED').length, draft: count('DRAFT'), review: count('IN_REVIEW') } }, error: null });
  } catch (error) { next(error); }
});
calendarRouter.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Gagal memuat kalender' } });
});
