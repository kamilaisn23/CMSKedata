import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Helper to hash API keys using SHA-256 for fast lookup & secure storage
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(prefix = 'kd_live'): { rawKey: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `${prefix}_${randomBytes}`;
  const hash = hashApiKey(rawKey);
  return { rawKey, hash, prefix: rawKey.slice(0, 12) + '...' };
}

async function main() {
  console.log('🌱 Starting Kedata CMS Database Seeding...');

  // 1. Admin Account from .env
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kedata.id';
  const adminPassword = process.env.ADMIN_PASSWORD || 'KedataAdmin2026!';
  const adminName = process.env.ADMIN_NAME || 'Kedata Administrator';

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`👤 Admin created/updated: ${admin.email}`);

  // 2. Site 1: Kedata Tech Blog
  const site1Key = generateApiKey('kd_live_tech');
  const site1 = await prisma.site.upsert({
    where: { slug: 'kedata-tech' },
    update: {
      name: 'Kedata Tech Blog',
      domain: 'tech.kedata.id',
      description: 'Engineering, architecture, and technology insights from the Kedata team.',
      apiKeyHash: site1Key.hash,
      apiKeyPrefix: site1Key.prefix,
      corsOrigins: '*',
      rateLimit: 120,
    },
    create: {
      name: 'Kedata Tech Blog',
      slug: 'kedata-tech',
      domain: 'tech.kedata.id',
      description: 'Engineering, architecture, and technology insights from the Kedata team.',
      apiKeyHash: site1Key.hash,
      apiKeyPrefix: site1Key.prefix,
      corsOrigins: '*',
      rateLimit: 120,
    },
  });

  await prisma.siteSetting.upsert({
    where: { siteId: site1.id },
    update: {},
    create: {
      siteId: site1.id,
      siteTitle: 'Kedata Engineering & Tech Blog',
      tagline: 'Deep dives into distributed systems, headless architectures, and developer experience.',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop&q=80',
      contactEmail: 'engineering@kedata.id',
      contactPhone: '+62-21-5550192',
      socialLinks: JSON.stringify({
        twitter: 'https://twitter.com/kedata_id',
        github: 'https://github.com/kedata',
        linkedin: 'https://linkedin.com/company/kedata',
      }),
      footerText: '© 2026 PT Kedata Indonesia. All rights reserved. Powered by Kedata Headless CMS.',
    },
  });

  // Site 1 Categories
  const catTechArch = await prisma.category.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'architecture' } },
    update: {},
    create: {
      siteId: site1.id,
      name: 'Architecture',
      slug: 'architecture',
      description: 'Software architecture patterns and system designs.',
    },
  });

  const catTutorials = await prisma.category.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'tutorials' } },
    update: {},
    create: {
      siteId: site1.id,
      name: 'Tutorials',
      slug: 'tutorials',
      description: 'Hands-on development guides and code recipes.',
    },
  });

  // Site 1 Tags
  const tagHeadless = await prisma.tag.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'headless' } },
    update: {},
    create: { siteId: site1.id, name: 'Headless CMS', slug: 'headless' },
  });

  const tagNextjs = await prisma.tag.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'nextjs' } },
    update: {},
    create: { siteId: site1.id, name: 'Next.js', slug: 'nextjs' },
  });

  const tagApi = await prisma.tag.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'api' } },
    update: {},
    create: { siteId: site1.id, name: 'REST API', slug: 'api' },
  });

  // Site 1 Pages
  await prisma.page.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'about' } },
    update: {},
    create: {
      siteId: site1.id,
      title: 'About Kedata Tech Blog',
      slug: 'about',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      metaTitle: 'About Us | Kedata Tech Blog',
      metaDescription: 'Learn about our engineering philosophy and developer community.',
      contentHtml: '<h2>Welcome to Kedata Engineering</h2><p>We believe in high-performance, framework-agnostic systems that empower developers to build without boundaries. Our headless CMS is crafted to serve any client—web, mobile, or embedded.</p>',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Welcome to Kedata Engineering' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'We believe in high-performance, framework-agnostic systems that empower developers to build without boundaries. Our headless CMS is crafted to serve any client—web, mobile, or embedded.' }] },
        ],
      }),
    },
  });

  await prisma.page.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'privacy-policy' } },
    update: {},
    create: {
      siteId: site1.id,
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      metaTitle: 'Privacy Policy | Kedata Tech Blog',
      metaDescription: 'Our commitment to data protection and transparent user privacy.',
      contentHtml: '<h2>Privacy Policy</h2><p>We respect your privacy and process data in strict accordance with modern digital protection standards.</p>',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Privacy Policy' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'We respect your privacy and process data in strict accordance with modern digital protection standards.' }] },
        ],
      }),
    },
  });

  // Site 1 Posts
  const post1 = await prisma.post.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'building-headless-cms' } },
    update: {},
    create: {
      siteId: site1.id,
      title: 'Building Modern Headless Architectures with Kedata CMS',
      slug: 'building-headless-cms',
      excerpt: 'How a unified multi-website backend simplifies multi-tenant content delivery across diverse tech stacks.',
      status: 'PUBLISHED',
      categoryId: catTechArch.id,
      publishedAt: new Date(),
      featuredImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
      metaTitle: 'Building Modern Headless Architectures with Kedata CMS',
      metaDescription: 'A practical guide to multi-site headless content management.',
      contentHtml: '<h2>The Multi-Site Dilemma</h2><p>Modern enterprises often accumulate diverse web frameworks: marketing on Next.js, portals on Nuxt, customer accounts on React, and legacy systems on Laravel. Managing multiple logins and fragmented databases is an operational nightmare.</p><h3>The Kedata Solution</h3><p>Kedata CMS decouples the presentation layer completely. With standard REST APIs, HMAC webhooks, and TipTap rich-text schemas, all frontends stay synchronized in real time.</p>',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'The Multi-Site Dilemma' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Modern enterprises often accumulate diverse web frameworks: marketing on Next.js, portals on Nuxt, customer accounts on React, and legacy systems on Laravel. Managing multiple logins and fragmented databases is an operational nightmare.' }] },
          { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'The Kedata Solution' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Kedata CMS decouples the presentation layer completely. With standard REST APIs, HMAC webhooks, and TipTap rich-text schemas, all frontends stay synchronized in real time.' }] },
        ],
      }),
    },
  });

  // Attach tags
  await prisma.postTag.upsert({
    where: { postId_tagId: { postId: post1.id, tagId: tagHeadless.id } },
    update: {},
    create: { postId: post1.id, tagId: tagHeadless.id },
  });
  await prisma.postTag.upsert({
    where: { postId_tagId: { postId: post1.id, tagId: tagApi.id } },
    update: {},
    create: { postId: post1.id, tagId: tagApi.id },
  });

  const post2 = await prisma.post.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'why-framework-agnostic-apis-win' } },
    update: {},
    create: {
      siteId: site1.id,
      title: 'Why Framework-Agnostic APIs Win the Long Game',
      slug: 'why-framework-agnostic-apis-win',
      excerpt: 'Frontend frameworks come and go, but clean HTTP REST endpoints and normalized data structures endure.',
      status: 'PUBLISHED',
      categoryId: catTutorials.id,
      publishedAt: new Date(Date.now() - 86400000 * 2),
      featuredImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
      metaTitle: 'Why Framework-Agnostic APIs Win the Long Game',
      metaDescription: 'Principles of future-proof API design for digital content.',
      contentHtml: '<h2>Future-Proof Digital Content</h2><p>When you bind your content models to a specific frontend framework, migrating or redesigning requires massive refactoring. By serving both sanitized HTML and structured JSON, Kedata CMS ensures seamless rendering across mobile, desktop, and smart screens.</p>',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Future-Proof Digital Content' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'When you bind your content models to a specific frontend framework, migrating or redesigning requires massive refactoring. By serving both sanitized HTML and structured JSON, Kedata CMS ensures seamless rendering across mobile, desktop, and smart screens.' }] },
        ],
      }),
    },
  });

  await prisma.postTag.upsert({
    where: { postId_tagId: { postId: post2.id, tagId: tagNextjs.id } },
    update: {},
    create: { postId: post2.id, tagId: tagNextjs.id },
  });

  // Scheduled post
  await prisma.post.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'v2-roadmap-announcement' } },
    update: {},
    create: {
      siteId: site1.id,
      title: 'Kedata CMS v2.0 Roadmap and Community Features',
      slug: 'v2-roadmap-announcement',
      excerpt: 'Sneak peek at upcoming multi-tenant capabilities, visual page builder integration, and GraphQL mutations.',
      status: 'SCHEDULED',
      categoryId: catTechArch.id,
      scheduledAt: new Date(Date.now() + 86400000 * 7),
      contentHtml: '<p>Exciting things are coming soon to Kedata CMS!</p>',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Exciting things are coming soon to Kedata CMS!' }] }],
      }),
    },
  });

  // Draft post
  await prisma.post.upsert({
    where: { siteId_slug: { siteId: site1.id, slug: 'internal-guidelines-draft' } },
    update: {},
    create: {
      siteId: site1.id,
      title: 'Internal Guidelines: High Performance Web Vitals',
      slug: 'internal-guidelines-draft',
      excerpt: 'Internal editorial notes on core web vitals and edge caching.',
      status: 'DRAFT',
      categoryId: catTutorials.id,
      contentHtml: '<p>This is a working draft for internal review.</p>',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'This is a working draft for internal review.' }] }],
      }),
    },
  });

  // Site 1 Menus
  await prisma.menu.upsert({
    where: { id: 'menu-tech-header' },
    update: {},
    create: {
      id: 'menu-tech-header',
      siteId: site1.id,
      name: 'Main Navigation',
      location: 'HEADER',
      itemsJson: JSON.stringify([
        { id: '1', label: 'Home', url: '/', target: '_self' },
        { id: '2', label: 'Articles', url: '/posts', target: '_self' },
        { id: '3', label: 'Architecture', url: '/category/architecture', target: '_self' },
        { id: '4', label: 'About', url: '/pages/about', target: '_self' },
      ]),
    },
  });

  await prisma.menu.upsert({
    where: { id: 'menu-tech-footer' },
    update: {},
    create: {
      id: 'menu-tech-footer',
      siteId: site1.id,
      name: 'Footer Links',
      location: 'FOOTER',
      itemsJson: JSON.stringify([
        { id: 'f1', label: 'About Us', url: '/pages/about', target: '_self' },
        { id: 'f2', label: 'Privacy Policy', url: '/pages/privacy-policy', target: '_self' },
        { id: 'f3', label: 'Documentation', url: '/docs', target: '_blank' },
        { id: 'f4', label: 'RSS Feed', url: '/rss.xml', target: '_blank' },
      ]),
    },
  });

  // 3. Site 2: Kedata Corporate
  const site2Key = generateApiKey('kd_live_corp');
  const site2 = await prisma.site.upsert({
    where: { slug: 'kedata-corp' },
    update: {
      name: 'Kedata Corporate Portal',
      domain: 'kedata.id',
      description: 'Official corporate website and investor relations portal for Kedata Group.',
      apiKeyHash: site2Key.hash,
      apiKeyPrefix: site2Key.prefix,
      corsOrigins: '*',
      rateLimit: 120,
    },
    create: {
      name: 'Kedata Corporate Portal',
      slug: 'kedata-corp',
      domain: 'kedata.id',
      description: 'Official corporate website and investor relations portal for Kedata Group.',
      apiKeyHash: site2Key.hash,
      apiKeyPrefix: site2Key.prefix,
      corsOrigins: '*',
      rateLimit: 120,
    },
  });

  await prisma.siteSetting.upsert({
    where: { siteId: site2.id },
    update: {},
    create: {
      siteId: site2.id,
      siteTitle: 'PT Kedata Multi Karya',
      tagline: 'Pioneering digital infrastructure and intelligent enterprise platforms.',
      logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop&q=80',
      contactEmail: 'contact@kedata.id',
      contactPhone: '+62-21-5550100',
      socialLinks: JSON.stringify({
        linkedin: 'https://linkedin.com/company/kedata-group',
        twitter: 'https://twitter.com/kedatagroup',
      }),
      footerText: '© 2026 PT Kedata Multi Karya. Empowering Digital Transformation.',
    },
  });

  // Site 2 Category & Posts
  const catNews = await prisma.category.upsert({
    where: { siteId_slug: { siteId: site2.id, slug: 'press-releases' } },
    update: {},
    create: {
      siteId: site2.id,
      name: 'Press Releases',
      slug: 'press-releases',
      description: 'Official announcements and corporate milestones.',
    },
  });

  await prisma.post.upsert({
    where: { siteId_slug: { siteId: site2.id, slug: 'series-a-expansion' } },
    update: {},
    create: {
      siteId: site2.id,
      title: 'Kedata Secures Strategic Growth Capital to Expand Enterprise Cloud Offerings',
      slug: 'series-a-expansion',
      excerpt: 'Investment accelerates expansion of headless platform and AI-powered edge computing services.',
      status: 'PUBLISHED',
      categoryId: catNews.id,
      publishedAt: new Date(),
      featuredImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
      metaTitle: 'Kedata Secures Strategic Growth Capital',
      metaDescription: 'Official press release on strategic expansion and enterprise roadmap.',
      contentHtml: '<h2>Strategic Expansion</h2><p>Today Kedata Group announced new investment to empower global clients with headless enterprise tools.</p>',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Strategic Expansion' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Today Kedata Group announced new investment to empower global clients with headless enterprise tools.' }] },
        ],
      }),
    },
  });

  // Seed initial media
  await prisma.media.upsert({
    where: { id: 'sample-media-1' },
    update: {},
    create: {
      id: 'sample-media-1',
      siteId: site1.id,
      filename: 'hero-architecture.webp',
      originalName: 'System-Architecture-Overview.webp',
      mimeType: 'image/webp',
      sizeBytes: 342150,
      url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
      altText: 'Distributed Headless Cloud Architecture Diagram',
      caption: 'Kedata multi-site unified content delivery pipeline.',
    },
  });

  await prisma.media.upsert({
    where: { id: 'sample-media-2' },
    update: {},
    create: {
      id: 'sample-media-2',
      siteId: site2.id,
      filename: 'corporate-headquarters.webp',
      originalName: 'Kedata-HQ-Jakarta.webp',
      mimeType: 'image/webp',
      sizeBytes: 421800,
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
      altText: 'Kedata Tower Headquarters',
      caption: 'Jakarta operational center.',
    },
  });

  // Audit Logs
  await prisma.auditLog.create({
    data: {
      actor: admin.email,
      action: 'SYSTEM_SEED',
      entityType: 'System',
      entityId: 'init',
      details: JSON.stringify({
        message: 'Initial database seeding executed successfully.',
        sitesCreated: ['kedata-tech', 'kedata-corp'],
      }),
    },
  });

  console.log('\n======================================================');
  console.log('✅ Kedata CMS Database Seeding Complete!');
  console.log('======================================================');
  console.log(`🔑 Admin Email:    ${adminEmail}`);
  console.log(`🔑 Admin Password: ${adminPassword}`);
  console.log('\n📡 Site 1 (Kedata Tech Blog):');
  console.log(`   ID:      ${site1.id}`);
  console.log(`   Slug:    kedata-tech`);
  console.log(`   API Key: ${site1Key.rawKey}`);
  console.log('\n📡 Site 2 (Kedata Corporate Portal):');
  console.log(`   ID:      ${site2.id}`);
  console.log(`   Slug:    kedata-corp`);
  console.log(`   API Key: ${site2Key.rawKey}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
