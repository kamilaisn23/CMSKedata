import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { DatabaseSync, backup } from 'node:sqlite';

// Migrates the local SQLite database (read-only snapshot) into a hosted
// PostgreSQL database (Neon) for the Vercel variant.
//
// Usage:
//   node scripts/migrate-vercel.mjs --database-url "postgres://user:pass@host/db?sslmode=require"
//
// The local SQLite database is only read (via a snapshot in .backups),
// never modified. The generated client lands in hosting/vercel/generated-migrate
// so the main app's @prisma/client (SQLite) stays untouched.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function argValue(name) {
  const argv = process.argv;
  const equals = argv.find(a => a === `--${name}=` || a.startsWith(`--${name}=`));
  if (equals) return equals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
}

const targetUrl = argValue('database-url') || process.env.DATABASE_URL_POSTGRES;
if (!targetUrl || !/^postgres(ql)?:\/\//.test(targetUrl)) {
  console.error('Berikan URL PostgreSQL tujuan: node scripts/migrate-vercel.mjs --database-url "postgres://..."');
  process.exit(1);
}

const envText = fs.readFileSync(path.join(root, '.env'), 'utf8');
const sourceUrl = envText.match(/^DATABASE_URL\s*=\s*["']?(file:[^"'\r\n]+)/m)?.[1];
if (!sourceUrl) throw new Error('SQLite DATABASE_URL tidak ditemukan di .env; tidak ada data yang dipindahkan');
const sourcePath = path.resolve(root, 'prisma', sourceUrl.slice(5));
if (!fs.existsSync(sourcePath)) throw new Error(`Database sumber tidak ditemukan: ${sourcePath}`);

fs.mkdirSync(path.join(root, '.backups', 'vercel-migration'), { recursive: true });
const snapshot = path.join(root, '.backups', 'vercel-migration', `source-${Date.now()}.sqlite`);
{
  const db = new DatabaseSync(sourcePath, { readOnly: true });
  try { await backup(db, snapshot); } finally { db.close(); }
}
console.log(`Snapshot sumber (read-only): ${snapshot}`);

const generatedClient = path.join(root, 'hosting', 'generated-migrate', 'index.js');
if (!fs.existsSync(generatedClient)) {
  console.log('Membuat klien Prisma PostgreSQL untuk migrasi...');
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'generate', '--schema', 'hosting/vercel/schema.prisma', '--generator', 'clientMigrate'], { cwd: root, stdio: 'inherit' });
}
const { PrismaClient } = await import('file:///' + generatedClient.replaceAll('\\', '/'));
const prisma = new PrismaClient({ datasourceUrl: targetUrl });

// Create the tables in the target database (idempotent; does not touch rows).
console.log('Membuat skema tabel di database tujuan...');
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'db', 'push', '--schema', 'hosting/vercel/schema.prisma', '--skip-generate'], { cwd: root, stdio: 'inherit', env: { ...process.env, DATABASE_URL: targetUrl } });

const tables = [
  ['site', 'Site'],
  ['user', 'User'],
  ['siteSetting', 'SiteSetting'],
  ['siteMembership', 'SiteMembership'],
  ['session', 'Session'],
  ['category', 'Category'],
  ['tag', 'Tag'],
  ['page', 'Page'],
  ['post', 'Post'],
  ['postTag', 'PostTag'],
  ['contentVersion', 'ContentVersion'],
  ['media', 'Media'],
  ['menu', 'Menu'],
  ['auditLog', 'AuditLog'],
];

const existingUsers = await prisma.user.count();
if (existingUsers > 0 && !process.argv.includes('--force')) {
  console.error(`Database tujuan sudah berisi ${existingUsers} user. Gunakan --force untuk menimpa data duplikat, atau pilih database kosong.`);
  await prisma.$disconnect();
  process.exit(1);
}
if (existingUsers > 0) {
  console.log('--force: menghapus data lama terlebih dahulu...');
  for (const [model] of [...tables].reverse()) await prisma[model].deleteMany();
}

const db = new DatabaseSync(snapshot, { readOnly: true });
try {
  for (const [model, table] of tables) {
    const rows = db.prepare(`SELECT * FROM "${table}"`).all();
    if (!rows.length) { console.log(`${table}: 0 baris (dilewati)`); continue; }
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (/At$/.test(key) && typeof row[key] === 'number') row[key] = new Date(row[key]);
      }
    }
    await prisma[model].createMany({ data: rows });
    console.log(`${table}: ${rows.length} baris dimigrasikan`);
  }
} finally {
  db.close();
  await prisma.$disconnect();
}

console.log('\nMigrasi selesai. Langkah berikutnya (lihat hosting/vercel/DEPLOY.md):');
console.log('  1. Set DATABASE_URL di Vercel ke URL PostgreSQL yang sama.');
console.log('  2. Deploy ulang /api, lalu uji /health dan login dengan akun CMS lama Anda.');
