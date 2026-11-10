import type { RequestHandler } from 'express';

let paused = false;
let activeWrites = 0;
export class BackupError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const trackAdminWrites: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || /^\/backups(?:\/|$)/.test(req.path)) return next();
  if (paused) { res.status(503).json({ data: null, error: { code: 'BACKUP_IN_PROGRESS', message: 'Backup sedang berjalan. Coba simpan kembali sebentar lagi.' } }); return; }
  activeWrites++;
  let finished = false;
  const finish = () => { if (!finished) { finished = true; activeWrites--; } };
  res.once('finish', finish); res.once('close', finish); next();
};
export async function withWritePause<T>(operation: () => Promise<T>, timeoutMs = 15_000) {
  if (paused) throw new BackupError('Operasi backup lain sedang berjalan', 409);
  paused = true;
  try {
    const deadline = Date.now() + timeoutMs;
    while (activeWrites) {
      if (Date.now() > deadline) throw new BackupError('Masih ada penyimpanan berlangsung. Coba backup kembali.', 409);
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    return await operation();
  } finally { paused = false; }
}
