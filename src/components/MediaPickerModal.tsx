import React, { useEffect, useState } from 'react';
import { X, Search, Image as ImageIcon, Check } from 'lucide-react';

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  altText?: string;
}

export const MediaPickerModal: React.FC<{
  isOpen: boolean;
  siteId?: string;
  currentUrl?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}> = ({ isOpen, siteId, currentUrl, onSelect, onClose }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const url = siteId ? `/api/admin/media?siteId=${siteId}` : '/api/admin/media';
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setItems(
            (json.data as MediaItem[]).filter((m) => m.mimeType.startsWith('image/'))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, siteId]);

  if (!isOpen) return null;

  const filtered = items.filter(
    (m) =>
      m.originalName.toLowerCase().includes(search.toLowerCase()) ||
      (m.altText || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih Gambar dari Pustaka Media"
        className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]"
      >
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#6C7A89]" />
            <h3 className="font-medium text-base text-slate-800 dark:text-slate-100">
              Pilih Gambar dari Pustaka Media
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemilih media"
            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama berkas atau teks alternatif..."
            aria-label="Cari berkas gambar"
            className="w-full pl-9 pr-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] rounded-lg text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="overflow-y-auto flex-1 min-h-[220px]">
          {loading ? (
            <div className="py-12 text-center text-[13px] text-slate-500">
              Memuat pustaka media...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-slate-500">
              Belum ada gambar yang cocok di pustaka media situs ini.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((item) => {
                const isSelected = currentUrl === item.url;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.url);
                      onClose();
                    }}
                    className={`group text-left border rounded-lg overflow-hidden transition flex flex-col ${
                      isSelected
                        ? 'border-[#6C7A89] ring-2 ring-[#6C7A89]/30 bg-slate-50 dark:bg-[#282E35]'
                        : 'border-slate-200 dark:border-[#3E4651] hover:border-[#6C7A89]'
                    }`}
                  >
                    <div className="relative h-28 w-full bg-slate-100 dark:bg-[#171B1F] overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.altText || item.originalName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {isSelected && (
                        <span className="absolute top-2 right-2 bg-[#242a31] text-white p-1 rounded-full">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-[12px] font-medium text-slate-800 dark:text-slate-100 truncate">
                        {item.originalName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {(item.sizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
