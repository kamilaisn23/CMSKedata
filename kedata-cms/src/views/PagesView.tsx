import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  History,
  Eye,
  ArrowLeft,
  Save,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { Site } from '../components/Navbar';
import { TipTapEditor } from '../components/TipTapEditor';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../components/Toast';

interface PageItem {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  contentHtml: string;
  contentJson: string;
  status: 'DRAFT' | 'PUBLISHED';
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PagesViewProps {
  activeSite: Site | null;
}

export const PagesView: React.FC<PagesViewProps> = ({ activeSite }) => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Form Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [contentJson, setContentJson] = useState('{}');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [saving, setSaving] = useState(false);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<PageItem | null>(null);
  const [versionTarget, setVersionTarget] = useState<PageItem | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    if (activeSite) {
      loadPages();
    }
  }, [activeSite]);

  const loadPages = async () => {
    if (!activeSite) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pages?siteId=${activeSite.id}`);
      const json = await res.json();
      if (json.data) setPages(json.data);
    } catch {
      showToast('Gagal memuat daftar halaman', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setCurrentId(null);
    setTitle('');
    setSlug('');
    setContentHtml('');
    setContentJson('{}');
    setStatus('DRAFT');
    setMetaTitle('');
    setMetaDescription('');
    setOgImage('');
    setIsEditing(true);
  };

  const handleOpenEdit = (p: PageItem) => {
    setCurrentId(p.id);
    setTitle(p.title);
    setSlug(p.slug);
    setContentHtml(p.contentHtml);
    setContentJson(p.contentJson);
    setStatus(p.status);
    setMetaTitle(p.metaTitle || '');
    setMetaDescription(p.metaDescription || '');
    setOgImage(p.ogImage || '');
    setIsEditing(true);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite) return;
    if (!title || !slug) {
      showToast('Judul dan slug halaman wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        slug,
        contentHtml,
        contentJson,
        status,
        metaTitle,
        metaDescription,
        ogImage,
      };

      const url = currentId
        ? `/api/admin/pages/${currentId}`
        : `/api/admin/pages?siteId=${activeSite.id}`;
      const method = currentId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Gagal menyimpan halaman');
      }

      showToast(currentId ? 'Halaman berhasil diperbarui' : 'Halaman berhasil dibuat', 'success');
      setIsEditing(false);
      loadPages();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/pages/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      showToast('Halaman berhasil dihapus', 'success');
      setDeleteTarget(null);
      loadPages();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus halaman', 'error');
    }
  };

  const filteredPages = pages.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* View Switch: List or Editor */}
      {!isEditing ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                Halaman (Pages)
              </h1>
              <p className="text-xs text-slate-500">
                Kelola halaman statis situs {activeSite?.name} (About, Kontak, Ketentuan, dll.)
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Halaman Baru</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari berdasarkan judul atau slug..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FFFFFF] dark:bg-[#282E35] border-b border-slate-200 dark:border-[#3E4651] text-slate-500 uppercase font-bold tracking-wider">
                    <th className="p-3.5">Judul</th>
                    <th className="p-3.5">Slug</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Terakhir Diubah</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Memuat data halaman...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredPages.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Tidak ada halaman yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredPages.map((page) => (
                      <tr key={page.id} className="hover:bg-slate-50 dark:hover:bg-[#282E35]/50 transition">
                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100">
                          {page.title}
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          /{page.slug}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              page.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {page.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {new Date(page.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setVersionTarget(page)}
                              className="p-1.5 text-slate-500 hover:text-[#6C7A89] hover:bg-slate-100 dark:hover:bg-[#282E35] rounded-md transition"
                              title="Riwayat Versi & Snapshot"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(page)}
                              className="p-1.5 text-slate-500 hover:text-[#6C7A89] hover:bg-slate-100 dark:hover:bg-[#282E35] rounded-md transition"
                              title="Sunting Halaman"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(page)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition"
                              title="Hapus Halaman"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Page Form Editor */
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#6C7A89] transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Halaman</span>
            </button>

            <div className="flex items-center gap-3">
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="text-xs font-bold bg-white dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-hidden"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-lg transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Halaman'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form: Title, Slug, TipTap Content */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-xl p-5 shadow-xs flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Judul Halaman
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!currentId) setSlug(generateSlug(e.target.value));
                    }}
                    placeholder="mis. Tentang Kami"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#6C7A89]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Slug URL
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">/</span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="tentang-kami"
                      className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Konten Halaman (TipTap Rich Text)
                  </label>
                  <TipTapEditor
                    initialHtml={contentHtml}
                    onChange={(html, json) => {
                      setContentHtml(html);
                      setContentJson(JSON.stringify(json));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar Settings: SEO & Meta */}
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-xl p-5 shadow-xs flex flex-col gap-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#6C7A89]" />
                  <span>Pengaturan SEO</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Judul untuk mesin pencari"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Deskripsi ringkas untuk cuplikan Google"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Gambar OpenGraph (OG Image URL)
                  </label>
                  <input
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    placeholder="https://.../og-banner.jpg"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                  {ogImage && (
                    <img
                      src={ogImage}
                      alt="OG Preview"
                      className="mt-2 w-full h-24 object-cover rounded-md border border-slate-200"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Version History Modal */}
      {versionTarget && (
        <VersionHistoryModal
          isOpen={!!versionTarget}
          entityType="PAGE"
          entityId={versionTarget.id}
          onClose={() => setVersionTarget(null)}
          onRestored={loadPages}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Hapus Halaman"
          message={`Apakah Anda yakin ingin menghapus halaman "${deleteTarget.title}" (/pages/${deleteTarget.slug})? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
