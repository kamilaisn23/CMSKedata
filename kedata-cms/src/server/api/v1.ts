import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';
import { hashApiKey, checkRateLimit } from '../security.js';

export const v1Router = express.Router();

// Auto-publish scheduled posts where scheduledAt <= now
async function checkAndPublishScheduledPosts(siteId: string) {
  const now = new Date();
  await prisma.post.updateMany({
    where: {
      siteId,
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
    data: {
      status: 'PUBLISHED',
      publishedAt: now,
    },
  });
}

// Helper: Calculate ETag and apply Cache-Control
function sendCachedResponse(res: Response, req: Request, data: any, meta?: any) {
  const body = {
    data,
    meta: meta || null,
    error: null,
  };
  const bodyString = JSON.stringify(body);
  const etag = crypto.createHash('md5').update(bodyString).digest('hex');

  res.setHeader('ETag', `"${etag}"`);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

  if (req.headers['if-none-match'] === `"${etag}"`) {
    res.status(304).end();
    return;
  }

  res.status(200).json(body);
}

// Field selection helper
function pickFields<T extends Record<string, any>>(obj: T, fields?: string[]): Partial<T> {
  if (!fields || fields.length === 0) return obj;
  const picked: any = {};
  for (const f of fields) {
    if (f in obj) {
      picked[f] = obj[f];
    }
  }
  return picked;
}

// Site API Key Authentication & CORS Middleware
v1Router.use(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawApiKey = (req.headers['x-api-key'] || req.query.apiKey) as string | undefined;

    if (!rawApiKey) {
      res.status(401).json({
        data: null,
        meta: null,
        error: { code: 'UNAUTHORIZED', message: 'Header x-api-key atau parameter apiKey diperlukan' },
      });
      return;
    }

    const keyHash = hashApiKey(rawApiKey);
    let site = await prisma.site.findUnique({
      where: { apiKeyHash: keyHash },
    });

    // If not found by full hash, check if in-dashboard admin session is testing with prefix
    if (!site && req.cookies?.['kd_cms_session']) {
      site = await prisma.site.findFirst({
        where: {
          OR: [
            { apiKeyPrefix: rawApiKey },
            { slug: rawApiKey },
          ],
        },
      });
    }

    if (!site) {
      res.status(401).json({
        data: null,
        meta: null,
        error: { code: 'INVALID_API_KEY', message: 'API key tidak valid' },
      });
      return;
    }

    // CORS Handling per Site
    const origin = req.headers.origin;
    if (origin) {
      const allowedOrigins = site.corsOrigins.split(',').map((o) => o.trim());
      const isAllowed =
        site.corsOrigins === '*' ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.some((ao) => ao.includes('*') && new RegExp('^' + ao.replace(/\*/g, '.*') + '$').test(origin));

      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, if-none-match');
      }
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    // Rate Limiting per Site API Key
    const rateCheck = checkRateLimit(`site:${site.id}`, site.rateLimit || 120);
    res.setHeader('X-RateLimit-Limit', (site.rateLimit || 120).toString());
    res.setHeader('X-RateLimit-Remaining', rateCheck.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateCheck.resetSecs.toString());

    if (!rateCheck.allowed) {
      res.status(429).json({
        data: null,
        meta: null,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Batas kuota panggilan API terlampaui. Coba lagi dalam beberapa saat.' },
      });
      return;
    }

    // Attach site to request
    (req as any).site = site;

    // Check for auto-publishing scheduled posts
    await checkAndPublishScheduledPosts(site.id);

    next();
  } catch (err: any) {
    res.status(500).json({
      data: null,
      meta: null,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// 1. GET /api/v1/pages
v1Router.get('/pages', async (req: Request, res: Response) => {
  const site = (req as any).site;
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt((req.query.perPage as string) || '20', 10)));
  const fields = (req.query.fields as string)?.split(',').map((f) => f.trim()).filter(Boolean);

  const where = {
    siteId: site.id,
    status: 'PUBLISHED',
  };

  const [total, pages] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const formatted = pages.map((p) => {
    let parsedJson = null;
    try {
      parsedJson = JSON.parse(p.contentJson);
    } catch {
      parsedJson = {};
    }

    const item = {
      id: p.id,
      title: p.title,
      slug: p.slug,
      contentHtml: p.contentHtml,
      contentJson: parsedJson,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      ogImage: p.ogImage,
      publishedAt: p.publishedAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };

    return pickFields(item, fields);
  });

  sendCachedResponse(res, req, formatted, {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
});

// 2. GET /api/v1/pages/:slug
v1Router.get('/pages/:slug', async (req: Request, res: Response) => {
  const site = (req as any).site;
  const slug = req.params.slug;
  const previewToken = req.query.preview as string | undefined;

  const where: any = {
    siteId_slug: { siteId: site.id, slug },
  };

  const page = await prisma.page.findUnique({
    where,
  });

  if (!page) {
    res.status(404).json({
      data: null,
      meta: null,
      error: { code: 'PAGE_NOT_FOUND', message: `Halaman dengan slug '${slug}' tidak ditemukan` },
    });
    return;
  }

  // If not published, require preview token
  if (page.status !== 'PUBLISHED' && (!previewToken || previewToken !== `kd_preview_${site.id}`)) {
    res.status(404).json({
      data: null,
      meta: null,
      error: { code: 'PAGE_NOT_PUBLISHED', message: 'Halaman belum dipublikasikan' },
    });
    return;
  }

  let parsedJson = null;
  try {
    parsedJson = JSON.parse(page.contentJson);
  } catch {
    parsedJson = {};
  }

  const fields = (req.query.fields as string)?.split(',').map((f) => f.trim()).filter(Boolean);
  const data = pickFields(
    {
      id: page.id,
      title: page.title,
      slug: page.slug,
      status: page.status,
      contentHtml: page.contentHtml,
      contentJson: parsedJson,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      ogImage: page.ogImage,
      publishedAt: page.publishedAt?.toISOString() || null,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    },
    fields
  );

  sendCachedResponse(res, req, data);
});

// 3. GET /api/v1/posts (with category, tag, search, order, pagination, includes)
v1Router.get('/posts', async (req: Request, res: Response) => {
  const site = (req as any).site;
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt((req.query.perPage as string) || '10', 10)));
  const search = (req.query.search as string)?.trim();
  const categorySlug = (req.query.category as string)?.trim();
  const tagSlug = (req.query.tag as string)?.trim();
  const sort = (req.query.sort as string) || 'publishedAt';
  const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
  const fields = (req.query.fields as string)?.split(',').map((f) => f.trim()).filter(Boolean);
  const include = (req.query.include as string)?.split(',').map((i) => i.trim()).filter(Boolean) || [];

  const where: any = {
    siteId: site.id,
    status: 'PUBLISHED',
  };

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { excerpt: { contains: search } },
    ];
  }

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (tagSlug) {
    where.tags = {
      some: {
        tag: { slug: tagSlug },
      },
    };
  }

  const orderBy: any = {};
  if (['publishedAt', 'createdAt', 'title'].includes(sort)) {
    orderBy[sort] = order;
  } else {
    orderBy.publishedAt = 'desc';
  }

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy,
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
      },
    }),
  ]);

  const formatted = posts.map((p) => {
    let parsedJson = null;
    try {
      parsedJson = JSON.parse(p.contentJson);
    } catch {
      parsedJson = {};
    }

    const item: any = {
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      contentHtml: p.contentHtml,
      contentJson: parsedJson,
      featuredImage: p.featuredImage,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      ogImage: p.ogImage,
      publishedAt: p.publishedAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };

    if (include.includes('category') || !fields || fields.includes('category')) {
      item.category = p.category
        ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
        : null;
    }

    if (include.includes('tags') || !fields || fields.includes('tags')) {
      item.tags = p.tags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name, slug: pt.tag.slug }));
    }

    return pickFields(item, fields);
  });

  sendCachedResponse(res, req, formatted, {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
});

