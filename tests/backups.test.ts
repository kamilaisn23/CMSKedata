import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import express from 'express';
import { BackupStore, RAW_LIMIT, safeMediaName } from '../src/server/backups.js';
import { trackAdminWrites, withWritePause } from '../src/server/write-pause.js';
import { dataPaths } from '../src/server/data-paths.js';

test('backup/restore round trip validates SQLite/media and never overwrites active data', async t => {
  const root = fileURLToPath(new URL('../', import.meta.url)); await fs.mkdir(path.join(root, '.cache'), { recursive: true });
  const scratch = await fs.mkdtemp(path.join(root, '.cache', 'backup-test-'));
  const databasePath = path.join(scratch, 'active.sqlite'); const uploadsDir = path.join(scratch, 'uploads');
  await fs.mkdir(uploadsDir); const bytes = Buffer.from('fixture-image-bytes'); await fs.writeFile(path.join(uploadsDir, 'image.jpg'), bytes);
  const sql = execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', path.join(root, 'prisma/schema.prisma'), '--script'], { encoding: 'utf8', stdio: 'pipe' });
  const active = new DatabaseSync(databasePath); active.exec(sql); active.exec('PRAGMA journal_mode=WAL;');
  active.prepare('INSERT INTO User(id,email,name,passwordHash,role,updatedAt) VALUES(?,?,?,?,?,?)').run('user', 'fixture@test.local', 'Admin', 'fixture-hash', 'ADMIN', Date.now());
  active.prepare('INSERT INTO Session(id,token,userId,expiresAt) VALUES(?,?,?,?)').run('session', 'fixture-session-token', 'user', Date.now() + 86400000);
  active.prepare('INSERT INTO Site(id,name,slug,domain,apiKeyHash,apiKeyPrefix,updatedAt) VALUES(?,?,?,?,?,?,?)').run('site', 'Fixture', 'fixture', 'fixture.test', 'hash', 'prefix', Date.now());
  active.prepare('INSERT INTO Media(id,siteId,filename,originalName,mimeType,sizeBytes,url,updatedAt) VALUES(?,?,?,?,?,?,?,?)').run('media', 'site', 'image.jpg', 'image.jpg', 'image/jpeg', bytes.length, '/uploads/image.jpg', Date.now());
  const store = new BackupStore({ databasePath, uploadsDir, backupsDir: path.join(scratch, 'private-backups') });
  try {
    const created = await withWritePause(() => store.create()); const filename = await store.downloadPath(created.id);
    assert.equal(created.mediaCount, 1); assert.equal(created.counts.Site, 1);
    assert.equal((await store.list()).length, 1);
    assert.equal((await store.inspect(filename)).counts.Media, 1);
    const restored = await store.restore(created.id);
    assert.equal(restored.activationRequired, true); assert.notEqual(restored.databasePath, databasePath);
    const db = new DatabaseSync(restored.databasePath, { readOnly: true });
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM Session').get()!.n, 0); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM Site').get()!.n, 1); db.close();
    assert.deepEqual(await fs.readFile(path.join(restored.uploadsDir, 'image.jpg')), bytes);
    assert.equal(active.prepare('SELECT COUNT(*) AS n FROM Session').get()!.n, 1); assert.deepEqual(await fs.readFile(path.join(uploadsDir, 'image.jpg')), bytes);
    assert.notEqual((await store.restore(created.id)).directory, restored.directory);
    const imported = await store.importUpload(filename); assert.notEqual(imported.id, created.id); assert.equal((await store.list()).length, 2);
    await assert.rejects(store.downloadPath('../../database.sqlite'), /tidak ditemukan/);
    const original = JSON.parse(gunzipSync(await fs.readFile(filename)).toString());
    async function badPackage(name: string, mutate: (value: any) => void) {
      const payload = structuredClone(original); mutate(payload); const target = path.join(scratch, `${name}.gz`); await fs.writeFile(target, gzipSync(JSON.stringify(payload))); return target;
    }
    await t.test('corrupt bytes, checksums, paths, reserved names and case duplicates are rejected', async () => {
      const broken = path.join(scratch, 'broken.gz'); await fs.writeFile(broken, 'not a backup'); await assert.rejects(store.inspect(broken));
      for (const [index, name] of ['../escape.jpg', '/absolute.jpg', 'CON.jpg', 'x.jpg.', '..', 'x\\evil.jpg'].entries()) {
        assert.equal(safeMediaName(name), false); await assert.rejects(store.inspect(await badPackage(`path-${index}`, value => { value.media[0].name = name; })));
      }
      await assert.rejects(store.inspect(await badPackage('checksum', value => { value.media[0].sha256 = '0'.repeat(64); })), /Checksum/);
      await assert.rejects(store.inspect(await badPackage('duplicate', value => { value.media.push({ ...value.media[0], name: 'IMAGE.JPG' }); })), /duplikat/);
      await assert.rejects(store.inspect(await badPackage('missing-media', value => { value.media = []; })), /media/);
      await assert.rejects(store.inspect(await badPackage('oversize', value => { value.media[0].size = RAW_LIMIT; })), (error: any) => error.status === 413);
    });
    await t.test('schema changes, SQL triggers and invalid foreign keys are rejected', async () => {
      for (const [index, statement] of ['CREATE TRIGGER unwanted AFTER INSERT ON Post BEGIN SELECT 1; END;', 'ALTER TABLE Site ADD COLUMN extra TEXT;', "PRAGMA foreign_keys=OFF; INSERT INTO SiteMembership(userId,siteId) VALUES('missing','site');"].entries()) {
        const poison = path.join(scratch, `poison-${index}.sqlite`); await fs.copyFile(restored.databasePath, poison);
        const db = new DatabaseSync(poison); db.exec(statement); db.close();
        const buffer = await fs.readFile(poison);
        const changed = await badPackage(`schema-${index}`, value => { value.database = { name: 'database.sqlite', size: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), data: buffer.toString('base64') }; });
        await assert.rejects(store.inspect(changed));
      }
      assert.deepEqual(await fs.readdir(path.join(scratch, 'private-backups/.staging')), []);
    });
  } finally { active.close(); }
});

