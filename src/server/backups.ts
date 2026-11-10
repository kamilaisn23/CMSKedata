import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync, backup } from 'node:sqlite';
import { gzipSync, gunzipSync } from 'node:zlib';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { BackupError } from './write-pause.js';

export const RAW_LIMIT = 64 * 1024 * 1024;
export const PACKAGE_LIMIT = 96 * 1024 * 1024;
const idSchema = z.string().uuid();
const fileSchema = z.object({ name: z.string().max(200), size: z.number().int().nonnegative().max(RAW_LIMIT), sha256: z.string().regex(/^[a-f0-9]{64}$/), data: z.string().max(PACKAGE_LIMIT) }).strict();
const envelope = z.object({ app: z.literal('kedata-cms'), version: z.literal(1), createdAt: z.string().datetime(), database: fileSchema, media: z.array(fileSchema).max(10_000) }).strict();
const summarySchema = z.object({ id: idSchema, createdAt: z.string().datetime(), bytes: z.number().nonnegative(), rawBytes: z.number().nonnegative(), mediaCount: z.number().int().nonnegative(), counts: z.record(z.string(), z.number().nonnegative()), sessionsExcluded: z.literal(true) }).strict();
export interface BackupSummary { id: string; createdAt: string; bytes: number; rawBytes: number; mediaCount: number; counts: Record<string, number>; sessionsExcluded: true }
type Payload = z.infer<typeof envelope>;
const hash = (data: Buffer) => crypto.createHash('sha256').update(data).digest('hex');
export function safeMediaName(name: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(name) && !name.endsWith('.') && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name);
}
const pack = (name: string, data: Buffer) => ({ name, size: data.length, sha256: hash(data), data: data.toString('base64') });
function unpack(file: Payload['database']) {
  const buffer = Buffer.from(file.data, 'base64');
  if (buffer.toString('base64') !== file.data || buffer.length !== file.size || hash(buffer) !== file.sha256) throw new BackupError('Checksum atau ukuran file backup tidak cocok');
  return buffer;
}

function inspectDatabase(filename: string, mediaNames: Set<string>, clearSessions = false) {
  const db = new DatabaseSync(filename, { readOnly: !clearSessions });
  try {
    db.exec('PRAGMA trusted_schema=OFF;');
    const schema = db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all() as { type: string; name: string; sql: string | null }[];
    const models = Prisma.dmmf.datamodel.models;
    const allowed = new Set([...models.map(model => model.dbName || model.name), '_prisma_migrations']);
    if (schema.some(row => ['view', 'trigger'].includes(row.type) || /CREATE\s+VIRTUAL/i.test(row.sql || '') || (row.type === 'table' && !allowed.has(row.name)))) throw new BackupError('Schema backup mengandung objek yang tidak didukung');
    for (const model of models) {
      const table = model.dbName || model.name;
      const columns = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
      const expected = model.fields.filter(field => field.kind !== 'object').map(field => field.dbName || field.name);
      if (columns.length !== expected.length || expected.some(column => !columns.some(actual => actual.name === column))) throw new BackupError('Versi schema backup tidak cocok dengan CMS saat ini');
    }
    if (Object.values(db.prepare('PRAGMA integrity_check').get() || {})[0] !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) throw new BackupError('Integritas database backup gagal');
    const media = db.prepare('SELECT filename,url FROM Media').all() as { filename: string; url: string }[];
    if (media.some(file => !safeMediaName(file.filename) || (file.url.startsWith('/uploads/') && (file.url !== `/uploads/${file.filename}` || !mediaNames.has(file.filename))))) throw new BackupError('File media yang dirujuk database tidak lengkap atau tidak aman');
    if (clearSessions) db.exec('PRAGMA secure_delete=ON; DELETE FROM Session; VACUUM;');
    const counts: Record<string, number> = {};
    for (const table of ['Site', 'Post', 'Page', 'Media', 'User']) counts[table] = Number(db.prepare(`SELECT COUNT(*) AS total FROM "${table}"`).get()!.total);
    return counts;
  } finally { db.close(); }
}

