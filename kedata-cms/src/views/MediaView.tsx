import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  File,
  FileText,
  Trash2,
  Copy,
  Check,
  Edit2,
  ExternalLink,
  X,
  Search,
} from 'lucide-react';
import { Site } from '../components/Navbar';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../components/Toast';

interface MediaItem {
  id: string;
  siteId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  altText?: string;
  caption?: string;
  createdAt: string;
}

export const MediaView: React.FC<{ activeSite: Site | null }> = ({ activeSite }) => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  // Selected media for inspector / edit
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadMedia();
  }, [activeSite]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const url = activeSite ? `/api/admin/media?siteId=${activeSite.id}` : '/api/admin/media';
      const res = await fetch(url);
      const json = await res.json();
      if (json.data) setMediaList(json.data);
    } catch {
      showToast('Gagal memuat pustaka media', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Client-side whitelist & 5MB size limit validation
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      showToast('File ditolak: Hanya JPG, PNG, WEBP, dan PDF yang diizinkan.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File terlalu besar: Maksimal ukuran file adalah 5 MB.', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (activeSite) formData.append('siteId', activeSite.id);

    try {
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Unggah gagal');

      showToast(`Berkas ${file.name} berhasil diunggah`, 'success');
      loadMedia();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedMedia) return;
    try {
      const res = await fetch(`/api/admin/media/${selectedMedia.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altText: editAlt, caption: editCaption }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      showToast('Metadata berkas disimpan', 'success');
      setSelectedMedia(null);
      loadMedia();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/media/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      showToast('Berkas berhasil dihapus', 'success');
      if (selectedMedia?.id === deleteTarget.id) setSelectedMedia(null);
      setDeleteTarget(null);
      loadMedia();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    showToast('Tautan berkas berhasil disalin ke clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredMedia = mediaList.filter((m) =>
    m.originalName.toLowerCase().includes(search.toLowerCase()) ||
    m.filename.toLowerCase().includes(search.toLowerCase()) ||
    (m.altText && m.altText.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            Media Library
          </h1>
          <p className="text-xs text-slate-500">
            Unggah dan kelola gambar dan dokumen digital (JPG, PNG, WEBP, PDF - Maks 5MB)
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? 'Mengunggah...' : 'Unggah Berkas Baru'}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-xl p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari media berdasarkan nama atau deskripsi..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {loading && (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">
            Memuat pustaka berkas...
          </div>
        )}
        {!loading && filteredMedia.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">
            Belum ada berkas media diunggah. Klik tombol "Unggah Berkas Baru" di atas.
          </div>
        )}
        {!loading &&
          filteredMedia.map((media) => {
            const isImage = media.mimeType.startsWith('image/');
            const isPdf = media.mimeType === 'application/pdf';
            const isSelected = selectedMedia?.id === media.id;

            return (
              <div
                key={media.id}
                onClick={() => {
                  setSelectedMedia(media);
                  setEditAlt(media.altText || '');
                  setEditCaption(media.caption || '');
                }}
                className={`group relative bg-white dark:bg-[#1E2328] border rounded-xl overflow-hidden shadow-xs hover:border-[#6C7A89] transition cursor-pointer flex flex-col ${
                  isSelected ? 'ring-2 ring-[#6C7A89] border-transparent' : 'border-slate-200 dark:border-[#3E4651]'
                }`}
              >
                {/* Media Preview Box */}
                <div className="h-32 bg-slate-100 dark:bg-[#282E35] flex items-center justify-center overflow-hidden relative">
                  {isImage ? (
                    <img
                      src={media.url}
                      alt={media.altText || media.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : isPdf ? (
                    <div className="flex flex-col items-center gap-1 text-rose-500">
                      <FileText className="w-10 h-10" />
                      <span className="text-[10px] font-bold">PDF DOCUMENT</span>
                    </div>
                  ) : (
                    <File className="w-8 h-8 text-slate-400" />
                  )}

                  {/* Quick Action Overlay */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyUrl(media.url, media.id);
                      }}
                      className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-md shadow-xs"
                      title="Salin URL"
                    >
                      {copiedId === media.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(media);
                      }}
                      className="p-1.5 bg-white/90 hover:bg-white text-rose-600 rounded-md shadow-xs"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Media Info */}
                <div className="p-2.5 flex flex-col gap-0.5">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={media.originalName}>
                    {media.originalName}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{formatBytes(media.sizeBytes)}</span>
                    <span className="uppercase">{media.mimeType.split('/')[1]}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Media Details / Edit Inspector Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Detail Berkas Media
              </h3>
              <button onClick={() => setSelectedMedia(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-[#282E35] rounded-xl p-4 border border-slate-200 dark:border-[#3E4651]">
                {selectedMedia.mimeType.startsWith('image/') ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.altText || ''}
                    className="max-h-56 max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-rose-500 py-10">
                    <FileText className="w-16 h-16" />
                    <span className="font-bold text-xs">{selectedMedia.originalName}</span>
                  </div>
                )}

                <a
                  href={selectedMedia.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 text-xs text-[#6C7A89] flex items-center gap-1 hover:underline"
                >
                  <span>Buka di tab baru</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    Nama Asli
                  </label>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-mono break-all mt-0.5">
                    {selectedMedia.originalName}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    Nama Tersimpan
                  </label>
                  <p className="text-xs text-slate-500 font-mono break-all mt-0.5">
                    {selectedMedia.filename}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    URL Publik
                  </label>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="text"
                      readOnly
                      value={selectedMedia.url}
                      className="flex-1 px-2.5 py-1 text-xs bg-slate-100 dark:bg-[#282E35] rounded border border-slate-300 font-mono text-slate-700 dark:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(selectedMedia.url, selectedMedia.id)}
                      className="px-2.5 py-1 text-xs bg-[#6C7A89] text-white rounded hover:bg-[#5a6775]"
                    >
                      Salin
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alt Text (Aksesibilitas & SEO)
                  </label>
                  <input
                    type="text"
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    placeholder="Deskripsi gambar..."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Caption
                  </label>
                  <input
                    type="text"
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="Keterangan teks..."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3 border-slate-200 dark:border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedMedia)}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Berkas Ini</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMedia(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSaveMetadata}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#6C7A89] rounded-lg hover:bg-[#5a6775]"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Hapus Media"
          message={`Yakin ingin menghapus berkas "${deleteTarget.originalName}"? Berkas fisik akan dihapus dari server.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
