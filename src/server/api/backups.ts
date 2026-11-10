import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db.js';
import { dataPaths } from '../data-paths.js';
import { BackupStore, PACKAGE_LIMIT } from '../backups.js';
import { BackupError, withWritePause } from '../write-pause.js';
import { requestUser } from '../access.js';

export const backupsRouter = express.Router();
const onVercel = !!process.env.VERCEL;
if (onVercel) {
  backupsRouter.use((req, res) => {
    if (requestUser(req).role !== 'ADMIN') { res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'Hanya admin pusat yang dapat mengelola backup' } }); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ data: null, error: { code: 'BACKUP_UNAVAILABLE', message: 'Backup berbasis file tidak tersedia di Vercel. Gunakan fitur ekspor penyedia database Anda, atau varian Node/InfinityFree.' } });
  });
} else {
  const paths = dataPaths();
  const store = new BackupStore(paths);
  const incoming = path.join(paths.backupsDir, '.incoming');
  const upload = multer({ storage: multer.diskStorage({ destination: (_req, _file, cb) => {
    try { fs.mkdirSync(incoming, { recursive: true }); if (fs.lstatSync(incoming).isSymbolicLink() || fs.lstatSync(paths.backupsDir).isSymbolicLink()) throw new BackupError('Folder upload tidak aman'); cb(null, incoming); }
    catch (error) { cb(error as Error, incoming); }
  }, filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.upload`) }), limits: { fileSize: PACKAGE_LIMIT, files: 1, fields: 0 } }).single('file');
  let busy = false;
  async function operation<T>(callback: () => Promise<T>) {
    if (busy) throw new BackupError('Operasi backup lain sedang berjalan', 409);
    busy = true; try { return await callback(); } finally { busy = false; }
  }
  async function audit(req: express.Request, action: string, id: string, details: Record<string, unknown>) {
    await prisma.auditLog.create({ data: { actor: requestUser(req).email, action, entityType: 'Backup', entityId: id, details: JSON.stringify(details), ipAddress: req.ip } }).catch(() => { console.error('Backup audit recording failed'); });
  }
  backupsRouter.use((req, res, next) => {
    if (requestUser(req).role !== 'ADMIN') { res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'Hanya admin pusat yang dapat mengelola backup' } }); return; }
    res.setHeader('Cache-Control', 'no-store'); next();
  });
  backupsRouter.get('/', (_req, res, next) => { store.list().then(data => res.json({ data, error: null })).catch(next); });
  backupsRouter.post('/', (req, res, next) => {
    operation(() => withWritePause(async () => {
      const data = await store.create(); await audit(req, 'CREATE_BACKUP', data.id, { mediaCount: data.mediaCount, bytes: data.bytes }); return data;
    })).then(data => res.status(201).json({ data, error: null })).catch(next);
  });
  backupsRouter.get('/:id/download', (req, res, next) => {
    store.downloadPath(req.params.id).then(filename => res.download(filename, `kedata-cms-${req.params.id}.kdbackup.gz`, error => { if (error) next(error); })).catch(next);
  });
  for (const action of ['inspect', 'import'] as const) backupsRouter.post(`/${action}`, (req, res, next) => {
    upload(req, res, error => {
      if (error) return next(error);
      const file = req.file;
      if (!file) return next(new BackupError('Pilih file backup terlebih dahulu'));
      operation(async () => {
        const data = action === 'inspect' ? await store.inspect(file.path) : await store.importUpload(file.path);
        if ('id' in data && typeof data.id === 'string') await audit(req, 'CREATE_BACKUP', data.id, { imported: true, bytes: data.bytes });
        return data;
      }).then(data => res.status(action === 'import' ? 201 : 200).json({ data, error: null })).catch(next).finally(() => fs.promises.unlink(file.path).catch(() => {}));
    });
  });
  backupsRouter.post('/:id/restore', (req, res, next) => {
    if (!z.object({ confirmation: z.literal('PULIHKAN') }).safeParse(req.body).success) return next(new BackupError('Ketik PULIHKAN untuk menyiapkan pemulihan'));
    operation(async () => { const data = await store.restore(req.params.id); await audit(req, 'PREPARE_RESTORE', req.params.id, { activationRequired: true }); return data; }).then(data => res.json({ data, error: null })).catch(next);
  });
  backupsRouter.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    const status = error instanceof BackupError ? error.status : error instanceof multer.MulterError ? error.code === 'LIMIT_FILE_SIZE' ? 413 : 400 : 500;
    res.status(status).json({ data: null, error: { code: status === 500 ? 'INTERNAL_ERROR' : 'BACKUP_ERROR', message: error instanceof BackupError ? error.message : status === 413 ? 'File backup melebihi batas 96 MiB' : status === 400 ? 'Upload backup tidak valid' : 'Operasi backup gagal. Periksa penyimpanan server.' } });
  });
}
