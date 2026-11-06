import fs from 'fs';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Static uploads directory
  const uploadsDir = path.resolve(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Static files in public (cms-embed.js, icons, etc.)
  const publicDir = path.resolve(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // Import backend routers dynamically
  const { v1Router } = await import('./src/server/api/v1.js');
  const { adminRouter } = await import('./src/server/api/admin.js');
  const { feedsRouter } = await import('./src/server/feeds.js');
  const { openapiRouter } = await import('./src/server/openapi.js');

  // API Routes
  app.use('/api/v1', v1Router);
  app.use('/api/admin', adminRouter);
  app.use('/', feedsRouter);
  app.use('/', openapiRouter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Frontend Serving (Vite in Dev, Dist in Prod)
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Kedata CMS Server running on http://0.0.0.0:${PORT}`);
    console.log(`📚 Interactive OpenAPI Docs: http://localhost:${PORT}/docs`);
    console.log(`📡 Public REST API:         http://localhost:${PORT}/api/v1`);
    console.log(`🛡️  Admin Dashboard API:     http://localhost:${PORT}/api/admin`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
