import type { IncomingMessage, ServerResponse } from 'node:http';
import { vercelApp } from '../src/server/vercel-app.js';

// Catch-all Vercel serverless function: every /api/* request reaches this
// handler and is dispatched by the Express app. Non-API routes (/health,
// /rss.xml, /sitemap.xml, /robots.txt) are rewritten here via vercel.json.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  vercelApp(req as never, res as never);
}
