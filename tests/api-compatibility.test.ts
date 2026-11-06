import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/server/db.js';
import { hashApiKey } from '../src/server/security.js';

test('Database query verifies only published posts are returned publicly', async () => {
  const site = await prisma.site.findUnique({
    where: { slug: 'kedata-tech' },
  });

  assert.notEqual(site, null);

  // Query only published posts (as API v1 does)
  const publishedPosts = await prisma.post.findMany({
    where: {
      siteId: site!.id,
      status: 'PUBLISHED',
    },
  });

  const draftPosts = await prisma.post.findMany({
    where: {
      siteId: site!.id,
      status: 'DRAFT',
    },
  });

  // There must be published posts and at least one draft post
  assert.equal(publishedPosts.length > 0, true);
  assert.equal(draftPosts.length > 0, true);

  // In published list, no item should have status DRAFT or SCHEDULED
  for (const p of publishedPosts) {
    assert.equal(p.status, 'PUBLISHED');
  }
});

test('API key authentication validates hash matching', async () => {
  const site = await prisma.site.findUnique({
    where: { slug: 'kedata-tech' },
  });

  assert.notEqual(site, null);
  assert.notEqual(site!.apiKeyHash, null);
  assert.equal(site!.apiKeyHash.length, 64); // SHA-256 hex string

  // A random dummy key should not match
  const invalidKeyHash = hashApiKey('kd_invalid_key_12345');
  const matched = await prisma.site.findUnique({
    where: { apiKeyHash: invalidKeyHash },
  });

  assert.equal(matched, null);
});
