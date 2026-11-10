import path from 'node:path';

export function dataPaths(root = process.cwd()) {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith('file:')) throw new Error('Backup versi ini memerlukan SQLite DATABASE_URL file:');
  const uploadsDir = path.resolve(root, process.env.UPLOADS_DIR || 'public/uploads');
  const backupsDir = path.resolve(root, process.env.BACKUPS_DIR || '.backups');
  const publicDir = path.resolve(root, 'public');
  const inside = (parent: string, child: string) => { const relative = path.relative(parent, child); return !relative || (!relative.startsWith('..') && !path.isAbsolute(relative)); };
  if (inside(publicDir, backupsDir) || inside(uploadsDir, backupsDir) || inside(backupsDir, uploadsDir)) throw new Error('Folder backup harus privat dan terpisah dari public/uploads');
  return { databasePath: path.resolve(root, 'prisma', url.slice(5)), uploadsDir, backupsDir };
}
