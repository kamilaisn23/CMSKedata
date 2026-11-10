import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import cookieParser from 'cookie-parser';

test('role and site access enforced through HTTP with isolated SQLite fixtures', async t => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
  const scratch = fs.mkdtempSync(path.join(root, '.cache', 'access-test-'));
  const previousCwd = process.cwd();
  process.env.DATABASE_URL = `file:${path.join(scratch, 'fixture.db').replaceAll('\\', '/')}`;
  const schemaSql = execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', path.join(root, 'prisma/schema.prisma'), '--script'], { env: process.env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  const fixture = new DatabaseSync(path.join(scratch, 'fixture.db'));
  fixture.exec(schemaSql); fixture.close();
  process.chdir(scratch); // Uploads from this test never reach public/uploads in the real app.
  const { prisma } = await import('../src/server/db.js');
  const { adminRouter } = await import('../src/server/api/admin.js');
  const { v1Router } = await import('../src/server/api/v1.js');
  const app = express(); app.use(express.json(), cookieParser()); app.use('/api/admin', adminRouter); app.use('/api/v1', v1Router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  async function call(token: string, route: string, method = 'GET', body?: unknown) {
    const response = await fetch(base + route, { method, headers: { 'x-admin-token': token, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, ...await response.json() };
  }
  const a = await prisma.site.create({ data: { name: 'A', slug: 'a', domain: 'a.test', apiKeyHash: 'a'.repeat(64), apiKeyPrefix: 'prefix-a', webhookSecret: 'never-return-this' } });
  const b = await prisma.site.create({ data: { name: 'B', slug: 'b', domain: 'b.test', apiKeyHash: 'b'.repeat(64), apiKeyPrefix: 'prefix-b' } });
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  for (const role of ['ADMIN', 'MANAGER', 'EDITOR', 'PUBLISHER', 'UNKNOWN', 'UNASSIGNED']) {
    const user = await prisma.user.create({ data: { name: role, email: `${role.toLowerCase()}@test.local`, passwordHash: 'unused-test-hash', role: role === 'UNASSIGNED' ? 'EDITOR' : role, memberships: { create: role === 'ADMIN' || role === 'UNASSIGNED' ? [] : [{ siteId: a.id }] } } });
    ids[role] = user.id; tokens[role] = `test-token-${role}`;
    await prisma.session.create({ data: { userId: user.id, token: tokens[role], expiresAt: new Date(Date.now() + 600_000) } });
  }
  const draft = await prisma.page.create({ data: { title: 'Draft', slug: 'draft', siteId: a.id } });
  const live = await prisma.page.create({ data: { title: 'Live', slug: 'live', status: 'PUBLISHED', siteId: a.id } });
  const other = await prisma.page.create({ data: { title: 'Other', slug: 'other', siteId: b.id } });
  const scheduled = await prisma.post.create({ data: { title: 'Scheduled', slug: 'scheduled', status: 'SCHEDULED', siteId: a.id, scheduledAt: new Date(Date.now() + 86400_000) } });
  const version = await prisma.contentVersion.create({ data: { entityType: 'PAGE', entityId: live.id, versionNumber: 1, title: 'Older', contentHtml: '', contentJson: '{}', snapshotData: JSON.stringify(live) } });
  const otherVersion = await prisma.contentVersion.create({ data: { entityType: 'PAGE', entityId: other.id, versionNumber: 1, title: 'Older', contentHtml: '', contentJson: '{}', snapshotData: JSON.stringify(other) } });
  const category = await prisma.category.create({ data: { name: 'Other', slug: 'other', siteId: b.id } });
  const tag = await prisma.tag.create({ data: { name: 'Other', slug: 'other', siteId: b.id } });
  const media = await prisma.media.create({ data: { siteId: b.id, filename: 'other.jpg', originalName: 'other.jpg', mimeType: 'image/jpeg', sizeBytes: 1, url: '/uploads/other.jpg' } });
  const globalMedia = await prisma.media.create({ data: { filename: 'global.jpg', originalName: 'global.jpg', mimeType: 'image/jpeg', sizeBytes: 1, url: '/uploads/global.jpg' } });
  try {
    await t.test('site lists and sessions reveal only permitted data', async () => {
      assert.equal((await call('', '/api/admin/sites')).status, 401);
      const admin = await call(tokens.ADMIN, '/api/admin/sites'); assert.equal(admin.data.length, 2);
      assert.ok(!JSON.stringify(admin.data).includes('apiKeyHash')); assert.ok(!JSON.stringify(admin.data).includes('webhookSecret'));
      const editor = await call(tokens.EDITOR, '/api/admin/sites'); assert.deepEqual(editor.data.map((site: { id: string }) => site.id), [a.id]);
      assert.deepEqual((await call(tokens.EDITOR, '/api/admin/me')).data.siteIds, [a.id]);
      assert.deepEqual((await call(tokens.UNASSIGNED, '/api/admin/sites')).data, []);
      assert.equal((await call(tokens.UNKNOWN, '/api/admin/me')).status, 403);
    });
    await t.test('editor can save drafts but cannot publish, schedule or mutate live records', async () => {
      assert.equal((await call(tokens.EDITOR, `/api/admin/pages/${draft.id}`, 'PUT', { title: 'Edited', slug: 'draft', status: 'DRAFT' })).status, 200);
      for (const status of ['PUBLISHED', 'SCHEDULED']) assert.equal((await call(tokens.EDITOR, `/api/admin/posts?siteId=${a.id}`, 'POST', { title: 'Blocked', slug: 'blocked', status })).status, 403);
      assert.equal((await call(tokens.EDITOR, `/api/admin/pages/${live.id}`, 'PUT', { title: 'Bypass', slug: 'live', status: 'DRAFT' })).status, 403);
      assert.equal((await call(tokens.EDITOR, `/api/admin/pages/${live.id}`, 'DELETE')).status, 403);
      assert.equal((await call(tokens.EDITOR, `/api/admin/posts/${scheduled.id}`, 'DELETE')).status, 403);
      assert.equal((await call(tokens.EDITOR, `/api/admin/versions/${version.id}/restore`, 'POST')).status, 403);
      assert.equal((await call(tokens.PUBLISHER, `/api/admin/pages/${draft.id}`, 'PUT', { title: 'Published', slug: 'draft', status: 'PUBLISHED' })).status, 200);
    });
    await t.test('cross-site IDs, version history and taxonomy cannot bypass membership', async () => {
      for (const role of ['EDITOR', 'PUBLISHER', 'MANAGER']) {
        assert.equal((await call(tokens[role], `/api/admin/pages?siteId=${b.id}`)).status, 403);
        assert.equal((await call(tokens[role], `/api/admin/pages/${other.id}?siteId=${a.id}`, 'DELETE')).status, 403);
        assert.equal((await call(tokens[role], `/api/admin/versions/PAGE/${other.id}`)).status, 403);
        assert.equal((await call(tokens[role], `/api/admin/versions/${otherVersion.id}/restore`, 'POST')).status, 403);
        assert.equal((await call(tokens[role], `/api/admin/categories/${category.id}`, 'DELETE')).status, 403);
      }
      for (const fields of [{ categoryId: category.id }, { tagIds: [tag.id] }]) assert.equal((await call(tokens.PUBLISHER, `/api/admin/posts?siteId=${a.id}`, 'POST', { title: 'Bad relation', slug: 'bad', ...fields })).status, 403);
      assert.equal((await call(tokens.ADMIN, `/api/admin/posts?siteId=${a.id}`, 'POST', { title: 'Bad relation', slug: 'bad', categoryId: category.id })).status, 403);
    });
    await t.test('administration and global operations are restricted', async () => {
      for (const route of ['/users', '/sites', '/cron/publish']) assert.equal((await call(tokens.MANAGER, '/api/admin' + route, 'POST', {})).status, 403);
      for (const resource of ['settings', 'menus', 'audit-logs']) assert.equal((await call(tokens.EDITOR, `/api/admin/${resource}?siteId=${a.id}`)).status, 403);
      assert.equal((await call(tokens.MANAGER, `/api/admin/settings?siteId=${a.id}`, 'PUT', { siteTitle: 'New title' })).status, 200);
      assert.equal((await call(tokens.MANAGER, `/api/admin/settings?siteId=${b.id}`)).status, 403);
      assert.equal((await call(tokens.MANAGER, '/api/admin/audit-logs')).status, 403);
    });
    await t.test('media writes are scoped, including authorization before multipart upload', async () => {
      assert.equal((await call(tokens.EDITOR, '/api/admin/media')).status, 403);
      assert.deepEqual((await call(tokens.EDITOR, `/api/admin/media?siteId=${a.id}`)).data, []);
      for (const id of [media.id, globalMedia.id]) assert.equal((await call(tokens.EDITOR, `/api/admin/media/${id}`, 'PUT', { caption: 'blocked' })).status, 403);
      const before = fs.readdirSync(path.join(scratch, 'public/uploads'));
      for (const siteId of ['', b.id]) {
        const form = new FormData(); form.set('siteId', a.id); form.set('file', new Blob(['fixture'], { type: 'image/jpeg' }), 'test.jpg');
        const response = await fetch(`${base}/api/admin/media/upload${siteId ? `?siteId=${siteId}` : ''}`, { method: 'POST', headers: { 'x-admin-token': tokens.EDITOR }, body: form });
        assert.equal(response.status, 403);
      }
      assert.deepEqual(fs.readdirSync(path.join(scratch, 'public/uploads')), before);
      const form = new FormData(); form.set('siteId', b.id); form.set('file', new Blob(['fixture'], { type: 'image/jpeg' }), 'test.jpg');
      const response = await fetch(`${base}/api/admin/media/upload?siteId=${a.id}`, { method: 'POST', headers: { 'x-admin-token': tokens.EDITOR }, body: form });
      assert.equal(response.status, 201); assert.equal((await response.json()).data.siteId, a.id);
    });
    await t.test('API explorer prefix fallback validates session, role and assignment', async () => {
      assert.equal((await call('fake-session', `/api/v1/pages?apiKey=${a.apiKeyPrefix}`)).status, 401);
      assert.equal((await call(tokens.MANAGER, `/api/v1/pages?apiKey=${a.apiKeyPrefix}`)).status, 200);
      assert.equal((await call(tokens.MANAGER, `/api/v1/pages?apiKey=${b.apiKeyPrefix}`)).status, 401);
      assert.equal((await call(tokens.EDITOR, `/api/v1/pages?apiKey=${a.apiKeyPrefix}`)).status, 401);
      const cookieResponse = await fetch(`${base}/api/v1/pages?apiKey=${a.apiKeyPrefix}`, { headers: { cookie: 'kd_cms_session=fake' } }); assert.equal(cookieResponse.status, 401);
    });
    await t.test('backups require central admin and reject invalid packages/confirmation', async () => {
      assert.equal((await call('', '/api/admin/backups')).status, 401);
      for (const role of ['EDITOR', 'PUBLISHER', 'MANAGER']) {
        assert.equal((await call(tokens[role], '/api/admin/backups')).status, 403);
        assert.equal((await call(tokens[role], '/api/admin/backups', 'POST')).status, 403);
      }
      const list = await call(tokens.ADMIN, '/api/admin/backups'); assert.equal(list.status, 200); assert.deepEqual(list.data, []);
      assert.equal((await call(tokens.ADMIN, '/api/admin/backups/not-an-id/download')).status, 404);
      assert.equal((await call(tokens.ADMIN, '/api/admin/backups/not-an-id/restore', 'POST', { confirmation: 'yes' })).status, 400);
      const body = new FormData(); body.set('file', new Blob(['invalid package']), 'backup.gz');
      const inspected = await fetch(`${base}/api/admin/backups/inspect`, { method: 'POST', headers: { 'x-admin-token': tokens.ADMIN }, body }); assert.equal(inspected.status, 400);
    });
    await t.test('calendar scopes all sites, handles Jakarta boundaries and keeps queue/counts honest', async () => {
      const start = await prisma.post.create({ data: { siteId: a.id, title: 'Month start Jakarta', slug: 'calendar-start', status: 'SCHEDULED', scheduledAt: new Date('2026-10-31T17:00:00Z') } });
      const end = await prisma.post.create({ data: { siteId: a.id, title: 'Next month Jakarta', slug: 'calendar-end', status: 'SCHEDULED', scheduledAt: new Date('2026-11-30T17:00:00Z') } });
      const otherSite = await prisma.post.create({ data: { siteId: b.id, title: 'Other site event', slug: 'calendar-other', status: 'SCHEDULED', scheduledAt: new Date('2026-11-10T05:00:00Z') } });
      const publishedPage = await prisma.page.create({ data: { siteId: a.id, title: 'Published page', slug: 'calendar-page', status: 'PUBLISHED', publishedAt: new Date('2026-11-15T03:00:00Z') } });
      await prisma.post.createMany({ data: Array.from({ length: 13 }, (_, i) => ({ siteId: a.id, title: `Queue ${i}`, slug: `calendar-queue-${i}`, status: i === 0 ? 'IN_REVIEW' : 'DRAFT', scheduledAt: new Date('2026-11-12T00:00:00Z') })) });
      const route = '/api/admin/calendar?month=2026-11';
      assert.equal((await call('', route)).status, 401);
      assert.equal((await call(tokens.UNKNOWN, route)).status, 403);
      for (const query of ['', '?month=2026-13', '?month=2026-1', '?month=2026-11&month=2026-12', '?month=2026-11&siteId[]=bad']) assert.equal((await call(tokens.ADMIN, '/api/admin/calendar' + query)).status, 400);
      assert.equal((await call(tokens.EDITOR, `${route}&siteId=${b.id}`)).status, 403);
      const editor = await call(tokens.EDITOR, route); assert.equal(editor.status, 200);
      assert.ok(editor.data.events.some((entry: { id: string }) => entry.id === start.id));
      assert.ok(!editor.data.events.some((entry: { id: string }) => [end.id, otherSite.id].includes(entry.id)));
      assert.equal(editor.data.events.find((entry: { id: string }) => entry.id === publishedPage.id).kind, 'PAGE');
      assert.ok(editor.data.events.every((entry: { siteId: string }) => entry.siteId === a.id));
      assert.equal(editor.data.queue.length, 12); assert.ok(editor.data.counts.draft >= 12); assert.ok(editor.data.counts.review >= 1);
      for (const entry of [...editor.data.events, ...editor.data.queue]) { assert.ok(!('contentHtml' in entry)); assert.ok(!('site' in entry)); assert.ok(!('apiKeyHash' in entry)); }
      assert.ok(editor.data.queue.every((entry: { at: string | null }) => entry.at === null));
      const admin = await call(tokens.ADMIN, route); assert.ok(admin.data.events.some((entry: { id: string }) => entry.id === otherSite.id));
      const filtered = await call(tokens.ADMIN, `${route}&siteId=${b.id}`); assert.deepEqual(filtered.data.events.map((entry: { id: string }) => entry.id), [otherSite.id]);
      const unassigned = await call(tokens.UNASSIGNED, route); assert.deepEqual(unassigned.data, { events: [], queue: [], counts: { scheduled: 0, published: 0, draft: 0, review: 0 } });
    });
    for (const kind of ['pages', 'posts'] as const) await t.test(`${kind}: submit, lock, return with note, resubmit and approve`, async () => {
      const created = await call(tokens.EDITOR, `/api/admin/${kind}?siteId=${a.id}`, 'POST', { title: 'Review fixture', slug: `review-${kind}`, status: 'DRAFT', contentHtml: '<p>Contoh untuk ditinjau</p>' });
      assert.equal(created.status, 201);
      const route = `/api/admin/${kind}/${created.data.id}`;
      const review = route + '/review';
      const submitted = await call(tokens.EDITOR, review, 'POST', { action: 'submit', updatedAt: created.data.updatedAt });
      assert.equal(submitted.status, 200); assert.equal(submitted.data.status, 'IN_REVIEW');
      assert.equal((await call(tokens.EDITOR, review, 'POST', { action: 'approve', updatedAt: submitted.data.updatedAt })).status, 403);
      for (const role of ['EDITOR', 'PUBLISHER', 'ADMIN']) {
        assert.equal((await call(tokens[role], route, 'PUT', { title: 'Bypass', slug: 'bypass', status: 'DRAFT' })).status, 403);
        assert.equal((await call(tokens[role], route, 'DELETE')).status, 403);
      }
      const versions = await call(tokens.EDITOR, `/api/admin/versions/${kind === 'pages' ? 'PAGE' : 'POST'}/${created.data.id}`);
      assert.equal((await call(tokens.ADMIN, `/api/admin/versions/${versions.data[0].id}/restore`, 'POST')).status, 403);
      const publicList = await call(tokens.MANAGER, `/api/v1/${kind}?apiKey=${a.apiKeyPrefix}`);
      assert.ok(!publicList.data.some((item: { id: string }) => item.id === created.data.id));
      assert.equal((await call(tokens.PUBLISHER, review, 'POST', { action: 'return', updatedAt: submitted.data.updatedAt })).status, 400);
      const returned = await call(tokens.PUBLISHER, review, 'POST', { action: 'return', updatedAt: submitted.data.updatedAt, note: 'Lengkapi sumber artikel' });
      assert.equal(returned.status, 200); assert.equal(returned.data.status, 'DRAFT');
      const history = await call(tokens.EDITOR, review);
      assert.ok(history.data.some((event: { details: { note: string } }) => event.details.note === 'Lengkapi sumber artikel'));
      const again = await call(tokens.EDITOR, review, 'POST', { action: 'submit', updatedAt: returned.data.updatedAt });
      assert.equal(again.status, 200);
      assert.equal((await call(tokens.MANAGER, review, 'POST', { action: 'approve', updatedAt: created.data.updatedAt })).status, 409);
      const approved = await call(tokens.PUBLISHER, review, 'POST', { action: 'approve', updatedAt: again.data.updatedAt });
      assert.equal(approved.status, 200); assert.equal(approved.data.status, 'PUBLISHED'); assert.ok(approved.data.publishedAt);
      assert.equal((await call(tokens.PUBLISHER, review, 'POST', { action: 'approve', updatedAt: again.data.updatedAt })).status, 409);
      const cross = await call(tokens.ADMIN, `/api/admin/${kind}?siteId=${b.id}`, 'POST', { title: 'Other site', slug: `other-${kind}` });
      assert.equal((await call(tokens.EDITOR, `/api/admin/${kind}/${cross.data.id}/review`, 'POST', { action: 'submit', updatedAt: cross.data.updatedAt })).status, 403);
      assert.equal((await call(tokens.EDITOR, `/api/admin/${kind}/${cross.data.id}/review`)).status, 403);
      assert.equal((await call(tokens.PUBLISHER, `/api/admin/${kind}?siteId=${a.id}`, 'POST', { title: 'Bypass', slug: 'bypass-review', status: 'IN_REVIEW' })).status, 400);
    });
    await t.test('post updates replace tag relations atomically after content guard', async () => {
      const first = await prisma.tag.create({ data: { siteId: a.id, name: 'First', slug: 'first' } });
      const second = await prisma.tag.create({ data: { siteId: a.id, name: 'Second', slug: 'second' } });
      const created = await call(tokens.EDITOR, `/api/admin/posts?siteId=${a.id}`, 'POST', { title: 'Tags fixture', slug: 'tag-fixture', tagIds: [first.id] });
      const changed = await call(tokens.EDITOR, `/api/admin/posts/${created.data.id}`, 'PUT', { title: 'Tags fixture', slug: 'tag-fixture', tagIds: [second.id] });
      assert.equal(changed.status, 200); assert.deepEqual(changed.data.tags.map((entry: { tagId: string }) => entry.tagId), [second.id]);
    });
    await t.test('admin manages accounts, validates assignments and revokes sessions', async () => {
      const input = { name: 'New editor', email: 'new@test.local', role: 'EDITOR', siteIds: [b.id], password: 'fixture-password-123' };
      assert.equal((await call(tokens.EDITOR, '/api/admin/users', 'POST', input)).status, 403);
      assert.equal((await call(tokens.ADMIN, '/api/admin/users', 'POST', { ...input, siteIds: ['missing'] })).status, 400);
      assert.equal((await call(tokens.ADMIN, '/api/admin/users', 'POST', { ...input, password: 'short' })).status, 400);
      const created = await call(tokens.ADMIN, '/api/admin/users', 'POST', input); assert.equal(created.status, 201); assert.deepEqual(created.data.siteIds, [b.id]); assert.ok(!JSON.stringify(created.data).includes('password'));
      assert.equal((await call(tokens.ADMIN, '/api/admin/users', 'POST', input)).status, 409);
      assert.equal((await call(tokens.ADMIN, `/api/admin/users/${ids.ADMIN}`, 'PUT', { ...input, email: 'admin@test.local' })).status, 400);
      const updated = await call(tokens.ADMIN, `/api/admin/users/${ids.EDITOR}`, 'PUT', { name: 'Reassigned', email: 'editor@test.local', role: 'EDITOR', siteIds: [b.id], password: '' }); assert.equal(updated.status, 200);
      assert.equal((await call(tokens.EDITOR, '/api/admin/me')).status, 401);
      const accounts = await call(tokens.ADMIN, '/api/admin/users'); assert.ok(!JSON.stringify(accounts.data).includes('passwordHash'));
      const audit = await prisma.auditLog.findFirst({ where: { entityId: created.data.id, action: 'CREATE_USER' } }); assert.ok(audit); assert.ok(!audit.details.includes(input.password));
    });
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await prisma.$disconnect(); process.chdir(previousCwd);
    // Keep the isolated fixture under ignored .cache for inspection; never touch the real database.
  }
});
