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
import { canEditContent, canPublish } from '../lib/access';
import { PageDraftSchema, draftKey } from '../lib/editorDrafts';
import { useEditorDraft } from '../hooks/useEditorDraft';
import { EditorDraftNotice } from '../components/EditorDraftNotice';
import { ContentReview } from '../components/ContentReview';
import { MediaPickerModal } from '../components/MediaPickerModal';

interface PageItem {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  contentHtml: string;
  contentJson: string;
  status: 'DRAFT' | 'PUBLISHED' | 'IN_REVIEW';
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PagesViewProps {
  activeSite: Site | null;
  role: string;
  userId: string;
  initialEditId?: string | null;
  onClearInitialEdit?: () => void;
}

export const PagesView: React.FC<PagesViewProps> = ({ activeSite, role, userId, initialEditId, onClearInitialEdit }) => {
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
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const { showToast } = useToast();
  const baseUpdatedAt = pages.find(page => page.id === currentId)?.updatedAt || null;
  const draft = useEditorDraft({
    storageKey: draftKey(userId, activeSite?.id || '', 'PAGE', currentId), enabled: isEditing && !!activeSite,
    baseUpdatedAt, schema: PageDraftSchema,
    data: { title, slug, contentHtml, contentJson, status, metaTitle, metaDescription, ogImage },
  });
  const restoreDraft = () => {
    const value = draft.restore();
    if (!value) return;
    setTitle(value.title); setSlug(value.slug); setContentHtml(value.contentHtml); setContentJson(value.contentJson);
    setStatus(canPublish(role) ? value.status : 'DRAFT');
    setMetaTitle(value.metaTitle); setMetaDescription(value.metaDescription); setOgImage(value.ogImage);
  };

  useEffect(() => {
    if (activeSite) {
      loadPages();
    }
  }, [activeSite]);

  useEffect(() => {
    if (!initialEditId || pages.length === 0) return;
    const matched = pages.find((p) => p.id === initialEditId);
    if (matched) {
      if (canEditContent(role, matched.status)) {
        handleOpenEdit(matched);
      }
      onClearInitialEdit?.();
    }
  }, [initialEditId, pages]);

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
    if (p.status === 'IN_REVIEW') return;
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

  useEffect(() => {
    if (!initialEditId || loading) return;
    const page = pages.find(item => item.id === initialEditId && item.siteId === activeSite?.id);
    if (!page) return;
    if (canEditContent(role, page.status)) handleOpenEdit(page);
    else showToast('Halaman ini tidak dapat disunting dengan peran atau status sekarang', 'info');
    onClearInitialEdit?.();
  }, [initialEditId, pages, loading, activeSite?.id, role]);

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
      draft.savedToServer();
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
    <div className="cms-page p-6 flex flex-col gap-6">
      {/* View Switch: List or Editor */}
      {!isEditing ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                Halaman
              </h1>
              <p className="text-[13px] text-slate-500">
                Kelola halaman statis situs {activeSite?.name} (About, Kontak, Ketentuan, dll.)
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-[#242a31] hover:bg-[#3a424c] rounded-lg transition  cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Halaman Baru</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] cms-filter-bar rounded-lg p-3 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari berdasarkan judul atau slug..."
                className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden"
              />
            </div>

            <select aria-label="Filter status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="IN_REVIEW">Menunggu review</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Table */}
          <p className="cms-list-summary" aria-live="polite">{loading ? 'Memuat halaman…' : `${filteredPages.length} dari ${pages.length} halaman`}</p>
          <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg  overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#FFFFFF] dark:bg-[#282E35] border-b border-slate-200 dark:border-[#3E4651] text-slate-500 font-medium">
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
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Memuat data halaman...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredPages.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Tidak ada halaman yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredPages.map((page) => (
                      <tr key={page.id} className="hover:bg-slate-50 dark:hover:bg-[#282E35]/50 transition">
                        <td className="p-3.5 font-medium text-slate-800 dark:text-slate-100">
                          {page.title}
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[13px]">
                          /{page.slug}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[13px] font-medium ${
                              page.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : page.status === 'IN_REVIEW'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {page.status === 'IN_REVIEW' ? 'Menunggu review' : page.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {new Date(page.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <ContentReview kind="pages" content={page} role={role} onChanged={loadPages} />
                            <button
                              onClick={() => setVersionTarget(page)}
                              className="inline-flex items-center justify-center min-w-8 min-h-8 p-2 text-slate-500 hover:text-[#6C7A89] hover:bg-slate-100 dark:hover:bg-[#282E35] rounded-md transition"
                              title="Riwayat Versi & Snapshot"
                              aria-label={`Riwayat versi ${page.title}`}
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(page)}
                              disabled={!canEditContent(role, page.status)}
                              className="inline-flex items-center justify-center min-w-8 min-h-8 p-2 text-slate-500 hover:text-[#6C7A89] hover:bg-slate-100 dark:hover:bg-[#282E35] rounded-md transition"
                              title="Sunting Halaman"
                              aria-label={`Sunting halaman ${page.title}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(page)}
                              disabled={!canEditContent(role, page.status)}
                              className="inline-flex items-center justify-center min-w-8 min-h-8 p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition"
                              title="Hapus Halaman"
                              aria-label={`Hapus halaman ${page.title}`}
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
          <EditorDraftNotice {...draft} baseUpdatedAt={baseUpdatedAt} onRestore={restoreDraft} onDiscard={draft.discard} />
          <div inert={!!draft.recovery || saving} className="flex min-w-0 flex-col gap-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:text-[#6C7A89] transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Halaman</span>
            </button>

            <div className="flex items-center gap-3">
              <select aria-label="Status publikasi"
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="text-[13px] font-medium bg-white dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-hidden"
              >
                <option value="DRAFT">Draft</option>
                {canPublish(role) && <option value="PUBLISHED">Published</option>}
              </select>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-[#242a31] hover:bg-[#3a424c] rounded-lg transition  disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Halaman'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form: Title, Slug, TipTap Content */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-5  flex flex-col gap-4">
                <div>
                  <label htmlFor="cms-pagesview-1" className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Judul Halaman
                  </label>
                  <input id="cms-pagesview-1"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!currentId) setSlug(generateSlug(e.target.value));
                    }}
                    placeholder="mis. Tentang Kami"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#6C7A89]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Slug URL
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-mono text-slate-500">/</span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="tentang-kami"
                      className="flex-1 px-3 py-2 text-[13px] font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
              <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-5  flex flex-col gap-4">
                <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#6C7A89]" />
                  <span>Pengaturan SEO</span>
                </h3>

                <div>
                  <label htmlFor="cms-pagesview-2" className="block text-[13px] font-semibold text-slate-600 dark:text-slate-500 mb-1">
                    Meta Title
                  </label>
                  <input id="cms-pagesview-2"
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Judul untuk mesin pencari"
                    className="w-full px-3 py-1.5 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label htmlFor="cms-pagesview-3" className="block text-[13px] font-semibold text-slate-600 dark:text-slate-500 mb-1">
                    Meta Description
                  </label>
                  <textarea id="cms-pagesview-3"
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Deskripsi ringkas untuk cuplikan Google"
                    className="w-full px-3 py-1.5 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="cms-pagesview-4" className="block text-[13px] font-semibold text-slate-600 dark:text-slate-500">
                      Gambar OpenGraph (OG Image URL)
                    </label>
                    <button
                      type="button"
                      onClick={() => setMediaPickerOpen(true)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#6C7A89] hover:text-[#4F5A66] dark:text-[#8E9BA9] cursor-pointer"
                    >
                      <span>Pilih dari Media</span>
                    </button>
                  </div>
                  <input id="cms-pagesview-4"
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    placeholder="https://.../og-banner.jpg"
                    className="w-full px-3 py-1.5 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
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
          </div>
        </form>
      )}

      {/* Version History Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        siteId={activeSite?.id}
        currentUrl={ogImage}
        onSelect={(url) => setOgImage(url)}
        onClose={() => setMediaPickerOpen(false)}
      />

      {versionTarget && (
        <VersionHistoryModal
          canRestore={canEditContent(role, versionTarget.status)}
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