// 4. GET /api/v1/posts/:slug
v1Router.get('/posts/:slug', async (req: Request, res: Response) => {
  const site = (req as any).site;
  const slug = req.params.slug;
  const previewToken = req.query.preview as string | undefined;

  const post = await prisma.post.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });

  if (!post) {
    res.status(404).json({
      data: null,
      meta: null,
      error: { code: 'POST_NOT_FOUND', message: `Post dengan slug '${slug}' tidak ditemukan` },
    });
    return;
  }

  if (post.status !== 'PUBLISHED' && (!previewToken || previewToken !== `kd_preview_${site.id}`)) {
    res.status(404).json({
      data: null,
      meta: null,
      error: { code: 'POST_NOT_PUBLISHED', message: 'Artikel ini belum dipublikasikan' },
    });
    return;
  }

  let parsedJson = null;
  try {
    parsedJson = JSON.parse(post.contentJson);
  } catch {
    parsedJson = {};
  }

  const fields = (req.query.fields as string)?.split(',').map((f) => f.trim()).filter(Boolean);
  const data = pickFields(
    {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      status: post.status,
      contentHtml: post.contentHtml,
      contentJson: parsedJson,
      featuredImage: post.featuredImage,
      category: post.category
        ? { id: post.category.id, name: post.category.name, slug: post.category.slug }
        : null,
      tags: post.tags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name, slug: pt.tag.slug })),
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      ogImage: post.ogImage,
      publishedAt: post.publishedAt?.toISOString() || null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    },
    fields
  );

  sendCachedResponse(res, req, data);
});

