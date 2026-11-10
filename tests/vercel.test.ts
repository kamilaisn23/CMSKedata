import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

test('vercel serverless app serves API routes with isolated SQLite fixture', async t => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
  const scratch = fs.mkdtempSync(path.join(root, '.cache', 'vercel-test-'));
  const previousCwd = process.cwd();
  process.env.DATABASE_URL = `file:${path.join(scratch, 'fixture.db').replaceAll('\\', '/')}`;
  const schemaSql = execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', path.join(root, 'prisma/schema.prisma'), '--script'], { env: process.env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  const fixture = new DatabaseSync(path.join(scratch, 'fixture.db'));
  fixture.exec(schemaSql); fixture.close();
  process.chdir(scratch);
  const { prisma } = await import('../src/server/db.js');
  const { vercelApp } = await import('../src/server/vercel-app.js');
  const server = vercelApp.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;

  const passwordHash = bcrypt.hashSync('KedataTest2026!', 10);
  await prisma.user.create({ data: { name: 'Admin', email: 'admin@test.local', passwordHash, role: 'ADMIN' } });
  const site = await prisma.site.create({ data: { name: 'Kedata Tech', slug: 'kedata-tech', domain: 'kedata.test', apiKeyHash: 'a'.repeat(64), apiKeyPrefix: 'prefix-a' } });
  await prisma.post.create({ data: { title: 'Scheduled', slug: 'scheduled', status: 'SCHEDULED', siteId: site.id, scheduledAt: new Date(Date.now() - 1000) } });
  const scheduledId = (await prisma.post.findFirst({ where: { slug: 'scheduled' } }))!.id;

  try {
    await t.test('health responds for the vercel.json rewrite target', async () => {
      const response = await fetch(base + '/api/health');
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.status, 'healthy');
      assert.equal(body.backend, 'vercel-serverless');
    });

    await t.test('public feeds work without an API key at both mount paths', async () => {
      for (const route of ['/api/rss.xml', '/api/v1/rss.xml', '/api/sitemap.xml', '/api/v1/sitemap.xml', '/api/robots.txt']) {
        const response = await fetch(base + route);
        assert.equal(response.status, 200, route);
        assert.match(response.headers.get('content-type') || '', /xml|text/);
      }
    });

    await t.test('public API rejects requests without an API key', async () => {
      const response = await fetch(base + '/api/v1/posts');
      assert.equal(response.status, 401);
      const body = await response.json();
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });

    await t.test('login sets a session cookie and /me accepts it', async () => {
      const login = await fetch(base + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@test.local', password: 'KedataTest2026!' }),
      });
      assert.equal(login.status, 200);
      const body = await login.json();
      assert.equal(body.data.user.email, 'admin@test.local');
      const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
      assert.match(cookie, /^kd_cms_session=/);

      const me = await fetch(base + '/api/admin/me', { headers: { Cookie: cookie } });
      assert.equal(me.status, 200);
      assert.equal((await me.json()).data.email, 'admin@test.local');

      const anonymous = await fetch(base + '/api/admin/me');
      assert.equal(anonymous.status, 401);
    });

    await t.test('cron publish endpoint enforces CRON_SECRET and publishes due posts', async () => {
      process.env.CRON_SECRET = 'test-secret';
      try {
        const denied = await fetch(base + '/api/cron/publish', { method: 'POST' });
        assert.equal(denied.status, 401);

        const allowed = await fetch(base + '/api/cron/publish', { headers: { Authorization: 'Bearer test-secret' } });
        assert.equal(allowed.status, 200);
        const body = await allowed.json();
        assert.equal(body.data.published, 1);
        assert.equal((await prisma.post.findUnique({ where: { id: scheduledId } }))!.status, 'PUBLISHED');
      } finally {
        delete process.env.CRON_SECRET;
      }
    });

    await t.test('unknown endpoints return a JSON 404', async () => {
      const response = await fetch(base + '/api/unknown');
      assert.equal(response.status, 404);
      const body = await response.json();
      assert.equal(body.error.code, 'NOT_FOUND');
    });
  } finally {
    server.close();
    process.chdir(previousCwd);
    await prisma.$disconnect();
  }
});
