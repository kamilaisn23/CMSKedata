import React from 'react';
import type { RecoveryDraft } from '../lib/editorDrafts';
import './editor-draft.css';

interface Props {
  recovery: RecoveryDraft<unknown> | null; savedAt: number | null; pending: boolean; error: string;
  baseUpdatedAt: string | null; onRestore: () => void; onDiscard: () => void;
}
export function EditorDraftNotice({ recovery, savedAt, pending, error, baseUpdatedAt, onRestore, onDiscard }: Props) {
  return <aside className="kd-draft-notice" aria-label="Cadangan editor">
    {error && <p role="alert">{error}</p>}
    {recovery ? <div className="kd-draft-recovery">
      <div><p>Ada salinan belum disimpan dari {new Date(recovery.savedAt).toLocaleString('id-ID')}.</p>
        {recovery.baseUpdatedAt !== baseUpdatedAt && <p>Konten server sudah berubah. Periksa perbedaannya sebelum menyimpan hasil pemulihan.</p>}
        <small>Pilih pulihkan atau buang untuk melanjutkan. Salinan hanya tersedia di browser ini dan belum mengubah konten server.</small></div>
      <div className="kd-draft-actions"><button type="button" onClick={onRestore}>Pulihkan salinan</button><button type="button" onClick={onDiscard}>Buang salinan</button></div>
    </div> : !error && <p role="status">{pending ? 'Menyiapkan cadangan…' : savedAt ? `Tersimpan di perangkat ini · ${new Date(savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : 'Perubahan dicadangkan otomatis di browser ini.'}</p>}
  </aside>;
}
