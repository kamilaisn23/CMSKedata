import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, backup } from 'node:sqlite';
import { Prisma } from '@prisma/client';
import { build, mergeConfig } from 'vite';
import { build as bundle } from 'esbuild';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
fs.mkdirSync('.cache/infinityfree-build', { recursive: true });
async function loadTs(entry, name) {
  const outfile=path.resolve('.cache/infinityfree-build',name+'.mjs');
  await bundle({entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',packages:'external',define:{__dirname:JSON.stringify(root)}});
  return import('file:///'+outfile.replaceAll('\\','/'));
}
const {default:baseConfig}=await loadTs('vite.config.ts','vite-config');
const {openapiSpec}=await loadTs('src/server/openapi.ts','openapi');
const {accessOpenapiSpec}=await loadTs('src/server/access-openapi.ts','admin-openapi');
const base = 'hosting/infinityfree';
const privateDir = `${base}/htdocs/cms-private`;
const output = 'artifacts/infinityfree';
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync('.backups/infinityfree-migration', { recursive: true });
const models = Prisma.dmmf.datamodel.models;
const schema = {};
const indexed = new Set(['id', 'siteId', 'userId', 'postId', 'tagId', 'categoryId', 'slug', 'email', 'token', 'apiKeyHash', 'entityType', 'entityId','status','role','location']);
const q = name => '`' + name.replaceAll('`', '``') + '`';
const sql = ['-- Kedata CMS / MySQL, import into a NEW empty database.', 'SET NAMES utf8mb4;'];
const foreign = [];
for (const model of models) {
  const fields = model.fields.filter(f => f.kind !== 'object');
  schema[model.name] = fields.map(f => ({ name: f.name, type: f.type, required: f.isRequired, default: f.default ?? null, updated: f.isUpdatedAt }));
  const columns = fields.map(f => `${q(f.name)} ${f.type === 'Int' ? 'INT' : indexed.has(f.name) ? 'VARCHAR(191) COLLATE utf8mb4_bin' : f.type === 'DateTime' ? 'VARCHAR(32)' : 'LONGTEXT'} ${f.isRequired ? 'NOT NULL' : 'NULL'}`);
  const pk = model.primaryKey?.fields || fields.filter(f => f.isId).map(f => f.name);
  columns.push(`PRIMARY KEY (${pk.map(q).join(',')})`);
  const uniques = [...fields.filter(f => f.isUnique).map(f => [f.name]), ...model.uniqueFields];
  for (const keys of uniques) columns.push(`UNIQUE KEY ${q(keys.join('_'))} (${keys.map(q).join(',')})`);
  if (fields.some(f => f.name === 'siteId') && !uniques.some(k => k[0] === 'siteId') && pk[0] !== 'siteId') columns.push('KEY `siteId_index` (`siteId`)');
  if (model.name === 'ContentVersion') columns.push('KEY `entity_index` (`entityType`,`entityId`)');
  for (const f of model.fields.filter(f => f.kind === 'object' && f.relationFromFields?.length)) {
    foreign.push(`ALTER TABLE ${q(model.name)} ADD CONSTRAINT ${q(model.name + '_' + f.name + '_fk')} FOREIGN KEY (${f.relationFromFields.map(q)}) REFERENCES ${q(f.type)} (${f.relationToFields.map(q)}) ON DELETE ${f.relationOnDelete === 'SetNull' ? 'SET NULL' : 'CASCADE'};`);
  }
  sql.push(`CREATE TABLE ${q(model.name)} (\n${columns.map(c => '  ' + c).join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
}
sql.push(...foreign, 'CREATE TABLE `CmsRate` (`bucket` VARCHAR(191) PRIMARY KEY, `hits` INT NOT NULL, `expires` BIGINT NOT NULL) ENGINE=InnoDB;', 'CREATE TABLE `CmsLock` (`id` INT PRIMARY KEY) ENGINE=InnoDB;', 'INSERT INTO `CmsLock` (`id`) VALUES (1);');
fs.writeFileSync(`${privateDir}/models.json`, JSON.stringify(schema, null, 2));
fs.writeFileSync(`${base}/schema.sql`, sql.join('\n\n') + '\n');
fs.writeFileSync(`${privateDir}/schema.php`, "<?php\nreturn <<<'KEDATA_SCHEMA'\n" + sql.join('\n\n') + '\nKEDATA_SCHEMA;\n');

// Export a consistent, read-only snapshot. Never seed or mutate the source DB.
const envText = fs.readFileSync('.env', 'utf8');
const url = envText.match(/^DATABASE_URL\s*=\s*["']?(file:[^"'\r\n]+)/m)?.[1];
if (!url) throw Error('SQLite DATABASE_URL not found; no data was exported');
const sourcePath = path.resolve('prisma', url.slice(5));
const snapshot = `.backups/infinityfree-migration/source-${Date.now()}.sqlite`;
const db = new DatabaseSync(sourcePath, { readOnly: true });
try { await backup(db, snapshot); } finally { db.close(); }
const source = new DatabaseSync(snapshot, { readOnly: true });
const dataSQL = ['-- PRIVATE: import in phpMyAdmin after schema.sql; NEVER upload into htdocs.', '-- Existing users and password hashes retained; sessions excluded.', 'SET NAMES utf8mb4;', 'SET FOREIGN_KEY_CHECKS=0;', 'START TRANSACTION;'];
const counts = {};
const valueSQL = value => value === null ? 'NULL' : typeof value === 'number' || typeof value === 'bigint' ? String(value) : String(value) === '' ? "''" : `CONVERT(0x${Buffer.from(String(value)).toString('hex')} USING utf8mb4)`;
try {
  for (const model of models.filter(m => m.name !== 'Session')) {
    const fields = schema[model.name];
    const rows = source.prepare(`SELECT * FROM ${q(model.name)}`).all();
    counts[model.name] = rows.length;
    for (const row of rows) {
      for (const f of fields.filter(f => f.type === 'DateTime')) if (row[f.name] !== null) row[f.name] = new Date(typeof row[f.name] === 'bigint' ? Number(row[f.name]) : row[f.name]).toISOString();
      dataSQL.push(`INSERT INTO ${q(model.name)} (${fields.map(f => q(f.name)).join(',')}) VALUES (${fields.map(f => valueSQL(row[f.name])).join(',')});`);
    }
  }
} finally { source.close(); }
dataSQL.push('COMMIT;', 'SET FOREIGN_KEY_CHECKS=1;');
fs.writeFileSync('.backups/infinityfree-migration/import-current-data.sql', dataSQL.join('\n') + '\n');
fs.writeFileSync('.backups/infinityfree-migration/counts.json', JSON.stringify(counts, null, 2));

await build(mergeConfig(typeof baseConfig === 'function' ? baseConfig({ command: 'build', mode: 'production' }) : baseConfig, {
  configFile: false,
  plugins: [{ name: 'infinityfree-backup-screen', enforce: 'pre', load(id) {
    if (id.replaceAll('\\', '/').endsWith('/src/views/BackupsView.tsx')) return fs.readFileSync(`${base}/BackupsView.tsx`, 'utf8');
  } }],
  build: { outDir: `${output}/frontend`, emptyOutDir: true, chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks(id) {
      if (!id.includes('node_modules')) return;
      if (/tiptap|prosemirror/.test(id)) return 'editor';
      if (/motion/.test(id)) return 'motion';
      if (/react|scheduler/.test(id)) return 'react';
      if (/lucide/.test(id)) return 'icons';
      return 'vendor';
    } } }
  }
}));
const release = `${output}/package`;
fs.mkdirSync(`${release}/htdocs`, { recursive: true });
fs.cpSync(`${output}/frontend`, `${release}/htdocs`, { recursive: true });
fs.cpSync(`${base}/htdocs`, `${release}/htdocs`, { recursive: true, filter: file => !['config.php'].includes(path.basename(file)) });
// Never expose the setup config as a static example on a live site.
fs.writeFileSync(`${release}/htdocs/openapi.json`, JSON.stringify({ ...openapiSpec, servers: [{ url: '/api/v1' }] }, null, 2));
fs.writeFileSync(`${release}/htdocs/admin-openapi.json`, JSON.stringify(accessOpenapiSpec, null, 2));
fs.copyFileSync(`${base}/schema.sql`, `${release}/schema.sql`);
fs.copyFileSync('docs/INFINITYFREE.md', `${release}/PANDUAN-UPLOAD.md`);
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(f => f.isDirectory() ? walk(path.join(dir, f.name)) : [path.join(dir, f.name)]);
for (const file of walk(`${release}/htdocs`)) {
  const rel = path.relative(`${release}/htdocs`, file).replaceAll('\\', '/');
  if (/(^|\/)(\.env.*|\.git|node_modules|config\.php|cookies\.txt)$|\.(sqlite|db|sql|log|zip|gz)$/i.test(rel)) throw Error(`Private file in release: ${rel}`);
  const size = fs.statSync(file).size;
  if (size > (/\.(html|php|js)$/i.test(file) ? 1_000_000 : 10_000_000)) throw Error(`File exceeds hosting limit: ${rel}`);
}
const result = spawnSync('php', [`${base}/zip-release.php`, path.resolve(release), path.resolve(`${output}/CSM-InfinityFree-upload.zip`)], { encoding: 'utf8' });
if (result.status !== 0) throw Error(result.stderr || result.stdout);
console.log(JSON.stringify({ zip: `${output}/CSM-InfinityFree-upload.zip`, migration: '.backups/infinityfree-migration/import-current-data.sql', counts }, null, 2));