test('backup write pause drains pending writes, rejects new writes, and releases after failure', async () => {
  const app = express(); app.use(trackAdminWrites);
  let release: (() => void) | undefined;
  let started: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { started = resolve; });
  app.post('/write', (req, res) => { if (req.query.hold) { release = () => res.json({ ok: true }); started!(); } else res.json({ ok: true }); });
  app.get('/read', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}`;
  try {
    const pending = fetch(`${base}/write?hold=1`, { method: 'POST' }); await waiting;
    let operationStarted = false; const paused = withWritePause(async () => { operationStarted = true; });
    assert.equal(operationStarted, false); assert.equal((await fetch(`${base}/write`, { method: 'POST' })).status, 503);
    assert.equal((await fetch(`${base}/read`)).status, 200);
    release!(); await pending; await paused; assert.equal(operationStarted, true);
    await assert.rejects(withWritePause(async () => { throw new Error('fixture failure'); }));
    assert.equal((await fetch(`${base}/write`, { method: 'POST' })).status, 200);
  } finally { release?.(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('backup configuration rejects public/nested storage directories', () => {
  const previous = { database: process.env.DATABASE_URL, backups: process.env.BACKUPS_DIR, uploads: process.env.UPLOADS_DIR };
  try {
    process.env.DATABASE_URL = 'file:./fixture.sqlite'; process.env.BACKUPS_DIR = 'public/backups'; delete process.env.UPLOADS_DIR;
    assert.throws(() => dataPaths(process.cwd()), /privat/);
    process.env.BACKUPS_DIR = '.backups'; process.env.UPLOADS_DIR = '.backups/media'; assert.throws(() => dataPaths(process.cwd()), /terpisah/);
  } finally {
    for (const [key, value] of [['DATABASE_URL', previous.database], ['BACKUPS_DIR', previous.backups], ['UPLOADS_DIR', previous.uploads]]) { if (value === undefined) delete process.env[key!]; else process.env[key!] = value; }
  }
});
