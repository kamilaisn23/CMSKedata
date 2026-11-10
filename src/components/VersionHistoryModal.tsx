import React, { useState, useEffect } from 'react';
import { History, RotateCcw, X, Clock, Check, Eye } from 'lucide-react';
import { useToast } from './Toast';

interface VersionItem {
  id: string;
  versionNumber: number;
  title: string;
  contentHtml: string;
  createdBy: string;
  createdAt: string;
  snapshotData: string;
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  entityType: 'PAGE' | 'POST';
  entityId: string;
  onClose: () => void;
  onRestored: () => void;
  canRestore?: boolean;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  entityType,
  entityId,
  onClose,
  onRestored,
  canRestore = true,
}) => {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && entityId) {
      fetchVersions();
    }
  }, [isOpen, entityId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/versions/${entityType}/${entityId}`);
      const json = await res.json();
      if (json.data) {
        setVersions(json.data);
        if (json.data.length > 0) {
          setSelectedVersion(json.data[0]);
        }
      }
    } catch {
      showToast('Gagal memuat riwayat versi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: VersionItem) => {
    if (!window.confirm(`Kembalikan konten ke versi #${version.versionNumber}? Versi saat ini akan disimpan sebagai snapshot baru.`)) {
      return;
    }

    setRestoring(true);
    try {
      const res = await fetch(`/api/admin/versions/${version.id}/restore`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      showToast(`Berhasil memulihkan ke versi #${version.versionNumber}`, 'success');
      onRestored();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal memulihkan versi', 'error');
    } finally {
      setRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#3E4651] bg-[#FFFFFF] dark:bg-[#282E35]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#6C7A89]" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100">
              Riwayat Versi {entityType === 'PAGE' ? 'Halaman' : 'Artikel'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Version List Sidebar */}
          <div className="w-72 border-r border-slate-200 dark:border-[#3E4651] overflow-y-auto p-3 flex flex-col gap-2 bg-[#FFFFFF] dark:bg-[#23282F]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
              Daftar Snapshot ({versions.length})
            </span>

            {loading && <div className="text-xs text-slate-400 p-3">Memuat snapshot...</div>}
            {!loading && versions.length === 0 && (
              <div className="text-xs text-slate-500 p-4 text-center">
                Belum ada snapshot tersimpan. Snapshot dibuat otomatis setiap kali Anda memperbarui konten.
              </div>
            )}

            {versions.map((ver) => {
              const isSelected = selectedVersion?.id === ver.id;
              return (
                <button
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver)}
                  className={`text-left p-3 rounded-lg border text-sm transition flex flex-col gap-1 ${
                    isSelected
                      ? 'border-[#6C7A89] bg-white dark:bg-[#1E2328] shadow-xs'
                      : 'border-transparent hover:bg-slate-100/50 dark:hover:bg-[#282E35] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#6C7A89] dark:text-[#8E9BA9]">
                      Versi #{ver.versionNumber}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ver.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="font-medium text-xs line-clamp-1">{ver.title}</div>
                  <div className="text-[10px] text-slate-400">Oleh: {ver.createdBy || 'Admin'}</div>
                </button>
              );
            })}
          </div>

          {/* Version Preview Area */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-white dark:bg-[#1E2328]">
            {selectedVersion ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-[#3E4651]">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {selectedVersion.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Disimpan pada {new Date(selectedVersion.createdAt).toLocaleString()} oleh {selectedVersion.createdBy}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(selectedVersion)}
                    disabled={restoring || !canRestore}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-md transition shadow-xs disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {restoring ? 'Memulihkan...' : 'Kembalikan ke Versi Ini'}
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Pratinjau Konten HTML
                  </h4>
                  <div
                    className="prose prose-slate dark:prose-invert max-w-none p-4 rounded-lg border border-slate-200 dark:border-[#3E4651] bg-[#FFFFFF] dark:bg-[#23282F] text-sm"
                    dangerouslySetInnerHTML={{ __html: selectedVersion.contentHtml || '<em>(Konten kosong)</em>' }}
                  />
                </div>
              </div>
            ) : (
              <div className="m-auto text-slate-400 text-sm">Pilih versi di sisi kiri untuk melihat pratinjau.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-[#3E4651] bg-[#FFFFFF] dark:bg-[#282E35] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 dark:bg-[#343C45] dark:text-slate-200 dark:hover:bg-[#3E4651] rounded-md transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
