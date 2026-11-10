import { useLayoutEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import { EditorDraftSession, type RecoveryDraft } from '../lib/editorDrafts';

export function useEditorDraft<T>({ storageKey, enabled, data, baseUpdatedAt, schema }: {
  storageKey: string; enabled: boolean; data: T; baseUpdatedAt: string | null; schema: z.ZodType<T>;
}) {
  const session = useRef<EditorDraftSession<T> | null>(null);
  const [recovery, setRecovery] = useState<RecoveryDraft<T> | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const serialized = JSON.stringify(data);
  const reportError = (err: unknown) => setError(err instanceof Error && !('name' in err && err.name === 'QuotaExceededError')
    ? err.message : 'Cadangan gagal disimpan. Penyimpanan browser mungkin penuh. Salin tulisan sebelum meninggalkan editor.');

  useLayoutEffect(() => {
    if (!enabled) return;
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* Show a visible error when browser storage is disabled. */ }
    let current: EditorDraftSession<T>;
    let initializationError: unknown;
    try { current = new EditorDraftSession(storage, storageKey, JSON.parse(serialized), baseUpdatedAt, schema); }
    catch (err) { current = new EditorDraftSession<T>(null, storageKey, JSON.parse(serialized), baseUpdatedAt, schema); initializationError = err; }
    session.current = current; setRecovery(current.recovery); setSavedAt(null); setPending(false);
    if (initializationError) reportError(initializationError);
    else if (!storage) setError('Penyimpanan browser tidak tersedia. Salin tulisan sebelum meninggalkan editor.');
    else setError('');
    const flush = () => {
      try { current.flush(); setSavedAt(current.savedAt); setPending(false); setError(''); return true; }
      catch (err) { reportError(err); return false; }
    };
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (!flush()) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('visibilitychange', hide);
    return () => {
      try { current.flush(); } catch { /* Failure is already visible while editing; browser leave is guarded above. */ }
      if (session.current === current) session.current = null;
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [storageKey, enabled]);

  useLayoutEffect(() => {
    const current = session.current;
    if (!enabled || !current) return;
    current.update(JSON.parse(serialized));
    if (current.recovery) return;
    setPending(true);
    const timeout = window.setTimeout(() => {
      try { current.flush(); setSavedAt(current.savedAt); setError(''); }
      catch (err) { reportError(err); }
      setPending(false);
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [storageKey, enabled, serialized]);

  return {
    recovery, savedAt, pending, error,
    restore: () => { const value = session.current?.restore(); setRecovery(null); setSavedAt(session.current?.savedAt || null); return value; },
    discard: () => {
      try { session.current?.discardRecovery(); setRecovery(null); session.current?.flush(); setSavedAt(session.current?.savedAt || null); setError(''); }
      catch (err) { reportError(err); }
    },
    savedToServer: () => {
      try { session.current?.savedToServer(data); } catch (err) { reportError(err); }
    },
  };
}
