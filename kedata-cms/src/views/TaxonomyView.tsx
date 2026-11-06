import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Folder, Tag as TagIcon, X } from 'lucide-react';
import { Site } from '../components/Navbar';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../components/Toast';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count?: { posts: number };
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
  _count?: { posts: number };
}

export const TaxonomyView: React.FC<{ activeSite: Site | null }> = ({ activeSite }) => {
  const [tab, setTab] = useState<'categories' | 'tags'>('categories');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);

  // New Category state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // New Tag state
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagSlug, setTagSlug] = useState('');

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'cat' | 'tag' } | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    if (activeSite) {
      loadTaxonomies();
    }
  }, [activeSite]);

  const loadTaxonomies = async () => {
    if (!activeSite) return;
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        fetch(`/api/admin/categories?siteId=${activeSite.id}`),
        fetch(`/api/admin/tags?siteId=${activeSite.id}`),
      ]);
      const [cJson, tJson] = await Promise.all([cRes.json(), tRes.json()]);
      if (cJson.data) setCategories(cJson.data);
      if (tJson.data) setTags(tJson.data);
    } catch {
      showToast('Gagal memuat kategori dan tag', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite) return;
    try {
      const res = await fetch(`/api/admin/categories?siteId=${activeSite.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName, slug: catSlug, description: catDesc }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      showToast('Kategori berhasil dibuat', 'success');
      setCatModalOpen(false);
      setCatName('');
      setCatSlug('');
      setCatDesc('');
      loadTaxonomies();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite) return;
    try {
      const res = await fetch(`/api/admin/tags?siteId=${activeSite.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName, slug: tagSlug }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      showToast('Tag berhasil dibuat', 'success');
      setTagModalOpen(false);
      setTagName('');
      setTagSlug('');
      loadTaxonomies();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const url =
        deleteTarget.type === 'cat'
          ? `/api/admin/categories/${deleteTarget.id}`
          : `/api/admin/tags/${deleteTarget.id}`;

      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      showToast(`${deleteTarget.type === 'cat' ? 'Kategori' : 'Tag'} berhasil dihapus`, 'success');
      setDeleteTarget(null);
      loadTaxonomies();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            Kategori & Tag
          </h1>
          <p className="text-xs text-slate-500">
            Taksonomi pengelompokan konten untuk situs {activeSite?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'categories' ? (
            <button
              onClick={() => setCatModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kategori</span>
            </button>
          ) : (
            <button
              onClick={() => setTagModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tag</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#3E4651] gap-6 text-sm font-bold">
        <button
          onClick={() => setTab('categories')}
          className={`pb-3 flex items-center gap-2 transition cursor-pointer ${
            tab === 'categories'
              ? 'border-b-2 border-[#6C7A89] text-[#6C7A89] dark:text-[#8E9BA9]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Kategori ({categories.length})</span>
        </button>

        <button
          onClick={() => setTab('tags')}
          className={`pb-3 flex items-center gap-2 transition cursor-pointer ${
            tab === 'tags'
              ? 'border-b-2 border-[#6C7A89] text-[#6C7A89] dark:text-[#8E9BA9]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TagIcon className="w-4 h-4" />
          <span>Tags ({tags.length})</span>
        </button>
      </div>

      {/* Categories View */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-xl p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{c.name}</h3>
                  <span className="text-[10px] font-mono bg-slate-100 dark:bg-[#282E35] px-2 py-0.5 rounded text-slate-500">
                    /{c.slug}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                  {c.description || 'Tidak ada deskripsi.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{c._count?.posts || 0} artikel terkait</span>
                <button
                  onClick={() => setDeleteTarget({ id: c.id, name: c.name, type: 'cat' })}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  title="Hapus Kategori"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tags View */}
      {tab === 'tags' && (
        <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-xl p-6 shadow-xs flex flex-wrap gap-2.5">
          {tags.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#282E35] text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <span>#{t.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">({t._count?.posts || 0})</span>
              <button
                onClick={() => setDeleteTarget({ id: t.id, name: t.name, type: 'tag' })}
                className="text-slate-400 hover:text-rose-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Category Create Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateCategory}
            className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Tambah Kategori Baru</h3>
              <button type="button" onClick={() => setCatModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Kategori
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => {
                  setCatName(e.target.value);
                  setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                }}
                placeholder="mis. Panduan & Tutorial"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Slug
              </label>
              <input
                type="text"
                required
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                placeholder="panduan-tutorial"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi
              </label>
              <textarea
                rows={2}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Keterangan singkat kategori..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6C7A89] rounded-lg hover:bg-[#5a6775]"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tag Create Modal */}
      {tagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateTag}
            className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Tambah Tag Baru</h3>
              <button type="button" onClick={() => setTagModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Tag
              </label>
              <input
                type="text"
                required
                value={tagName}
                onChange={(e) => {
                  setTagName(e.target.value);
                  setTagSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                }}
                placeholder="mis. typescript"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Slug
              </label>
              <input
                type="text"
                required
                value={tagSlug}
                onChange={(e) => setTagSlug(e.target.value)}
                placeholder="typescript"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setTagModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6C7A89] rounded-lg hover:bg-[#5a6775]"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          title={`Hapus ${deleteTarget.type === 'cat' ? 'Kategori' : 'Tag'}`}
          message={`Yakin ingin menghapus ${deleteTarget.type === 'cat' ? 'kategori' : 'tag'} "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
