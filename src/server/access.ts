import type { Request, Response, NextFunction } from 'express';
import { prisma } from './db.js';
import type { AuthenticatedUser } from './auth.js';
import { canAccessSite, canEditContent, canManageSite, canPublish, isKnownRole } from '../lib/access.js';

export const requestUser = (req: Request) => (req as Request & { user: AuthenticatedUser }).user;
const reject = (res: Response, status = 403, code = 'FORBIDDEN') => {
  res.status(status).json({ data: null, error: { code, message: status === 404 ? 'Data tidak ditemukan' : 'Anda tidak memiliki akses untuk tindakan atau situs ini' } });
};

// Default deny: new routes must explicitly be classified here.
export async function authorizeAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requestUser(req);
    if (!isKnownRole(user.role)) return reject(res);
    const [resource, rawId, rawAction] = req.path.split('/').slice(1);
    const id = rawId ? decodeURIComponent(rawId) : undefined;
    const action = rawAction ? decodeURIComponent(rawAction) : undefined;
    const read = req.method === 'GET' || req.method === 'HEAD';
    if (resource === 'me' || (resource === 'sites' && !id && read)) return next();
    if (resource === 'calendar' && !id && read) return next(); // Calendar scopes all queries to memberships internally.
    if (['users', 'sites', 'cron', 'backups'].includes(resource)) {
      return user.role === 'ADMIN' ? next() : reject(res);
    }
    if (!['pages', 'posts', 'categories', 'tags', 'media', 'menus', 'settings', 'audit-logs', 'versions'].includes(resource)) return reject(res);
    if (['menus', 'settings', 'audit-logs'].includes(resource) && !canManageSite(user.role)) return reject(res);

    let entity: { siteId: string | null; status?: string } | null = null;
    if (resource === 'versions') {
      if (read && action) {
        entity = id?.toUpperCase() === 'PAGE' ? await prisma.page.findUnique({ where: { id: action } })
          : id?.toUpperCase() === 'POST' ? await prisma.post.findUnique({ where: { id: action } }) : null;
      } else if (id && action === 'restore' && req.method === 'POST') {
        const version = await prisma.contentVersion.findUnique({ where: { id } });
        entity = version?.entityType === 'PAGE' ? await prisma.page.findUnique({ where: { id: version.entityId } })
          : version?.entityType === 'POST' ? await prisma.post.findUnique({ where: { id: version.entityId } }) : null;
      }
      if (!entity) return reject(res, 404, 'NOT_FOUND');
    } else if (id && !(resource === 'media' && id === 'upload')) {
      const where = { id };
      switch (resource) {
        case 'pages': entity = await prisma.page.findUnique({ where }); break;
        case 'posts': entity = await prisma.post.findUnique({ where }); break;
        case 'categories': entity = await prisma.category.findUnique({ where }); break;
        case 'tags': entity = await prisma.tag.findUnique({ where }); break;
        case 'media': entity = await prisma.media.findUnique({ where }); break;
        case 'menus': entity = await prisma.menu.findUnique({ where }); break;
      }
      if (!entity) return reject(res, 404, 'NOT_FOUND');
    }
    const siteId = entity ? entity.siteId : typeof req.query.siteId === 'string' ? req.query.siteId : null;
    if (user.role !== 'ADMIN' && (!siteId || !canAccessSite(user, siteId))) return reject(res);
    // Global media and unfiltered admin lists remain available only to ADMIN.
    if (siteId && !await prisma.site.findUnique({ where: { id: siteId }, select: { id: true } })) return reject(res, 404, 'NOT_FOUND');
    if (!read && ['pages', 'posts', 'versions'].includes(resource)) {
      if (action === 'review' && resource !== 'versions' && req.method === 'POST') {
        if (req.body?.action !== 'submit' && !canPublish(user.role)) return reject(res);
      } else {
        if (!canEditContent(user.role, entity?.status || 'DRAFT')) return reject(res);
        if (!canPublish(user.role) && req.body?.status && req.body.status !== 'DRAFT') return reject(res);
      }
    }
    // A permitted post must never attach taxonomy belonging to another site.
    if (!read && resource === 'posts') {
      const categoryId = req.body?.categoryId;
      const tagIds = req.body?.tagIds;
      if (typeof categoryId === 'string' && categoryId && !await prisma.category.findFirst({ where: { id: categoryId, siteId: siteId! } })) return reject(res);
      if (Array.isArray(tagIds) && tagIds.every(tag => typeof tag === 'string')) {
        const uniqueIds = [...new Set<string>(tagIds)];
        if (await prisma.tag.count({ where: { id: { in: uniqueIds }, siteId: siteId! } }) !== uniqueIds.length) return reject(res);
      }
    }
    next();
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Gagal memeriksa hak akses' } });
  }
}
