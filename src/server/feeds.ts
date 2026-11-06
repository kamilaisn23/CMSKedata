import express, { Request, Response } from 'express';
import { prisma } from './db.js';

export const feedsRouter = express.Router();

// Helper to escape XML special characters
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// 1. RSS 2.0 Feed
feedsRouter.get(['/rss.xml', '/api/v1/rss.xml'], async (req: Request, res: Response) => {
  try {
    const siteSlug = (req.query.site as string) || 'kedata-tech';
    const site = await prisma.site.findUnique({
      where: { slug: siteSlug },
      include: {
        setting: true,
        posts: {
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!site) {
      res.status(404).send('Site not found');
      return;
    }

    const baseUrl = `https://${site.domain}`;
    const siteTitle = site.setting?.siteTitle || site.name;
    const siteDescription = site.setting?.tagline || site.description || '';

    let itemsXml = '';
    for (const post of site.posts) {
      const postUrl = `${baseUrl}/posts/${post.slug}`;
      const pubDate = (post.publishedAt || post.createdAt).toUTCString();
      itemsXml += `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt || '')}</description>
    </item>`;
    }

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(rssXml);
  } catch (err: any) {
    res.status(500).send('Error generating RSS feed');
  }
});

// 2. XML Sitemap
feedsRouter.get(['/sitemap.xml', '/api/v1/sitemap.xml'], async (req: Request, res: Response) => {
  try {
    const siteSlug = (req.query.site as string) || 'kedata-tech';
    const site = await prisma.site.findUnique({
      where: { slug: siteSlug },
      include: {
        pages: { where: { status: 'PUBLISHED' } },
        posts: { where: { status: 'PUBLISHED' } },
      },
    });

    if (!site) {
      res.status(404).send('Site not found');
      return;
    }

    const baseUrl = `https://${site.domain}`;
    let urlsXml = `
  <url>
    <loc>${escapeXml(baseUrl)}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    for (const page of site.pages) {
      urlsXml += `
  <url>
    <loc>${escapeXml(`${baseUrl}/pages/${page.slug}`)}</loc>
    <lastmod>${page.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    for (const post of site.posts) {
      urlsXml += `
  <url>
    <loc>${escapeXml(`${baseUrl}/posts/${post.slug}`)}</loc>
    <lastmod>${post.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlsXml}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.status(200).send(sitemap);
  } catch (err: any) {
    res.status(500).send('Error generating sitemap');
  }
});

// 3. robots.txt
feedsRouter.get('/robots.txt', (_req: Request, res: Response) => {
  const content = `User-agent: *
Allow: /
Allow: /api/v1/
Disallow: /api/admin/

Sitemap: /sitemap.xml
`;
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(content);
});
