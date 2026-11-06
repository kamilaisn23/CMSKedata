import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

// HTML Sanitization options for safe rich-text rendering
export const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'p', 'a', 'ul', 'ol', 'nl', 'li',
    'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br',
    'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'pre', 'img', 'span', 'figure', 'figcaption'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    code: ['class'],
    pre: ['class'],
    '*': ['style', 'class', 'id', 'data-*'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
};

export function sanitizeHtmlContent(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

// SHA-256 API Key Hash for fast and constant-time database matching
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(prefix = 'kd_live'): { rawKey: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `${prefix}_${randomBytes}`;
  const hash = hashApiKey(rawKey);
  return { rawKey, hash, prefix: rawKey.slice(0, 12) + '...' };
}

// HMAC-SHA256 signature for outgoing Webhooks
export function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// In-memory token bucket rate limiter for API keys and IPs
interface RateBucket {
  tokens: number;
  lastRefill: number;
}
const rateLimiterCache = new Map<string, RateBucket>();

export function checkRateLimit(key: string, limitPerMinute = 120): { allowed: boolean; remaining: number; resetSecs: number } {
  const now = Date.now();
  const bucket = rateLimiterCache.get(key) || { tokens: limitPerMinute, lastRefill: now };

  // Refill tokens proportionally
  const elapsed = (now - bucket.lastRefill) / 1000;
  const refillRate = limitPerMinute / 60; // tokens per second
  bucket.tokens = Math.min(limitPerMinute, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    rateLimiterCache.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetSecs: Math.ceil((limitPerMinute - bucket.tokens) / refillRate),
    };
  }

  rateLimiterCache.set(key, bucket);
  return {
    allowed: false,
    remaining: 0,
    resetSecs: Math.ceil(60 - (elapsed % 60)),
  };
}

// Zod Validation Schemas
export const LoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const SiteCreateSchema = z.object({
  name: z.string().min(2, 'Nama website minimal 2 karakter'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip'),
  domain: z.string().min(3, 'Domain wajib diisi'),
  description: z.string().optional(),
  corsOrigins: z.string().default('*'),
  webhookUrl: z.string().url('URL webhook harus valid').optional().or(z.literal('')),
  webhookSecret: z.string().optional(),
  rateLimit: z.number().int().min(10).max(1000).default(120),
});

export const SiteUpdateSchema = SiteCreateSchema.partial();

export const PageSchema = z.object({
  title: z.string().min(1, 'Judul halaman wajib diisi'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip'),
  contentHtml: z.string().default(''),
  contentJson: z.string().default('{}'),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
});

export const PostSchema = z.object({
  title: z.string().min(1, 'Judul post wajib diisi'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip'),
  excerpt: z.string().optional(),
  contentHtml: z.string().default(''),
  contentJson: z.string().default('{}'),
  featuredImage: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']).default('DRAFT'),
  categoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).default([]),
  scheduledAt: z.string().nullable().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
});

export const CategorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip'),
  description: z.string().optional(),
});

export const TagSchema = z.object({
  name: z.string().min(1, 'Nama tag wajib diisi'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip'),
});

export const MenuSchema = z.object({
  name: z.string().min(1, 'Nama menu wajib diisi'),
  location: z.enum(['HEADER', 'FOOTER', 'SIDEBAR']).default('HEADER'),
  itemsJson: z.string().default('[]'),
});

export const SiteSettingSchema = z.object({
  siteTitle: z.string().min(1, 'Judul situs wajib diisi'),
  tagline: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  contactEmail: z.string().email('Email tidak valid').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  socialLinks: z.string().default('{}'),
  footerText: z.string().optional(),
  customMetadata: z.string().default('{}'),
});
