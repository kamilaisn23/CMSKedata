import express, { type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requestUser } from '../access.js';
import { ROLES } from '../../lib/access.js';

export const usersRouter = express.Router();
const UserInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(ROLES),
  siteIds: z.array(z.string().min(1)).max(500).default([]),
  password: z.string().max(72).optional(),
});
const select = { id: true, name: true, email: true, role: true, memberships: { select: { siteId: true } } } as const;
const publicUser = (user: { id: string; name: string; email: string; role: string; memberships: { siteId: string }[] }) => {
  const { memberships, ...fields } = user;
  return { ...fields, siteIds: memberships.map(item => item.siteId) };
};

usersRouter.get('/', async (_req, res, next) => {
  try { res.json({ data: (await prisma.user.findMany({ select, orderBy: { name: 'asc' } })).map(publicUser), error: null }); }
  catch (error) { next(error); }
});

async function saveUser(req: Request, res: Response) {
  const parsed = UserInput.safeParse(req.body);
  const id = req.params.id;
  if (!parsed.success) return res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Periksa nama, email, peran, dan situs' } });
  const { password, siteIds: requestedIds, ...fields } = parsed.data;
  if ((!id || password) && (!password || password.length < 12 || Buffer.byteLength(password) > 72)) return res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Password minimal 12 karakter dan maksimal 72 byte' } });
  if (id === requestUser(req).id && fields.role !== 'ADMIN') return res.status(400).json({ data: null, error: { code: 'SELF_ROLE_CHANGE', message: 'Admin tidak dapat menurunkan perannya sendiri' } });
  const siteIds = [...new Set(requestedIds)];
  if (await prisma.site.count({ where: { id: { in: siteIds } } }) !== siteIds.length) return res.status(400).json({ data: null, error: { code: 'INVALID_SITE', message: 'Situs tidak ditemukan' } });
  if (id && !await prisma.user.findUnique({ where: { id }, select: { id: true } })) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Akun tidak ditemukan' } });
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  try {
    const user = await prisma.$transaction(async tx => {
      const memberships = siteIds.map(siteId => ({ siteId }));
      const saved = id ? await tx.user.update({ where: { id }, data: { ...fields, passwordHash, memberships: { deleteMany: {}, create: memberships } }, select })
        : await tx.user.create({ data: { ...fields, passwordHash: passwordHash!, memberships: { create: memberships } }, select });
      if (id) await tx.session.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({ data: { actor: requestUser(req).email, action: id ? 'UPDATE_ACCESS' : 'CREATE_USER', entityType: 'User', entityId: saved.id, details: JSON.stringify({ role: fields.role, siteIds }), ipAddress: req.ip } });
      return saved;
    });
    return res.status(id ? 200 : 201).json({ data: publicUser(user), error: null });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') return res.status(409).json({ data: null, error: { code: 'EMAIL_EXISTS', message: 'Email sudah digunakan' } });
    throw error;
  }
}
for (const method of ['post', 'put'] as const) {
  usersRouter[method](method === 'post' ? '/' : '/:id', (req, res, next) => { saveUser(req, res).catch(next); });
}
usersRouter.use((_error: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
  res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Gagal menyimpan atau memuat akun' } });
});
