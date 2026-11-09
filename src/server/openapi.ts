import express, { Request, Response } from 'express';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const openapiRouter = express.Router();
const require = createRequire(import.meta.url);
const swaggerAssets = path.dirname(require.resolve('swagger-ui-dist/package.json'));

// Serve only the assets used by this page, without relying on a third-party CDN.
for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js']) {
  openapiRouter.get(`/docs/assets/${asset}`, (_req, res) => {
    res.sendFile(path.join(swaggerAssets, asset));
  });
}

openapiRouter.get('/docs/assets/kedata-docs.css', (_req, res) => {
  res.sendFile(fileURLToPath(new URL('../../public/kedata-docs.css', import.meta.url)));
});

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Kedata CMS Public REST API',
    version: '1.0.0',
    description: 'Framework-agnostic Headless CMS API for multi-website environments. All responses conform to standard JSON schema with { data, meta, error } structure.',
    contact: {
      name: 'Kedata API Support',
      email: 'engineering@kedata.id',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current Environment API Server',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Site-specific API Key generated in Kedata CMS Dashboard.',
      },
    },
    schemas: {
      ApiMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          perPage: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'UNAUTHORIZED' },
          message: { type: 'string', example: 'Header x-api-key atau parameter apiKey diperlukan' },
        },
      },
      PageItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmw4page123' },
          title: { type: 'string', example: 'About Us' },
          slug: { type: 'string', example: 'about' },
          contentHtml: { type: 'string', example: '<h2>About</h2><p>Safe HTML content</p>' },
          contentJson: { type: 'object', description: 'Structured TipTap JSON AST' },
          metaTitle: { type: 'string', example: 'About Us | Kedata' },
          metaDescription: { type: 'string', example: 'Company overview' },
          ogImage: { type: 'string', example: 'https://example.com/og.jpg' },
          publishedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PostItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmw4post456' },
          title: { type: 'string', example: 'Modern Headless Architecture' },
          slug: { type: 'string', example: 'modern-headless-architecture' },
          excerpt: { type: 'string', example: 'Why headless wins.' },
          contentHtml: { type: 'string', example: '<p>Sanitized article body...</p>' },
          contentJson: { type: 'object', description: 'TipTap JSON document tree' },
          featuredImage: { type: 'string', example: 'https://example.com/hero.jpg' },
          category: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
            },
          },
          tags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
          },
          metaTitle: { type: 'string' },
          metaDescription: { type: 'string' },
          ogImage: { type: 'string' },
          publishedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CategoryItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          postCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TagItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          postCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      MenuItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          location: { type: 'string', enum: ['HEADER', 'FOOTER', 'SIDEBAR'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                url: { type: 'string' },
                target: { type: 'string' },
              },
            },
          },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      SiteSetting: {
        type: 'object',
        properties: {
          siteId: { type: 'string' },
          siteTitle: { type: 'string' },
          tagline: { type: 'string' },
          logoUrl: { type: 'string' },
          faviconUrl: { type: 'string' },
          contactEmail: { type: 'string' },
          contactPhone: { type: 'string' },
          socialLinks: { type: 'object' },
          footerText: { type: 'string' },
          customMetadata: { type: 'object' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      MediaItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          filename: { type: 'string' },
          originalName: { type: 'string' },
          mimeType: { type: 'string' },
          sizeBytes: { type: 'integer' },
          url: { type: 'string' },
          altText: { type: 'string' },
          caption: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/pages': {
      get: {
        summary: 'List Published Pages',
        description: 'Returns published pages for the authenticated site. Supports pagination and field selection.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'perPage', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'fields', in: 'query', schema: { type: 'string', example: 'title,slug,publishedAt' } },
        ],
        responses: {
          200: {
            description: 'List of pages',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/PageItem' } },
                    meta: { $ref: '#/components/schemas/ApiMeta' },
                    error: { nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/pages/{slug}': {
      get: {
        summary: 'Get Page by Slug',
        description: 'Retrieve a single published page. Draft pages require the preview token query parameter (?preview=kd_preview_<siteId>).',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'preview', in: 'query', schema: { type: 'string' }, description: 'Preview token for draft pages' },
          { name: 'fields', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Page details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/PageItem' },
                    meta: { nullable: true },
                    error: { nullable: true },
                  },
                },
              },
            },
          },
          404: { description: 'Page not found' },
        },
      },
    },
    '/posts': {
      get: {
        summary: 'List Published Posts',
        description: 'Query published articles with filtering by category, tag, search query, ordering, pagination, and field selection.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'perPage', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Category slug' },
          { name: 'tag', in: 'query', schema: { type: 'string' }, description: 'Tag slug' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search title and excerpt' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['publishedAt', 'createdAt', 'title'], default: 'publishedAt' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          { name: 'fields', in: 'query', schema: { type: 'string' } },
          { name: 'include', in: 'query', schema: { type: 'string', example: 'category,tags' } },
        ],
        responses: {
          200: {
            description: 'List of posts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/PostItem' } },
                    meta: { $ref: '#/components/schemas/ApiMeta' },
                    error: { nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/posts/{slug}': {
      get: {
        summary: 'Get Post by Slug',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'preview', in: 'query', schema: { type: 'string' } },
          { name: 'fields', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Post details with rich-text content in HTML and JSON format',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/PostItem' },
                    meta: { nullable: true },
                    error: { nullable: true },
                  },
                },
              },
            },
          },
          404: { description: 'Post not found' },
        },
      },
    },
    '/categories': {
      get: {
        summary: 'List Categories',
        responses: {
          200: {
            description: 'Categories for the site',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/CategoryItem' } },
                    meta: { $ref: '#/components/schemas/ApiMeta' },
                    error: { nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/tags': {
      get: {
        summary: 'List Tags',
        responses: {
          200: {
            description: 'Tags for the site',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/TagItem' } },
                    meta: { $ref: '#/components/schemas/ApiMeta' },
                    error: { nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/menus': {
      get: {
        summary: 'List Navigation Menus',
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string', enum: ['HEADER', 'FOOTER', 'SIDEBAR'] } },
        ],
        responses: {
          200: {
            description: 'Menus and navigation trees',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/MenuItem' } },
                    meta: { $ref: '#/components/schemas/ApiMeta' },
                    error: { nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/settings': {
      get: {
        summary: 'Get Site Settings',
        description: 'Returns branding, logo, contact information, social links, and footer text.',
        responses: {
          200: {
            description: 'Site settings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/SiteSetting' },
                    meta: { nullable: true },
                    error: { nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/media/{id}': {
      get: {
        summary: 'Get Media Details',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Media metadata and download URL',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/MediaItem' },
                    meta: { nullable: true },
                    error: { nullable: true },
                  },
                },
              },
            },
          },
          404: { description: 'Media not found' },
        },
      },
    },
  },
};

openapiRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(openapiSpec);
});

openapiRouter.get('/docs', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Referensi REST API Kedata CMS. Pelajari autentikasi, ambil konten situs, dan coba endpoint langsung dari browser.">
  <title>Dokumentasi API &middot; Kedata CMS</title>
  <link rel="stylesheet" href="/docs/assets/swagger-ui.css">
  <link rel="stylesheet" href="/docs/assets/kedata-docs.css">
</head>
<body>
  <a class="skip-link" href="#overview">Lewati navigasi</a>
  <header class="docs-header">
    <a href="/" class="docs-brand" aria-label="Kedata CMS beranda"><svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><path fill="#a5b4b0" d="M3 3h7v26H3z"/><path fill="#6c7a89" d="M13 3h8L13 15l15 14H18L7 17z"/></svg><span>Kedata CMS</span><span class="docs-header-label">Dokumentasi</span></a>
    <nav aria-label="Navigasi utama"><a href="/">Beranda</a><a class="header-action" href="/login">Buka workspace <span aria-hidden="true">&nearr;</span></a></nav>
  </header>
  <div class="docs-layout">
    <aside class="docs-sidebar" aria-label="Navigasi dokumentasi">
      <p>Mulai membangun</p>
      <nav aria-label="Bagian dokumentasi">
        <a href="#overview">Pengantar</a>
        <a href="#quickstart">Request pertama</a>
        <a href="#authentication">Autentikasi</a>
        <a href="#reference">Referensi endpoint</a>
      </nav>
      <div class="docs-sidebar-bottom"><span>Spesifikasi terbuka</span><a href="/openapi.json" target="_blank" rel="noopener">Lihat OpenAPI JSON <span aria-hidden="true">&nearr;</span></a><p>REST API &middot; v1.0.0</p></div>
    </aside>
    <main class="docs-main">
      <section id="overview" class="docs-intro">
        <div class="docs-title-row"><h1>Bangun dengan Kedata.</h1><span class="version">API v1</span></div>
        <p>Konten dari satu workspace, untuk setiap aplikasi Anda. Gunakan REST API untuk mengambil artikel, halaman, media, dan struktur situs.</p>
        <div class="docs-facts"><span>Format <strong>JSON</strong></span><span>Base URL <code>/api/v1</code></span><span>Autentikasi <strong>API key per situs</strong></span></div>
      </section>
      <section id="quickstart" class="docs-quickstart" aria-labelledby="quickstart-title">
        <div><h2 id="quickstart-title">Request pertama</h2><p>Ambil API key situs dari workspace. Ganti <code>YOUR_SITE_API_KEY</code> dengan key Anda, lalu jalankan contoh ini di terminal.</p><a href="#reference" class="docs-inline-link">Atau coba langsung di bawah <span aria-hidden="true">&nearr;</span></a></div>
        <div class="docs-code"><div><span>Terminal</span><span>cURL</span></div><pre tabindex="0" aria-label="Contoh request cURL"><code>curl 'http://localhost:3000/api/v1/posts?perPage=5' &#92;
  -H 'x-api-key: YOUR_SITE_API_KEY'</code></pre><p>Gunakan domain server CMS Anda saat integrasi.</p></div>
      </section>
      <section id="authentication" class="docs-auth" aria-labelledby="auth-title">
        <h2 id="auth-title">Satu key untuk setiap situs.</h2><p>Kirim API key melalui header <code>x-api-key</code>. Di referensi berikut, klik <strong>Authorize</strong> dan masukkan key situs sebelum menjalankan request. Key hanya memberi akses ke konten situs terkait.</p>
      </section>
      <section id="reference" class="docs-reference" aria-labelledby="reference-title">
        <div class="docs-reference-head"><div><h2 id="reference-title">Referensi endpoint</h2><p>Pilih endpoint untuk melihat parameter, contoh respons, dan mencoba request.</p></div><a href="/openapi.json" target="_blank" rel="noopener">OpenAPI JSON <span aria-hidden="true">&nearr;</span></a></div>
        <div id="swagger-ui"><p role="status">Memuat dokumentasi API&hellip;</p></div>
      </section>
      <footer class="docs-footer"><span>Kedata CMS &middot; Dokumentasi API</span><a href="#overview">Kembali ke atas &uarr;</a></footer>
    </main>
  </div>
  <noscript>Aktifkan JavaScript untuk dokumentasi interaktif, atau <a href="/openapi.json">unduh spesifikasi OpenAPI</a>.</noscript>
  <script src="/docs/assets/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      if (typeof SwaggerUIBundle !== 'function') {
        document.getElementById('swagger-ui').innerHTML = '<p role="alert">API documentation could not load. Reload this page or <a href="/openapi.json">download the OpenAPI specification</a>.</p>';
        return;
      }
      SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        filter: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: -1,
        displayRequestDuration: true,
        persistAuthorization: false,
        presets: [SwaggerUIBundle.presets.apis],
        validatorUrl: null,
        layout: "BaseLayout"
      });
    }
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
});
