import React, { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import './backups.css';

interface Summary { id: string; createdAt: string; bytes: number; rawBytes: number; mediaCount: number; counts: Record<string, number>; sessionsExcluded: boolean }
interface Restored { directory: string; databasePath: string; uploadsDir: string; activationRequired: boolean }
const size = (bytes: number) => `${(bytes / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 2 })} MiB`;
const time = (value: string) => new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
export function BackupsView() {
  const [items, setItems] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<Omit<Summary, 'id'> | null>(null);
  const [target, setTarget] = useState<Summary | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [restored, setRestored] = useState<Restored | null>(null);
  const { showToast } = useToast();
  async function request(url: string, options?: RequestInit) {
    const response = await fetch(`/api/admin/backups${url}`, options); const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || 'Operasi backup gagal'); return json.data;
  }
  async function load() {
    setLoading(true);
    try { setItems(await request('')); } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat backup'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function run(callback: () => Promise<void>) {
    setBusy(true); setError('');
    try { await callback(); } catch (err) { setError(err instanceof Error ? err.message : 'Operasi backup gagal'); }
    finally { setBusy(false); }
  }
  async function upload(action: 'inspect' | 'import') {
    if (!file) return;
    if (file.size > 96 * 1024 * 1024) { setError('File melebihi batas 96 MiB'); return; }
    await run(async () => {
      const body = new FormData(); body.set('file', file);
      const data = await request(`/${action}`, { method: 'POST', body });
      if (action === 'inspect') setInspection(data);
      else { setInspection(null); showToast('Backup terverifikasi berhasil diimpor', 'success'); await load(); }
    });
  }
  return <section className="kd-backups">
    <header><div><h1>Backup & Pemulihan</h1><p>Salinan database dan media seluruh workspace. Hanya admin pusat yang dapat mengaksesnya.</p></div><button type="button" disabled={busy} onClick={() => void run(async () => { await request('', { method: 'POST' }); showToast('Backup berhasil dibuat', 'success'); await load(); })}>{busy ? 'Memproses…' : 'Buat backup'}</button></header>
    <p className="kd-backup-help">Backup menyimpan hingga 64 MiB data. Penyimpanan konten ditahan sementara saat salinan dibuat. Unduh paket dan simpan di tempat pribadi terpisah; paket berisi data workspace sensitif.</p>
    {error && <p role="alert" className="kd-backup-error">{error} <button type="button" disabled={busy} onClick={() => { setError(''); void load(); }}>Muat ulang daftar</button></p>}
    {loading ? <p role="status">Memuat backup…</p> : <div className="kd-backup-table"><table><thead><tr><th>Dibuat (WIB)</th><th>Konten</th><th>Media</th><th>Ukuran</th><th>Tindakan</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><time dateTime={item.createdAt}>{time(item.createdAt)}</time></td><td>{item.counts.Post || 0} artikel · {item.counts.Page || 0} halaman</td><td>{item.mediaCount} file</td><td>{size(item.bytes)}</td><td><div className="kd-backup-actions"><a href={`/api/admin/backups/${item.id}/download`} download>Unduh</a><button type="button" disabled={busy} onClick={() => { setTarget(item); setConfirmation(''); setRestored(null); }}>Pulihkan</button></div></td></tr>)}</tbody></table>{!items.length && <p className="kd-backup-empty">Belum ada backup. Buat salinan pertama sebelum melakukan perubahan besar.</p>}</div>}
    <section className="kd-backup-section"><h2>Periksa atau impor file backup</h2><p>Pilih paket .kdbackup.gz. Ukuran, checksum, database, dan media diperiksa sebelum paket dapat diimpor.</p>
      <label htmlFor="backup-file">File backup (maksimum 96 MiB)</label><input id="backup-file" type="file" accept=".gz,.kdbackup.gz" disabled={busy} onChange={event => { setFile(event.target.files?.[0] || null); setInspection(null); setError(''); }} />
      <button type="button" disabled={!file || busy} onClick={() => void upload('inspect')}>Periksa file</button>
      {inspection && <div className="kd-backup-result" role="status"><strong>Paket valid · {time(inspection.createdAt)}</strong><p>{inspection.counts.Site || 0} situs · {inspection.counts.Post || 0} artikel · {inspection.counts.Page || 0} halaman · {inspection.mediaCount} media</p><p>Sesi login tidak dipulihkan.</p><button type="button" disabled={busy} onClick={() => void upload('import')}>Impor backup ini</button></div>}
    </section>
    {target && <section className="kd-backup-section"><h2>Pemulihan dari {time(target.createdAt)}</h2><p>Paket diperiksa kembali lalu dipulihkan ke folder baru. Data aktif tetap utuh. Aktivasi hasil pemulihan memerlukan perubahan konfigurasi dan restart oleh pengelola server.</p>
      <form onSubmit={event => { event.preventDefault(); void run(async () => { const data = await request(`/${target.id}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation }) }); setRestored(data); showToast('Folder hasil pemulihan siap diperiksa', 'success'); }); }}>
        <label htmlFor="backup-confirm">Ketik PULIHKAN</label><input id="backup-confirm" value={confirmation} disabled={busy} autoComplete="off" onChange={event => setConfirmation(event.target.value)} />
        <div className="kd-backup-actions"><button type="submit" disabled={busy || confirmation !== 'PULIHKAN'}>Pulihkan ke folder baru</button><button type="button" disabled={busy} onClick={() => { setTarget(null); setRestored(null); }}>Tutup</button></div>
      </form>
      {restored && <div className="kd-backup-result" role="status"><h3>Hasil pemulihan siap</h3><p>Folder: <code>{restored.directory}</code></p><p>Untuk aktivasi oleh pengelola server:</p><pre>{`DATABASE_URL=file:${restored.databasePath.replaceAll('\\', '/')}
UPLOADS_DIR=${restored.uploadsDir.replaceAll('\\', '/')}`}</pre><p>Hentikan server sebelum mengganti konfigurasi, lalu mulai kembali dan login. Konfigurasi serta folder lama dapat digunakan untuk rollback.</p></div>}
    </section>}
  </section>;
}
