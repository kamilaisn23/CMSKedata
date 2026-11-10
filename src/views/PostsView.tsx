import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  History,
  ArrowLeft,
  Save,
  Globe,
  Calendar,
  Tag as TagIcon,
  Folder,
  Image as ImageIcon,
} from 'lucide-react';
import { Site } from '../components/Navbar';
import { TipTapEditor } from '../components/TipTapEditor';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { canEditContent, canPublish } from '../lib/access';
import { PostDraftSchema, draftKey } from '../lib/editorDrafts';
import { useEditorDraft } from '../hooks/useEditorDraft';
import { EditorDraftNotice } from '../components/EditorDraftNotice';
import { ContentReview } from '../components/ContentReview';
import { MediaPickerModal } from '../components/MediaPickerModal';

interface PostItem {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  excerpt?: string;
  contentHtml: string;
  contentJson: string;
  featuredImage?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'IN_REVIEW';
  categoryId?: string;
  category?: { id: string; name: string };
  tags?: { tag: { id: string; name: string } }[];
  scheduledAt?: string;
  publishedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  createdAt: string;
  updatedAt: string;
}

interface PostsViewProps {
  activeSite: Site | null;
  role: string;
  userId: string;
  initialEditId?: string | null;
  onClearInitialEdit?: () => void;
}

