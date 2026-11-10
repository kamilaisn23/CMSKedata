import React, { useEffect, useId, useRef, useState } from 'react';
import { canPublish } from '../lib/access';
import { useToast } from './Toast';
import './content-review.css';

interface Content { id: string; title: string; contentHtml: string; status: string; updatedAt: string }
interface ReviewEvent { id: string; action: string; actor: string; createdAt: string; details: { note?: string } }
export function ContentReview({ kind, content, role, onChanged }: { kind: 'pages' | 'posts'; content: Content; role: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ReviewEvent[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { showToast } = useToast();
  const url = `/api/admin/${kind}/${content.id}/review`;
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const controller = new AbortController();
    setLoading(true); setError(''); setNote(''); setHistory([]);
    fetch(url, { signal: controller.signal }).then(async response => {
      const json = await response.json(); if (!response.ok) throw new Error(json.error?.message || 'Gagal memuat riwayat');
      setHistory(json.data);
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, url]);
  async function decide(action: 'submit' | 'approve' | 'return') {
    if (action === 'return' && !note.trim()) { setError('Catatan pengembalian wajib diisi'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, updatedAt: content.updatedAt, note }) });
      const json = await response.json();
      if (!response.ok) { if (response.status === 409) onChanged(); throw new Error(json.error?.message || 'Gagal memproses review'); }
      showToast(action === 'submit' ? 'Konten diajukan untuk review' : action === 'approve' ? 'Konten disetujui dan diterbitkan' : 'Konten dikembalikan ke draf', 'success');
      setOpen(false); onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memproses review'); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" className="kd-review-trigger" onClick={() => setOpen(true)}>{content.status === 'DRAFT' ? 'Ajukan review' : content.status === 'IN_REVIEW' ? 'Tinjau' : 'Riwayat review'}</button>
    {open && <dialog ref={dialog} className="kd-review-dialog" aria-labelledby={titleId} onCancel={event => { if (busy) event.preventDefault(); else setOpen(false); }}>
      <header><h2 id={titleId}>Review: {content.title}</h2><button type="button" disabled={busy} onClick={() => setOpen(false)} aria-label="Tutup review">Tutup</button></header>
      <p>Versi tersimpan di server · {content.status === 'IN_REVIEW' ? 'Menunggu persetujuan' : content.status}</p>
      <div className="kd-review-preview prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: content.contentHtml || '<p>Konten kosong.</p>' }} />
      <h3>Riwayat peninjauan</h3>
      {loading ? <p role="status">Memuat riwayat…</p> : !history.length ? <p>Belum ada peninjauan.</p> : <ul>{history.map(event => <li key={event.id}><strong>{event.action === 'SUBMIT_REVIEW' ? 'Diajukan' : event.action === 'APPROVE_REVIEW' ? 'Disetujui' : 'Dikembalikan'}</strong> · {event.actor} · {new Date(event.createdAt).toLocaleString('id-ID')}{event.details.note && <p>{event.details.note}</p>}</li>)}</ul>}
      {error && <p className="kd-review-error" role="alert">{error}</p>}
      {content.status === 'DRAFT' && <footer><button type="button" disabled={busy || loading} onClick={() => void decide('submit')}>{busy ? 'Mengirim…' : 'Kirim untuk ditinjau'}</button></footer>}
      {content.status === 'IN_REVIEW' && (canPublish(role) ? <>
        <label htmlFor={`${titleId}-note`}>Catatan (wajib untuk pengembalian)</label>
        <textarea id={`${titleId}-note`} maxLength={2000} disabled={busy} value={note} onChange={event => setNote(event.target.value)} />
        <footer><button type="button" disabled={busy || loading} onClick={() => void decide('approve')}>Setujui & terbitkan</button><button type="button" disabled={busy || loading} onClick={() => void decide('return')}>Kembalikan ke draf</button></footer>
      </> : <p role="status">Menunggu keputusan penerbit. Konten dikunci selama review.</p>)}
    </dialog>}
  </>;
}
