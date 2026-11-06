import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LoginSchema,
  SiteCreateSchema,
  PageSchema,
  PostSchema,
  CategorySchema,
  TagSchema,
} from '../src/server/security.js';

test('LoginSchema validates correct and incorrect credentials', () => {
  const valid = LoginSchema.safeParse({
    email: 'admin@kedata.id',
    password: 'KedataAdmin2026!',
  });
  assert.equal(valid.success, true);

  const invalidEmail = LoginSchema.safeParse({
    email: 'bukan-email',
    password: 'KedataAdmin2026!',
  });
  assert.equal(invalidEmail.success, false);

  const shortPassword = LoginSchema.safeParse({
    email: 'admin@kedata.id',
    password: '123',
  });
  assert.equal(shortPassword.success, false);
});

test('SiteCreateSchema validates slug format and required fields', () => {
  const valid = SiteCreateSchema.safeParse({
    name: 'Tech Portal',
    slug: 'tech-portal',
    domain: 'tech.kedata.id',
    corsOrigins: '*',
    rateLimit: 120,
  });
  assert.equal(valid.success, true);

  const invalidSlug = SiteCreateSchema.safeParse({
    name: 'Tech Portal',
    slug: 'Tech Portal With Space!',
    domain: 'tech.kedata.id',
  });
  assert.equal(invalidSlug.success, false);
});

test('PageSchema and PostSchema enforce status and non-empty title', () => {
  const validPage = PageSchema.safeParse({
    title: 'About Us',
    slug: 'about-us',
    status: 'PUBLISHED',
  });
  assert.equal(validPage.success, true);

  const invalidStatus = PageSchema.safeParse({
    title: 'About Us',
    slug: 'about-us',
    status: 'UNKNOWN_STATUS' as any,
  });
  assert.equal(invalidStatus.success, false);

  const validPost = PostSchema.safeParse({
    title: 'New Launch Post',
    slug: 'new-launch-post',
    status: 'SCHEDULED',
    scheduledAt: new Date().toISOString(),
  });
  assert.equal(validPost.success, true);
});
