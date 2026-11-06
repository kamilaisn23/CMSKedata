import express, { Request, Response } from 'express';

export const openapiRouter = express.Router();

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
  // Render Swagger UI / Scalar Interactive Documentation
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Kedata CMS - OpenAPI Interactive Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #DFE2DC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .top-header {
      background: #6C7A89;
      color: #FFFFFF;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .top-header h1 {
      margin: 0;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .top-header a {
      color: #DFE2DC;
      text-decoration: none;
      font-size: 0.9rem;
      background: rgba(255,255,255,0.15);
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
    }
    .top-header a:hover {
      background: rgba(255,255,255,0.25);
    }
    #swagger-ui {
      max-width: 1200px;
      margin: 1.5rem auto;
      background: #FFFFFF;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(108, 122, 137, 0.15);
    }
    .swagger-ui .topbar { display: none !important; }
  </style>
</head>
<body>
  <div class="top-header">
    <h1>
      <span>📦</span> Kedata CMS API Reference
    </h1>
    <div style="display:flex; gap: 10px;">
      <a href="/openapi.json" target="_blank">Raw openapi.json</a>
      <a href="/">← Back to Dashboard</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
});