// 5. GET /api/v1/categories
v1Router.get('/categories', async (req: Request, res: Response) => {
  const site = (req as any).site;
  const categories = await prisma.category.findMany({
    where: { siteId: site.id },
    include: {
      _count: {
        select: { posts: { where: { status: 'PUBLISHED' } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const formatted = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    postCount: c._count.posts,
    createdAt: c.createdAt.toISOString(),
  }));

  sendCachedResponse(res, req, formatted, { total: formatted.length });
});

// 6. GET /api/v1/tags
v1Router.get('/tags', async (req: Request, res: Response) => {
  const site = (req as any).site;
  const tags = await prisma.tag.findMany({
    where: { siteId: site.id },
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const formatted = tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    postCount: t._count.posts,
    createdAt: t.createdAt.toISOString(),
  }));

  sendCachedResponse(res, req, formatted, { total: formatted.length });
});

// 7. GET /api/v1/menus
v1Router.get('/menus', async (req: Request, res: Response) => {
  const site = (req as any).site;
  const location = req.query.location as string | undefined;

  const where: any = { siteId: site.id };
  if (location) {
    where.location = location.toUpperCase();
  }

  const menus = await prisma.menu.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  const formatted = menus.map((m) => {
    let items = [];
    try {
      items = JSON.parse(m.itemsJson);
    } catch {
      items = [];
    }
    return {
      id: m.id,
      name: m.name,
      location: m.location,
      items,
      updatedAt: m.updatedAt.toISOString(),
    };
  });

  sendCachedResponse(res, req, formatted, { total: formatted.length });
});

// 8. GET /api/v1/settings
v1Router.get('/settings', async (req: Request, res: Response) => {
  const site = (req as any).site;
  const setting = await prisma.siteSetting.findUnique({
    where: { siteId: site.id },
  });

  if (!setting) {
    sendCachedResponse(res, req, {
      siteId: site.id,
      siteTitle: site.name,
      tagline: site.description,
      logoUrl: null,
      faviconUrl: null,
      contactEmail: null,
      contactPhone: null,
      socialLinks: {},
      footerText: null,
      customMetadata: {},
    });
    return;
  }

  let socialLinks = {};
  let customMetadata = {};
  try {
    socialLinks = JSON.parse(setting.socialLinks);
  } catch {}
  try {
    customMetadata = JSON.parse(setting.customMetadata);
  } catch {}

  const formatted = {
    siteId: site.id,
    siteTitle: setting.siteTitle,
    tagline: setting.tagline,
    logoUrl: setting.logoUrl,
    faviconUrl: setting.faviconUrl,
    contactEmail: setting.contactEmail,
    contactPhone: setting.contactPhone,
    socialLinks,
    footerText: setting.footerText,
    customMetadata,
    updatedAt: setting.updatedAt.toISOString(),
  };

  sendCachedResponse(res, req, formatted);
});

// 9. GET /api/v1/media/:id
v1Router.get('/media/:id', async (req: Request, res: Response) => {
  const site = (req as any).site;
  const id = req.params.id;

  const media = await prisma.media.findFirst({
    where: {
      id,
      OR: [{ siteId: site.id }, { siteId: null }],
    },
  });

  if (!media) {
    res.status(404).json({
      data: null,
      meta: null,
      error: { code: 'MEDIA_NOT_FOUND', message: 'Media tidak ditemukan' },
    });
    return;
  }

  const formatted = {
    id: media.id,
    filename: media.filename,
    originalName: media.originalName,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    url: media.url,
    altText: media.altText,
    caption: media.caption,
    createdAt: media.createdAt.toISOString(),
  };

  sendCachedResponse(res, req, formatted);
});
