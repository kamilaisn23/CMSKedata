import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express, { Request, Response } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import {
  requireAdmin,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  checkLoginAttempts,
  recordFailedLogin,
  clearFailedLogin,
  SESSION_COOKIE_NAME,
} from '../auth.js';
import {
  generateApiKey,
  sanitizeHtmlContent,
  LoginSchema,
  SiteCreateSchema,
  SiteUpdateSchema,
  PageSchema,
  PostSchema,
  CategorySchema,
  TagSchema,
  MenuSchema,
  SiteSettingSchema,
} from '../security.js';
import { triggerSiteWebhook } from '../webhooks.js';

export const adminRouter = express.Router();

// Ensure uploads folder exists
const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for secure media upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const randomHex = crypto.randomBytes(6).toString('hex');
    cb(null, `kd_${sanitizedBase}_${randomHex}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak didukung. Hanya JPG, PNG, WEBP, dan PDF yang diperbolehkan.'));
    }
  },
});

// Helper to record audit logs
async function logAudit(req: Request, siteId: string | null, action: string, entityType: string, entityId: string | null, details: any) {
  try {
    const actor = (req as any).user?.email || 'admin@kedata.id';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await prisma.auditLog.create({
      data: {
        siteId,
        actor,
        action,
        entityType,
        entityId,
        details: JSON.stringify(details),
        ipAddress: ip,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// Helper: Save content version snapshot before updating
async function saveContentVersion(entityType: 'PAGE' | 'POST', entityId: string, currentData: any, authorEmail: string) {
  try {
    const lastVersion = await prisma.contentVersion.findFirst({
      where: { entityType, entityId },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    await prisma.contentVersion.create({
      data: {
        entityType,
        entityId,
        versionNumber: nextVersionNumber,
        title: currentData.title,
        contentHtml: currentData.contentHtml,
        contentJson: currentData.contentJson,
        snapshotData: JSON.stringify(currentData),
        createdBy: authorEmail,
      },
    });
  } catch (err) {
    console.error('Failed to create version snapshot:', err);
  }
}

// ----------------------------------------------------
// AUTH ENDPOINTS (Public / Unprotected)
// ----------------------------------------------------

adminRouter.post('/login', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rateStatus = checkLoginAttempts(ip);

  if (!rateStatus.allowed) {
    res.status(429).json({
      data: null,
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: `Terlalu banyak percobaan gagal. Silakan tunggu ${rateStatus.retryAfterSecs} detik sebelum mencoba lagi.`,
      },
    });
    return;
  }

  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    recordFailedLogin(ip);
    res.status(401).json({
      data: null,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email atau password salah' },
    });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    recordFailedLogin(ip);
    res.status(401).json({
      data: null,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email atau password salah' },
    });
    return;
  }

  clearFailedLogin(ip);
  const token = await createSession(user.id);
  setSessionCookie(res, token);

  await logAudit(req, null, 'LOGIN', 'User', user.id, { email: user.email });

  res.status(200).json({
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    },
    error: null,
  });
});

adminRouter.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) {
    await destroySession(token);
  }
  clearSessionCookie(res);
  res.status(200).json({ data: { success: true }, error: null });
});

// ----------------------------------------------------
// PROTECTED ADMIN ENDPOINTS
// ----------------------------------------------------
adminRouter.use(requireAdmin);

adminRouter.get('/me', (req: Request, res: Response) => {
  res.status(200).json({ data: (req as any).user, error: null });
});

// ---------------- SITES ----------------
adminRouter.get('/sites', async (_req: Request, res: Response) => {
  const sites = await prisma.site.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { pages: true, posts: true, categories: true, tags: true, media: true },
      },
    },
  });
  res.status(200).json({ data: sites, error: null });
});

adminRouter.post('/sites', async (req: Request, res: Response) => {
  const parsed = SiteCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
    return;
  }

  const { name, slug, domain, description, corsOrigins, webhookUrl, webhookSecret, rateLimit } = parsed.data;

  // Check unique slug
  const existing = await prisma.site.findUnique({ where: { slug } });
  if (existing) {
    res.status(400).json({ data: null, error: { code: 'SLUG_EXISTS', message: 'Slug situs sudah digunakan' } });
    return;
  }

  const { rawKey, hash, prefix } = generateApiKey(`kd_${slug.slice(0, 8)}`);

  const site = await prisma.site.create({
    data: {
      name,
      slug,
      domain,
      description,
      corsOrigins: corsOrigins || '*',
      webhookUrl: webhookUrl || null,
      webhookSecret: webhookSecret || null,
      rateLimit: rateLimit || 120,
      apiKeyHash: hash,
      apiKeyPrefix: prefix,
      setting: {
        create: {
          siteTitle: name,
          tagline: description || '',
          footerText: `© ${new Date().getFullYear()} ${name}. All rights reserved.`,
        },
      },
    },
  });

  await logAudit(req, site.id, 'CREATE', 'Site', site.id, { name, slug, domain });

  res.status(201).json({
    data: {
      ...site,
      generatedApiKey: rawKey, // Shown only once upon creation
    },
    error: null,
  });
});

adminRouter.put('/sites/:id', async (req: Request, res: Response) => {
  const parsed = SiteUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
    return;
  }

  const site = await prisma.site.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  await logAudit(req, site.id, 'UPDATE', 'Site', site.id, parsed.data);
  res.status(200).json({ data: site, error: null });
});

adminRouter.post('/sites/:id/regenerate-api-key', async (req: Request, res: Response) => {
  const site = await prisma.site.findUnique({ where: { id: req.params.id } });
  if (!site) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Situs tidak ditemukan' } });
    return;
  }

  const { rawKey, hash, prefix } = generateApiKey(`kd_${site.slug.slice(0, 8)}`);

  const updated = await prisma.site.update({
    where: { id: site.id },
    data: { apiKeyHash: hash, apiKeyPrefix: prefix },
  });

  await logAudit(req, site.id, 'REGENERATE_API_KEY', 'Site', site.id, { prefix });

  res.status(200).json({
    data: {
      ...updated,
      generatedApiKey: rawKey,
    },
    error: null,
  });
});

adminRouter.delete('/sites/:id', async (req: Request, res: Response) => {
  const count = await prisma.site.count();
  if (count <= 1) {
    res.status(400).json({ data: null, error: { code: 'MIN_ONE_SITE', message: 'Tidak dapat menghapus situs terakhir' } });
    return;
  }

  const site = await prisma.site.delete({ where: { id: req.params.id } });
  await logAudit(req, null, 'DELETE', 'Site', site.id, { name: site.name, slug: site.slug });
  res.status(200).json({ data: { success: true }, error: null });
});

// ---------------- PAGES ----------------
adminRouter.get('/pages', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  if (!siteId) {
    res.status(400).json({ data: null, error: { code: 'SITE_REQUIRED', message: 'Parameter siteId wajib diisi' } });
    return;
  }

  const pages = await prisma.page.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ data: pages, error: null });
});

adminRouter.post('/pages', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  if (!siteId) {
    res.status(400).json({ data: null, error: { code: 'SITE_REQUIRED', message: 'Parameter siteId wajib diisi' } });
    return;
  }

  const parsed = PageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
    return;
  }

  const { title, slug, contentHtml, contentJson, status, metaTitle, metaDescription, ogImage } = parsed.data;

  // Check unique slug per site
  const existing = await prisma.page.findUnique({
    where: { siteId_slug: { siteId, slug } },
  });
  if (existing) {
    res.status(400).json({ data: null, error: { code: 'SLUG_EXISTS', message: 'Slug halaman sudah digunakan pada situs ini' } });
    return;
  }

  const sanitizedHtml = sanitizeHtmlContent(contentHtml);

  const page = await prisma.page.create({
    data: {
      siteId,
      title,
      slug,
      contentHtml: sanitizedHtml,
      contentJson,
      status,
      metaTitle,
      metaDescription,
      ogImage,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    },
  });

  await logAudit(req, siteId, 'CREATE', 'Page', page.id, { title, slug, status });
  if (status === 'PUBLISHED') {
    triggerSiteWebhook(siteId, 'page.published', 'Page', page.id, { title, slug });
  }

  res.status(201).json({ data: page, error: null });
});

adminRouter.put('/pages/:id', async (req: Request, res: Response) => {
  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Halaman tidak ditemukan' } });
    return;
  }

  const parsed = PageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
    return;
  }

  // Save version snapshot before update
  const user = (req as any).user;
  await saveContentVersion('PAGE', existing.id, existing, user.email);

  const { title, slug, contentHtml, contentJson, status, metaTitle, metaDescription, ogImage } = parsed.data;
  const sanitizedHtml = sanitizeHtmlContent(contentHtml);

  const updated = await prisma.page.update({
    where: { id: req.params.id },
    data: {
      title,
      slug,
      contentHtml: sanitizedHtml,
      contentJson,
      status,
      metaTitle,
      metaDescription,
      ogImage,
      publishedAt: status === 'PUBLISHED' && !existing.publishedAt ? new Date() : existing.publishedAt,
    },
  });

  await logAudit(req, existing.siteId, 'UPDATE', 'Page', updated.id, { title, slug, status });
  triggerSiteWebhook(existing.siteId, status === 'PUBLISHED' ? 'page.published' : 'page.updated', 'Page', updated.id, { title, slug });

  res.status(200).json({ data: updated, error: null });
});

adminRouter.delete('/pages/:id', async (req: Request, res: Response) => {
  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Halaman tidak ditemukan' } });
    return;
  }

  await prisma.page.delete({ where: { id: req.params.id } });
  await logAudit(req, existing.siteId, 'DELETE', 'Page', existing.id, { title: existing.title, slug: existing.slug });
  triggerSiteWebhook(existing.siteId, 'page.deleted', 'Page', existing.id, { slug: existing.slug });

  res.status(200).json({ data: { success: true }, error: null });
});

// ---------------- POSTS ----------------
adminRouter.get('/posts', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  if (!siteId) {
    res.status(400).json({ data: null, error: { code: 'SITE_REQUIRED', message: 'Parameter siteId wajib diisi' } });
    return;
  }

  const posts = await prisma.post.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });

  res.status(200).json({ data: posts, error: null });
});

adminRouter.post('/posts', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  if (!siteId) {
    res.status(400).json({ data: null, error: { code: 'SITE_REQUIRED', message: 'Parameter siteId wajib diisi' } });
    return;
  }

  const parsed = PostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
    return;
  }

  const { title, slug, excerpt, contentHtml, contentJson, featuredImage, status, categoryId, tagIds, scheduledAt, metaTitle, metaDescription, ogImage } = parsed.data;

  // Check unique slug per site
  const existing = await prisma.post.findUnique({
    where: { siteId_slug: { siteId, slug } },
  });
  if (existing) {
    res.status(400).json({ data: null, error: { code: 'SLUG_EXISTS', message: 'Slug artikel sudah digunakan pada situs ini' } });
    return;
  }

  const sanitizedHtml = sanitizeHtmlContent(contentHtml);

  const post = await prisma.post.create({
    data: {
      siteId,
      title,
      slug,
      excerpt,
      contentHtml: sanitizedHtml,
      contentJson,
      featuredImage,
      status,
      categoryId: categoryId || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      metaTitle,
      metaDescription,
      ogImage,
      tags: {
        create: (tagIds || []).map((tagId) => ({ tagId })),
      },
    },
    include: { category: true, tags: { include: { tag: true } } },
  });

  await logAudit(req, siteId, 'CREATE', 'Post', post.id, { title, slug, status });
  if (status === 'PUBLISHED') {
    triggerSiteWebhook(siteId, 'post.published', 'Post', post.id, { title, slug });
  }

  res.status(201).json({ data: post, error: null });
});

adminRouter.put('/posts/:id', async (req: Request, res: Response) => {
  const existing = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: { tags: true },
  });
  if (!existing) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Artikel tidak ditemukan' } });
    return;
  }

  const parsed = PostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
    return;
  }

  // Save version snapshot
  const user = (req as any).user;
  await saveContentVersion('POST', existing.id, existing, user.email);

  const { title, slug, excerpt, contentHtml, contentJson, featuredImage, status, categoryId, tagIds, scheduledAt, metaTitle, metaDescription, ogImage } = parsed.data;
  const sanitizedHtml = sanitizeHtmlContent(contentHtml);

  // Clear existing tags and link new
  await prisma.postTag.deleteMany({ where: { postId: existing.id } });

  const updated = await prisma.post.update({
    where: { id: req.params.id },
    data: {
      title,
      slug,
      excerpt,
      contentHtml: sanitizedHtml,
      contentJson,
      featuredImage,
      status,
      categoryId: categoryId || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      publishedAt: status === 'PUBLISHED' && !existing.publishedAt ? new Date() : existing.publishedAt,
      metaTitle,
      metaDescription,
      ogImage,
      tags: {
        create: (tagIds || []).map((tagId) => ({ tagId })),
      },
    },
    include: { category: true, tags: { include: { tag: true } } },
  });

  await logAudit(req, existing.siteId, 'UPDATE', 'Post', updated.id, { title, slug, status });
  triggerSiteWebhook(existing.siteId, status === 'PUBLISHED' ? 'post.published' : 'post.updated', 'Post', updated.id, { title, slug });

  res.status(200).json({ data: updated, error: null });
});

adminRouter.delete('/posts/:id', async (req: Request, res: Response) => {
  const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Artikel tidak ditemukan' } });
    return;
  }

  await prisma.post.delete({ where: { id: req.params.id } });
  await logAudit(req, existing.siteId, 'DELETE', 'Post', existing.id, { title: existing.title, slug: existing.slug });
  triggerSiteWebhook(existing.siteId, 'post.deleted', 'Post', existing.id, { slug: existing.slug });

  res.status(200).json({ data: { success: true }, error: null });
});

// ---------------- VERSION HISTORY & ROLLBACK ----------------
adminRouter.get('/versions/:entityType/:entityId', async (req: Request, res: Response) => {
  const { entityType, entityId } = req.params;
  const versions = await prisma.contentVersion.findMany({
    where: { entityType: entityType.toUpperCase(), entityId },
    orderBy: { versionNumber: 'desc' },
  });
  res.status(200).json({ data: versions, error: null });
});

adminRouter.post('/versions/:id/restore', async (req: Request, res: Response) => {
  const version = await prisma.contentVersion.findUnique({ where: { id: req.params.id } });
  if (!version) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Versi tidak ditemukan' } });
    return;
  }

  const snapshot = JSON.parse(version.snapshotData);
  const user = (req as any).user;

  if (version.entityType === 'PAGE') {
    const page = await prisma.page.findUnique({ where: { id: version.entityId } });
    if (page) {
      await saveContentVersion('PAGE', page.id, page, user.email);
      const restored = await prisma.page.update({
        where: { id: page.id },
        data: {
          title: snapshot.title,
          contentHtml: snapshot.contentHtml,
          contentJson: snapshot.contentJson,
          metaTitle: snapshot.metaTitle,
          metaDescription: snapshot.metaDescription,
        },
      });
      await logAudit(req, page.siteId, 'RESTORE_VERSION', 'Page', page.id, { restoredVersion: version.versionNumber });
      res.status(200).json({ data: restored, error: null });
      return;
    }
  } else if (version.entityType === 'POST') {
    const post = await prisma.post.findUnique({ where: { id: version.entityId } });
    if (post) {
      await saveContentVersion('POST', post.id, post, user.email);
      const restored = await prisma.post.update({
        where: { id: post.id },
        data: {
          title: snapshot.title,
          excerpt: snapshot.excerpt,
          contentHtml: snapshot.contentHtml,
          contentJson: snapshot.contentJson,
          featuredImage: snapshot.featuredImage,
          metaTitle: snapshot.metaTitle,
          metaDescription: snapshot.metaDescription,
        },
      });
      await logAudit(req, post.siteId, 'RESTORE_VERSION', 'Post', post.id, { restoredVersion: version.versionNumber });
      res.status(200).json({ data: restored, error: null });
      return;
    }
  }

  res.status(400).json({ data: null, error: { code: 'CANNOT_RESTORE', message: 'Gagal memulihkan versi data' } });
});

// ---------------- CATEGORIES & TAGS ----------------
adminRouter.get('/categories', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  if (!siteId) return res.status(400).json({ data: null, error: { code: 'SITE_REQUIRED' } });
  const categories = await prisma.category.findMany({
    where: { siteId },
    include: { _count: { select: { posts: true } } },
    orderBy: { name: 'asc' },
  });
  res.status(200).json({ data: categories, error: null });
});

adminRouter.post('/categories', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  const parsed = CategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
  }

  const category = await prisma.category.create({
    data: { siteId, ...parsed.data },
  });
  await logAudit(req, siteId, 'CREATE', 'Category', category.id, parsed.data);
  res.status(201).json({ data: category, error: null });
});

adminRouter.delete('/categories/:id', async (req: Request, res: Response) => {
  const cat = await prisma.category.delete({ where: { id: req.params.id } });
  await logAudit(req, cat.siteId, 'DELETE', 'Category', cat.id, { name: cat.name });
  res.status(200).json({ data: { success: true }, error: null });
});

adminRouter.get('/tags', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  if (!siteId) return res.status(400).json({ data: null, error: { code: 'SITE_REQUIRED' } });
  const tags = await prisma.tag.findMany({
    where: { siteId },
    include: { _count: { select: { posts: true } } },
    orderBy: { name: 'asc' },
  });
  res.status(200).json({ data: tags, error: null });
});

adminRouter.post('/tags', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  const parsed = TagSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
  }

  const tag = await prisma.tag.create({
    data: { siteId, ...parsed.data },
  });
  await logAudit(req, siteId, 'CREATE', 'Tag', tag.id, parsed.data);
  res.status(201).json({ data: tag, error: null });
});

adminRouter.delete('/tags/:id', async (req: Request, res: Response) => {
  const tag = await prisma.tag.delete({ where: { id: req.params.id } });
  await logAudit(req, tag.siteId, 'DELETE', 'Tag', tag.id, { name: tag.name });
  res.status(200).json({ data: { success: true }, error: null });
});

// ---------------- MEDIA LIBRARY ----------------
adminRouter.get('/media', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string | undefined;
  const where: any = {};
  if (siteId) {
    where.OR = [{ siteId }, { siteId: null }];
  }

  const media = await prisma.media.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ data: media, error: null });
});

adminRouter.post('/media/upload', upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ data: null, error: { code: 'NO_FILE', message: 'Tidak ada file yang diunggah' } });
    return;
  }

  const siteId = (req.body.siteId as string) || null;
  const altText = (req.body.altText as string) || '';
  const caption = (req.body.caption as string) || '';

  const media = await prisma.media.create({
    data: {
      siteId,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: `/uploads/${file.filename}`,
      altText,
      caption,
    },
  });

  await logAudit(req, siteId, 'UPLOAD', 'Media', media.id, { filename: file.filename, size: file.size });

  res.status(201).json({ data: media, error: null });
});

adminRouter.put('/media/:id', async (req: Request, res: Response) => {
  const { altText, caption } = req.body;
  const updated = await prisma.media.update({
    where: { id: req.params.id },
    data: { altText, caption },
  });
  res.status(200).json({ data: updated, error: null });
});

adminRouter.delete('/media/:id', async (req: Request, res: Response) => {
  const media = await prisma.media.findUnique({ where: { id: req.params.id } });
  if (!media) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Media tidak ditemukan' } });
    return;
  }

  // Delete physical file if exists
  const filePath = path.join(UPLOADS_DIR, media.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }

  await prisma.media.delete({ where: { id: media.id } });
  await logAudit(req, media.siteId, 'DELETE', 'Media', media.id, { filename: media.filename });

  res.status(200).json({ data: { success: true }, error: null });
});

// ---------------- MENUS ----------------
adminRouter.get('/menus', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  if (!siteId) return res.status(400).json({ data: null, error: { code: 'SITE_REQUIRED' } });

  const menus = await prisma.menu.findMany({
    where: { siteId },
    orderBy: { createdAt: 'asc' },
  });

  res.status(200).json({ data: menus, error: null });
});

adminRouter.post('/menus', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  const parsed = MenuSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
  }

  const menu = await prisma.menu.create({
    data: { siteId, ...parsed.data },
  });

  await logAudit(req, siteId, 'CREATE', 'Menu', menu.id, parsed.data);
  res.status(201).json({ data: menu, error: null });
});

adminRouter.put('/menus/:id', async (req: Request, res: Response) => {
  const parsed = MenuSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
  }

  const menu = await prisma.menu.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  await logAudit(req, menu.siteId, 'UPDATE', 'Menu', menu.id, parsed.data);
  res.status(200).json({ data: menu, error: null });
});

// ---------------- SETTINGS ----------------
adminRouter.get('/settings', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  if (!siteId) return res.status(400).json({ data: null, error: { code: 'SITE_REQUIRED' } });

  const setting = await prisma.siteSetting.findUnique({ where: { siteId } });
  res.status(200).json({ data: setting, error: null });
});

adminRouter.put('/settings', async (req: Request, res: Response) => {
  const siteId = req.query.siteId as string;
  if (!siteId) return res.status(400).json({ data: null, error: { code: 'SITE_REQUIRED' } });

  const parsed = SiteSettingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
  }

  const setting = await prisma.siteSetting.upsert({
    where: { siteId },
    update: parsed.data,
    create: { siteId, ...parsed.data },
  });

  await logAudit(req, siteId, 'UPDATE', 'Setting', setting.id, parsed.data);
  res.status(200).json({ data: setting, error: null });
});

// ---------------- AUDIT LOGS ----------------
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt((req.query.perPage as string) || '25', 10)));
  const siteId = req.query.siteId as string | undefined;
  const action = req.query.action as string | undefined;

  const where: any = {};
  if (siteId) where.siteId = siteId;
  if (action) where.action = action;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.status(200).json({
    data: logs,
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    error: null,
  });
});

// ---------------- CRON SCHEDULED PUBLISHER ----------------
adminRouter.post('/cron/publish', async (_req: Request, res: Response) => {
  const now = new Date();
  const scheduledPosts = await prisma.post.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
  });

  const updatedIds: string[] = [];
  for (const post of scheduledPosts) {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', publishedAt: now },
    });
    updatedIds.push(post.id);
    triggerSiteWebhook(post.siteId, 'post.published', 'Post', post.id, { title: post.title, slug: post.slug });
  }

  res.status(200).json({
    data: { publishedCount: updatedIds.length, postIds: updatedIds },
    error: null,
  });
});
