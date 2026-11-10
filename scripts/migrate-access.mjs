// Node 24+: apply only the additive access migration to an existing SQLite database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, backup } from 'node:sqlite';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env'), quiet: true });
const url = process.env.DATABASE_URL;
if (!url?.startsWith('file:')) throw new Error('Migrasi ini hanya mendukung SQLite DATABASE_URL file:.');
const databasePath = path.resolve(root, 'prisma', url.slice(5));
if (!fs.existsSync(databasePath)) throw new Error('Database belum ada; migrasi tidak akan membuat atau seed database kosong.');
const db = new DatabaseSync(databasePath);
try {
  for (const table of ['User', 'Site']) {
    if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)) throw new Error('Schema dasar CMS tidak ditemukan.');
  }
  if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='SiteMembership'").get()) {
    console.log('Tabel penugasan sudah tersedia; tidak ada perubahan.');
  } else {
    const directory = path.join(root, '.cache', 'migration-backups');
    fs.mkdirSync(directory, { recursive: true });
    await backup(db, path.join(directory, `before-access-${Date.now()}.db`));
    db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE;');
    try {
      db.exec(fs.readFileSync(path.join(root, 'prisma/migrations/202611090001_site_membership/migration.sql'), 'utf8'));
      db.exec('COMMIT;');
    } catch (error) { db.exec('ROLLBACK;'); throw error; }
    console.log('Migrasi penugasan situs berhasil. Backup konsisten tersimpan di .cache/migration-backups.');
  }
} finally { db.close(); }