export const PostsView: React.FC<PostsViewProps> = ({ activeSite, role, userId, initialEditId, onClearInitialEdit }) => {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [availableTags, setAvailableTags] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [contentJson, setContentJson] = useState('{}');
  const [featuredImage, setFeaturedImage] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>('DRAFT');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [saving, setSaving] = useState(false);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<PostItem | null>(null);
  const [versionTarget, setVersionTarget] = useState<PostItem | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const { showToast } = useToast();
  const baseUpdatedAt = posts.find(post => post.id === currentId)?.updatedAt || null;
  const draft = useEditorDraft({
    storageKey: draftKey(userId, activeSite?.id || '', 'POST', currentId), enabled: isEditing && !!activeSite,
    baseUpdatedAt, schema: PostDraftSchema,
    data: { title, slug, excerpt, contentHtml, contentJson, featuredImage, status, categoryId,
      tagIds: selectedTagIds, scheduledAt, metaTitle, metaDescription, ogImage },
  });
  const restoreDraft = () => {
    const value = draft.restore();
    if (!value) return;
    setTitle(value.title); setSlug(value.slug); setExcerpt(value.excerpt);
    setContentHtml(value.contentHtml); setContentJson(value.contentJson); setFeaturedImage(value.featuredImage);
    setStatus(canPublish(role) ? value.status : 'DRAFT'); setCategoryId(value.categoryId);
    setSelectedTagIds(value.tagIds); setScheduledAt(value.scheduledAt);
    setMetaTitle(value.metaTitle); setMetaDescription(value.metaDescription); setOgImage(value.ogImage);
  };

  useEffect(() => {
    if (activeSite) {
      loadPosts();
      loadTaxonomies();
    }
  }, [activeSite]);

  useEffect(() => {
    if (!initialEditId || posts.length === 0) return;
    const matched = posts.find((p) => p.id === initialEditId);
    if (matched) {
      if (canEditContent(role, matched.status)) {
        handleOpenEdit(matched);
      }
      onClearInitialEdit?.();
    }
  }, [initialEditId, posts]);

  const loadPosts = async () => {
    if (!activeSite) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/posts?siteId=${activeSite.id}`);
      const json = await res.json();
      if (json.data) setPosts(json.data);
    } catch {
      showToast('Gagal memuat artikel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTaxonomies = async () => {
    if (!activeSite) return;
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch(`/api/admin/categories?siteId=${activeSite.id}`),
        fetch(`/api/admin/tags?siteId=${activeSite.id}`),
      ]);
      const [catJson, tagJson] = await Promise.all([catRes.json(), tagRes.json()]);
      if (catJson.data) setCategories(catJson.data);
      if (tagJson.data) setAvailableTags(tagJson.data);
    } catch {}
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  const handleOpenCreate = () => {
    setCurrentId(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContentHtml('');
    setContentJson('{}');
    setFeaturedImage('');
    setStatus('DRAFT');
    setCategoryId('');
    setSelectedTagIds([]);
    setScheduledAt('');
    setMetaTitle('');
    setMetaDescription('');
    setOgImage('');
    setIsEditing(true);
  };

  const handleOpenEdit = (p: PostItem) => {
    if (p.status === 'IN_REVIEW') return;
    setCurrentId(p.id);
    setTitle(p.title);
    setSlug(p.slug);
    setExcerpt(p.excerpt || '');
    setContentHtml(p.contentHtml);
    setContentJson(p.contentJson);
    setFeaturedImage(p.featuredImage || '');
    setStatus(p.status);
    setCategoryId(p.categoryId || '');
    setSelectedTagIds(p.tags?.map((t) => t.tag.id) || []);
    setScheduledAt(p.scheduledAt ? new Date(p.scheduledAt).toISOString().slice(0, 16) : '');
    setMetaTitle(p.metaTitle || '');
    setMetaDescription(p.metaDescription || '');
    setOgImage(p.ogImage || '');
    setIsEditing(true);
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite) return;
    if (!title || !slug) {
      showToast('Judul dan slug artikel wajib diisi', 'error');
      return;
    }

    if (status === 'SCHEDULED' && !scheduledAt) {
      showToast('Tentukan tanggal & waktu terbit untuk artikel terjadwal', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        slug,
        excerpt,
        contentHtml,
        contentJson,
        featuredImage,
        status,
        categoryId: categoryId || null,
        tagIds: selectedTagIds,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        metaTitle,
        metaDescription,
        ogImage,
      };

      const url = currentId
        ? `/api/admin/posts/${currentId}`
        : `/api/admin/posts?siteId=${activeSite.id}`;
      const method = currentId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Gagal menyimpan artikel');
      }

      showToast(currentId ? 'Artikel berhasil diperbarui' : 'Artikel berhasil dibuat', 'success');
      draft.savedToServer();
      setIsEditing(false);
      loadPosts();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/posts/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      showToast('Artikel berhasil dihapus', 'success');
      setDeleteTarget(null);
      loadPosts();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus artikel', 'error');
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      (p.excerpt && p.excerpt.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCategory === 'ALL' || p.categoryId === filterCategory;
    const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="cms-page p-6 flex flex-col gap-6">
      {!isEditing ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                Artikel
              </h1>
              <p className="text-[13px] text-slate-500">
                Kelola konten blog, artikel, dan siaran pers situs {activeSite?.name}
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-[#242a31] hover:bg-[#3a424c] rounded-lg transition  cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tulis Artikel Baru</span>
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
                placeholder="Cari artikel berdasarkan judul atau ringkasan..."
                className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden"
              />
            </div>

            <select aria-label="Filter kategori"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select aria-label="Filter status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_REVIEW">Menunggu review</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Posts Table */}
          <p className="cms-list-summary" aria-live="polite">{loading ? 'Memuat artikel…' : `${filteredPosts.length} dari ${posts.length} artikel`}</p>
          <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg  overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#FFFFFF] dark:bg-[#282E35] border-b border-slate-200 dark:border-[#3E4651] text-slate-500 font-medium">
                    <th className="p-3.5">Artikel</th>
                    <th className="p-3.5">Kategori & Tag</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Tanggal</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Memuat data artikel...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredPosts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Tidak ada artikel yang cocok dengan kriteria filter.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-[#282E35]/50 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            {post.featuredImage ? (
                              <img
                                src={post.featuredImage}
                                alt=""
                                className="w-12 h-10 object-cover rounded-md border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center text-slate-500 shrink-0">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-slate-800 dark:text-slate-100 line-clamp-1">
                                {post.title}
                              </div>
                              <div className="text-[13px] text-slate-500 font-mono">
                                /{post.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {post.category?.name || 'Tanpa Kategori'}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {post.tags?.map((t) => (
                                <span
                                  key={t.tag.id}
                                  className="text-[13px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500"
                                >
                                  #{t.tag.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[13px] font-medium ${
                              post.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : post.status === 'SCHEDULED'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : post.status === 'IN_REVIEW'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {post.status === 'IN_REVIEW' ? 'Menunggu review' : post.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-500">
                          {post.status === 'SCHEDULED' && post.scheduledAt ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              Jadwal: {new Date(post.scheduledAt).toLocaleString()}
                            </span>
                          ) : post.publishedAt ? (
                            <span>Terbit: {new Date(post.publishedAt).toLocaleDateString()}</span>
                          ) : (
                            <span>Dibuat: {new Date(post.createdAt).toLocaleDateString()}</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <ContentReview kind="posts" content={post} role={role} onChanged={loadPosts} />
                            <button
                              onClick={() => setVersionTarget(post)}
                              className="inline-flex items-center justify-center min-w-8 min-h-8 p-2 text-slate-500 hover:text-[#6C7A89] hover:bg-slate-100 dark:hover:bg-[#282E35] rounded-md transition"
                              title="Riwayat Versi"
                              aria-label={`Riwayat versi ${post.title}`}
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(post)}
                              disabled={!canEditContent(role, post.status)}
                              className="inline-flex items-center justify-center min-w-8 min-h-8 p-2 text-slate-500 hover:text-[#6C7A89] hover:bg-slate-100 dark:hover:bg-[#282E35] rounded-md transition"
                              title="Sunting Artikel"
                              aria-label={`Sunting artikel ${post.title}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(post)}
                              disabled={!canEditContent(role, post.status)}
                              className="inline-flex items-center justify-center min-w-8 min-h-8 p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition"
                              title="Hapus Artikel"
                              aria-label={`Hapus artikel ${post.title}`}
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
        /* Post Editor */
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
              <span>Kembali ke Daftar Artikel</span>
            </button>

            <div className="flex items-center gap-3">
              <select aria-label="Status publikasi"
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="text-[13px] font-medium bg-white dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-hidden"
              >
                <option value="DRAFT">Draft</option>
                {canPublish(role) && <option value="PUBLISHED">Published</option>}
                {canPublish(role) && <option value="SCHEDULED">Scheduled</option>}
              </select>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-[#242a31] hover:bg-[#3a424c] rounded-lg transition  disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Artikel'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-5  flex flex-col gap-4">
                <div>
                  <label htmlFor="cms-postsview-1" className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Judul Artikel
                  </label>
                  <input id="cms-postsview-1"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!currentId) setSlug(generateSlug(e.target.value));
                    }}
                    placeholder="mis. Panduan Arsitektur Headless Modern"
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
                      placeholder="panduan-arsitektur-headless"
                      className="flex-1 px-3 py-2 text-[13px] font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cms-postsview-2" className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Ringkasan Singkat (Excerpt)
                  </label>
                  <textarea id="cms-postsview-2"
                    rows={2}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Ringkasan 1-2 kalimat untuk kartu artikel dan cuplikan feed..."
                    className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Isi Artikel (TipTap Rich Text)
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

            {/* Sidebar Meta & Taxonomy */}
            <div className="flex flex-col gap-4">
              {/* Publishing Schedule */}
              {status === 'SCHEDULED' && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg p-4  flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>Jadwal Waktu Terbit</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3 py-1.5 text-[13px] bg-white dark:bg-[#282E35] border border-amber-300 dark:border-amber-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                  <p className="text-[13px] text-amber-700 dark:text-amber-400">
                    Artikel akan otomatis berstatus Published ketika waktu ini tercapai.
                  </p>
                </div>
              )}

              {/* Taxonomy */}
              <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-5  flex flex-col gap-4">
                <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-[#6C7A89]" />
                  <span>Kategori & Tag</span>
                </h3>

                <div>
                  <label htmlFor="cms-postsview-3" className="block text-[13px] font-semibold text-slate-600 dark:text-slate-500 mb-1">
                    Kategori
                  </label>
                  <select id="cms-postsview-3"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-500 mb-1.5">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 border border-slate-200 dark:border-[#3E4651] rounded-lg bg-slate-50 dark:bg-[#282E35]">
                    {availableTags.length === 0 && (
                      <span className="text-[13px] text-slate-500">Belum ada tag pada situs ini.</span>
                    )}
                    {availableTags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          type="button"
                          key={tag.id}
                          onClick={() => handleToggleTag(tag.id)}
                          className={`text-[13px] px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#6C7A89] text-white'
                              : 'bg-white dark:bg-[#1E2328] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          #{tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="cms-postsview-4" className="block text-[13px] font-semibold text-slate-600 dark:text-slate-500">
                      Gambar Utama (Featured Image URL)
                    </label>
                    <button
                      type="button"
                      onClick={() => setMediaPickerOpen(true)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#6C7A89] hover:text-[#4F5A66] dark:text-[#8E9BA9] cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Pilih dari Media</span>
                    </button>
                  </div>
                  <input id="cms-postsview-4"
                    type="text"
                    value={featuredImage}
                    onChange={(e) => setFeaturedImage(e.target.value)}
                    placeholder="https://.../featured.jpg"
                    className="w-full px-3 py-1.5 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                  {featuredImage && (
                    <img
                      src={featuredImage}
                      alt="Featured"
                      className="mt-2 w-full h-28 object-cover rounded-md border border-slate-200"
                    />
                  )}
                </div>
              </div>

              {/* SEO */}
              <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-5  flex flex-col gap-4">
                <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#6C7A89]" />
                  <span>Pengaturan SEO</span>
                </h3>

                <div>
                  <label htmlFor="cms-postsview-5" className="block text-[13px] font-semibold text-slate-600 dark:text-slate-500 mb-1">
                    Meta Title
                  </label>
                  <input id="cms-postsview-5"
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Judul SEO..."
                    className="w-full px-3 py-1.5 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label htmlFor="cms-postsview-6" className="block text-[13px] font-semibold text-slate-600 dark:text-slate-500 mb-1">
                    Meta Description
                  </label>
                  <textarea id="cms-postsview-6"
                    rows={2}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Deskripsi SEO..."
                    className="w-full px-3 py-1.5 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
          </div>
        </form>
      )}

      {/* Modals */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        siteId={activeSite?.id}
        currentUrl={featuredImage}
        onSelect={(url) => setFeaturedImage(url)}
        onClose={() => setMediaPickerOpen(false)}
      />

      {versionTarget && (
        <VersionHistoryModal
          canRestore={canEditContent(role, versionTarget.status)}
          isOpen={!!versionTarget}
          entityType="POST"
          entityId={versionTarget.id}
          onClose={() => setVersionTarget(null)}
          onRestored={loadPosts}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Hapus Artikel"
          message={`Apakah Anda yakin ingin menghapus artikel "${deleteTarget.title}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