export class BackupStore {
  private staging: string;
  constructor(private paths: { databasePath: string; uploadsDir: string; backupsDir: string }) { this.staging = path.join(paths.backupsDir, '.staging'); }
  private async prepare() {
    await fs.mkdir(this.paths.backupsDir, { recursive: true });
    if ((await fs.lstat(this.paths.backupsDir)).isSymbolicLink()) throw new BackupError('Folder backup tidak boleh berupa symlink');
    await fs.mkdir(this.staging, { recursive: true });
    if ((await fs.lstat(this.staging)).isSymbolicLink()) throw new BackupError('Folder staging tidak boleh berupa symlink');
  }
  private file(id: string, suffix: string) { if (!idSchema.safeParse(id).success) throw new BackupError('Backup tidak ditemukan', 404); return path.join(this.paths.backupsDir, id + suffix); }
  private async regularFile(filename: string) {
    let stat;
    try { stat = await fs.lstat(filename); } catch { throw new BackupError('File tidak ditemukan', 404); }
    if (!stat.isFile() || stat.isSymbolicLink()) throw new BackupError('Jenis file tidak didukung');
    return stat;
  }
  private async cleanup(folder: string) {
    const relative = path.relative(path.resolve(this.staging), path.resolve(folder));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Staging path tidak aman');
    await fs.rm(folder, { recursive: true, force: true });
  }
  async list(): Promise<BackupSummary[]> {
    await this.prepare(); const result: BackupSummary[] = [];
    for (const item of await fs.readdir(this.paths.backupsDir, { withFileTypes: true })) {
      if (!item.isFile() || !item.name.endsWith('.json') || !idSchema.safeParse(item.name.slice(0, -5)).success) continue;
      try {
        const summary = summarySchema.parse(JSON.parse(await fs.readFile(path.join(this.paths.backupsDir, item.name), 'utf8')));
        const stat = await this.regularFile(this.file(item.name.slice(0, -5), '.kdbackup.gz'));
        if (summary.id === item.name.slice(0, -5) && stat.size === summary.bytes) result.push(summary);
      } catch { /* Incomplete packages are not presented as restorable backups. */ }
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async downloadPath(id: string) { const filename = this.file(id, '.kdbackup.gz'); await this.regularFile(filename); return filename; }
  async create(): Promise<BackupSummary> {
    await this.prepare(); const id = crypto.randomUUID(); const folder = path.join(this.staging, id); await fs.mkdir(folder);
    try {
      const database = path.join(folder, 'database.sqlite');
      const sourceStat = await this.regularFile(this.paths.databasePath);
      if (sourceStat.size > RAW_LIMIT) throw new BackupError('Database melebihi batas backup 64 MiB', 413);
      const source = new DatabaseSync(this.paths.databasePath, { readOnly: true });
      try {
        const databaseBytes = Number(source.prepare('PRAGMA page_count').get()!.page_count) * Number(source.prepare('PRAGMA page_size').get()!.page_size);
        if (databaseBytes > RAW_LIMIT) throw new BackupError('Database melebihi batas backup 64 MiB', 413);
        await backup(source, database);
      } finally { source.close(); }
      let rawBytes = (await fs.stat(database)).size;
      if (rawBytes > RAW_LIMIT) throw new BackupError('Database melebihi batas backup 64 MiB', 413);
      const media: Payload['media'] = [];
      const names = new Set<string>();
      const entries = await fs.readdir(this.paths.uploadsDir, { withFileTypes: true });
      if (entries.length > 10_000) throw new BackupError('Terlalu banyak file media', 413);
      for (const entry of entries) {
        if (!entry.isFile() || !safeMediaName(entry.name) || names.has(entry.name.toLowerCase())) throw new BackupError('Folder media harus berisi file reguler dengan nama aman/unik, tanpa subfolder atau symlink');
        names.add(entry.name.toLowerCase());
        const filename = path.join(this.paths.uploadsDir, entry.name); const stat = await this.regularFile(filename);
        rawBytes += stat.size; if (rawBytes > RAW_LIMIT) throw new BackupError('Data melebihi batas backup 64 MiB', 413);
        media.push(pack(entry.name, await fs.readFile(filename)));
      }
      const counts = inspectDatabase(database, new Set(media.map(file => file.name)), true);
      const payload: Payload = { app: 'kedata-cms', version: 1, createdAt: new Date().toISOString(), database: pack('database.sqlite', await fs.readFile(database)), media };
      return await this.persist(payload, folder, counts, id);
    } finally { await this.cleanup(folder); }
  }
  private async persist(payload: Payload, folder: string, counts: Record<string, number>, id = crypto.randomUUID()) {
    const encoded = Buffer.from(JSON.stringify(payload)); if (encoded.length > PACKAGE_LIMIT) throw new BackupError('Paket backup terlalu besar', 413);
    const compressed = gzipSync(encoded); if (compressed.length > PACKAGE_LIMIT) throw new BackupError('Paket backup terlalu besar', 413);
    const summary: BackupSummary = { id, createdAt: payload.createdAt, bytes: compressed.length, rawBytes: payload.database.size + payload.media.reduce((sum, file) => sum + file.size, 0), mediaCount: payload.media.length, counts, sessionsExcluded: true };
    await fs.writeFile(path.join(folder, 'package.gz'), compressed, { flag: 'wx' });
    await fs.writeFile(path.join(folder, 'summary.json'), JSON.stringify(summary), { flag: 'wx' });
    await fs.rename(path.join(folder, 'package.gz'), this.file(id, '.kdbackup.gz'));
    await fs.rename(path.join(folder, 'summary.json'), this.file(id, '.json'));
    return summary;
  }
  private async validate(filename: string) {
    await this.prepare(); const stat = await this.regularFile(filename);
    if (stat.size > PACKAGE_LIMIT) throw new BackupError('Paket melebihi batas 96 MiB', 413);
    let payload: Payload;
    try { payload = envelope.parse(JSON.parse(gunzipSync(await fs.readFile(filename), { maxOutputLength: PACKAGE_LIMIT }).toString('utf8'))); }
    catch { throw new BackupError('Paket rusak, terlalu besar, atau format tidak didukung'); }
    if (payload.database.name !== 'database.sqlite') throw new BackupError('Nama database tidak valid');
    const rawBytes = payload.database.size + payload.media.reduce((sum, file) => sum + file.size, 0);
    if (rawBytes > RAW_LIMIT) throw new BackupError('Data melebihi batas 64 MiB', 413);
    const names = new Set<string>();
    for (const file of payload.media) {
      if (!safeMediaName(file.name) || names.has(file.name.toLowerCase())) throw new BackupError('Nama file media tidak aman atau duplikat');
      names.add(file.name.toLowerCase());
    }
    const folder = path.join(this.staging, crypto.randomUUID()); await fs.mkdir(folder);
    try {
      const database = path.join(folder, 'database.sqlite'); await fs.writeFile(database, unpack(payload.database), { flag: 'wx' });
      const uploads = path.join(folder, 'uploads'); await fs.mkdir(uploads);
      for (const file of payload.media) await fs.writeFile(path.join(uploads, file.name), unpack(file), { flag: 'wx' });
      const counts = inspectDatabase(database, new Set(payload.media.map(file => file.name)), true);
      return { folder, payload, summary: { createdAt: payload.createdAt, bytes: stat.size, rawBytes, mediaCount: payload.media.length, counts, sessionsExcluded: true as const } };
    } catch (error) { await this.cleanup(folder); if (error instanceof BackupError) throw error; throw new BackupError('Database atau file dalam backup tidak valid'); }
  }
  async inspect(filename: string) { const validated = await this.validate(filename); try { return validated.summary; } finally { await this.cleanup(validated.folder); } }
  async importUpload(filename: string) {
    const validated = await this.validate(filename);
    try {
      validated.payload.database = pack('database.sqlite', await fs.readFile(path.join(validated.folder, 'database.sqlite')));
      return await this.persist(validated.payload, validated.folder, validated.summary.counts);
    } finally { await this.cleanup(validated.folder); }
  }
  async restore(id: string) {
    const validated = await this.validate(await this.downloadPath(id));
    try {
      const restored = path.join(this.paths.backupsDir, 'restored'); await fs.mkdir(restored, { recursive: true });
      if ((await fs.lstat(restored)).isSymbolicLink()) throw new BackupError('Folder restore tidak boleh berupa symlink');
      const target = path.join(restored, crypto.randomUUID());
      const relative = path.relative(path.resolve(this.paths.backupsDir), path.resolve(target));
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Tujuan restore tidak aman');
      const sourceRelative = path.relative(path.resolve(this.staging), path.resolve(validated.folder));
      if (!sourceRelative || sourceRelative.startsWith('..') || path.isAbsolute(sourceRelative)) throw new Error('Sumber restore tidak aman');
      await fs.rename(validated.folder, target);
      return { ...validated.summary, directory: target, databasePath: path.join(target, 'database.sqlite'), uploadsDir: path.join(target, 'uploads'), activationRequired: true };
    } finally { await this.cleanup(validated.folder); }
  }
}
