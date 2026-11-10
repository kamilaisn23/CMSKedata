import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from './db.js';
import { v1Router } from './api/v1.js';
import { adminRouter } from './api/admin.js';
import { feedsRouter } from './feeds.js';

// Express app for the Vercel serverless variant (api/[[...path]].ts).
// Static files (dist/, public/) and docs are served by Vercel directly,
// so this app only carries the API routes. All frontend fetches use
// same-origin /api/... paths, so session cookies work without CORS setup.
export const vercelApp = express();

vercelApp.use(express.json({ limit: '10mb' }));
vercelApp.use(express.urlencoded({ extended: true, limit: '10mb' }));
vercelApp.use(cookieParser());

vercelApp.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), backend: 'vercel-serverless' });
});

// Feeds first so rss.xml / sitemap.xml / robots.txt work without an API key,
// at both /api/v1/... (contract path) and /api/... (rewrite target).
vercelApp.use('/api/v1', feedsRouter);
vercelApp.use('/api', feedsRouter);
vercelApp.use('/api/v1', v1Router);
vercelApp.use('/api/admin', adminRouter);

// Vercel Cron target (vercel.json crons.path). Vercel sends GET with an
// Authorization: Bearer <CRON_SECRET> header when CRON_SECRET is set.
vercelApp.all('/api/cron/publish', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ data: null, meta: null, error: { code: 'UNAUTHORIZED', message: 'Cron secret tidak cocok' } });
    return;
  }
  const result = await prisma.post.updateMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
  res.json({ data: { published: result.count }, meta: null, error: null });
});

vercelApp.use((_req, res) => {
  res.status(404).json({ data: null, meta: null, error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' } });
});
