import React, { useState, useEffect } from 'react';
import {
  Globe2,
  Plus,
  Edit,
  Trash2,
  Key,
  Copy,
  Check,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Site } from '../components/Navbar';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../components/Toast';

export const SitesView: React.FC<{
  sites: Site[];
  activeSite: Site | null;
  onRefreshSites: () => void;
  onSelectSite: (site: Site) => void;
}> = ({ sites, activeSite, onRefreshSites, onSelectSite }) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [corsOrigins, setCorsOrigins] = useState('*');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [rateLimit, setRateLimit] = useState(120);

  // Newly Created / Regenerated Key Display Modal
  const [generatedKeyData, setGeneratedKeyData] = useState<{ rawKey: string; siteName: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Delete & Regen Confirm
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [regenTarget, setRegenTarget] = useState<Site | null>(null);

  const { showToast } = useToast();

  const handleOpenCreate = () => {
    setName('');
    setSlug('');
    setDomain('');
    setDescription('');
    setCorsOrigins('*');
    setWebhookUrl('');
    setWebhookSecret('');
    setRateLimit(120);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (s: Site) => {
    setEditingSite(s);
    setName(s.name);
    setSlug(s.slug);
    setDomain(s.domain);
    setDescription(s.description || '');
    setCorsOrigins(s.corsOrigins || '*');
    setWebhookUrl(s.webhookUrl || '');
    setWebhookSecret('');
    setRateLimit(s.rateLimit || 120);
    setEditModalOpen(true);
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          domain,
          description,
          corsOrigins,
          webhookUrl: webhookUrl || undefined,
          webhookSecret: webhookSecret || undefined,
          rateLimit: Number(rateLimit),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Gagal membuat situs');

      showToast(`Situs ${name} berhasil dibuat!`, 'success');
      setCreateModalOpen(false);

      // Show generated raw API key (displayed only once)
      if (json.data.generatedApiKey) {
        setGeneratedKeyData({
          rawKey: json.data.generatedApiKey,
          siteName: name,
        });
      }

      onRefreshSites();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;

    try {
      const res = await fetch(`/api/admin/sites/${editingSite.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          domain,
          description,
          corsOrigins,
          webhookUrl: webhookUrl || undefined,
          webhookSecret: webhookSecret || undefined,
          rateLimit: Number(rateLimit),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Gagal memperbarui situs');

      showToast('Data situs berhasil diperbarui', 'success');
      setEditModalOpen(false);
      onRefreshSites();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRegenerateKey = async () => {
    if (!regenTarget) return;

    try {
      const res = await fetch(`/api/admin/sites/${regenTarget.id}/regenerate-api-key`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      showToast('API Key berhasil dibuat ulang!', 'success');
      setGeneratedKeyData({
        rawKey: json.data.generatedApiKey,
        siteName: regenTarget.name,
      });
      setRegenTarget(null);
      onRefreshSites();
    } catch (err: any) {
      showToast(err.message || 'Gagal generate ulang key', 'error');
    }
  };

  const handleDeleteSite = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/admin/sites/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      showToast('Situs berhasil dihapus', 'success');
      setDeleteTarget(null);
      onRefreshSites();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus situs', 'error');
    }
  };

  const handleCopyNewKey = () => {
    if (generatedKeyData) {
      navigator.clipboard.writeText(generatedKeyData.rawKey);
      setCopiedKey(true);
      showToast('API Key disalin ke clipboard', 'info');
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            Kelola Multi-Situs (Sites)
          </h1>
          <p className="text-xs text-slate-500">
            Daftar seluruh website yang dikelola oleh satu dasbor Kedata CMS ini
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-xl transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Situs Baru</span>
        </button>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sites.map((site) => {
          const isActive = activeSite?.id === site.id;

          return (
            <div
              key={site.id}
              className={`bg-white dark:bg-[#1E2328] border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition ${
                isActive ? 'border-[#6C7A89] ring-2 ring-[#6C7A89]/20' : 'border-slate-200 dark:border-[#3E4651]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#282E35] text-[#6C7A89] flex items-center justify-center font-bold">
                      <Globe2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>{site.name}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold bg-[#6C7A89] text-white px-2 py-0.5 rounded-full">
                            Aktif
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Domain: {site.domain} • Slug: {site.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(site)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded"
                      title="Sunting Konfigurasi"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {sites.length > 1 && (
                      <button
                        onClick={() => setDeleteTarget(site)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        title="Hapus Situs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 line-clamp-2">
                  {site.description || 'Tidak ada deskripsi situs.'}
                </p>

                {/* Technical Configuration Details */}
                <div className="mt-4 p-3 bg-slate-50 dark:bg-[#282E35] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-[#6C7A89]" />
                      <span>API Key Hash:</span>
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-700 dark:text-slate-300 font-bold">{site.apiKeyPrefix}</span>
                      <button
                        onClick={() => setRegenTarget(site)}
                        className="text-[11px] text-[#6C7A89] hover:underline flex items-center gap-0.5"
                        title="Generate Ulang Key"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Regenerate</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">CORS Allowed:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-xs">{site.corsOrigins}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Webhook URL:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-xs">{site.webhookUrl || '—'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Rate Limit:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{site.rateLimit || 120} req/menit</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {!isActive ? (
                  <button
                    onClick={() => onSelectSite(site)}
                    className="w-full py-2 text-xs font-semibold text-[#6C7A89] hover:bg-slate-100/50 dark:hover:bg-[#282E35] rounded-lg transition text-center"
                  >
                    Jadikan Situs Aktif
                  </button>
                ) : (
                  <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mx-auto">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sedang Dikelola di Dasbor</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generated API Key Modal (Shown once upon create or regenerate) */}
      {generatedKeyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E2328] border border-amber-300 dark:border-amber-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Simpan API Key Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Untuk situs: {generatedKeyData.siteName}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
              <strong>PENTING:</strong> Kunci ini hanya ditampilkan <strong>satu kali</strong> sekarang. Di server, kunci disimpan dalam bentuk hash SHA-256 yang aman. Salin dan simpan di file <code>.env</code> aplikasi klien Anda sekarang.
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-xl font-mono text-xs text-slate-900 dark:text-slate-100 break-all select-all">
              <span className="flex-1">{generatedKeyData.rawKey}</span>
              <button
                type="button"
                onClick={handleCopyNewKey}
                className="p-2 bg-[#6C7A89] hover:bg-[#5a6775] text-white rounded-lg transition"
                title="Salin Kunci"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setGeneratedKeyData(null)}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-xl transition"
              >
                Saya Sudah Menyimpan Kunci Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Site Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateSite}
            className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Tambah Situs Web Baru
              </h3>
              <button type="button" onClick={() => setCreateModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Situs
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                  }}
                  placeholder="Kedata Mobile Portal"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Slug Unik
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="kedata-mobile"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Domain Publik
                </label>
                <input
                  type="text"
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="app.kedata.id atau localhost:5173"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan fungsi situs..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  CORS Origins
                </label>
                <input
                  type="text"
                  value={corsOrigins}
                  onChange={(e) => setCorsOrigins(e.target.value)}
                  placeholder="* atau http://localhost:3000"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rate Limit (req/menit)
                </label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={rateLimit}
                  onChange={(e) => setRateLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Webhook Revalidate URL (Opsional)
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://client-site.com/api/revalidate"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-lg transition"
              >
                Buat Situs & Generate Key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Site Modal */}
      {editModalOpen && editingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleUpdateSite}
            className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Sunting Konfigurasi Situs
              </h3>
              <button type="button" onClick={() => setEditModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Situs
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  CORS Origins
                </label>
                <input
                  type="text"
                  value={corsOrigins}
                  onChange={(e) => setCorsOrigins(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rate Limit (req/menit)
                </label>
                <input
                  type="number"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-lg transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Regenerate Key Confirmation */}
      {regenTarget && (
        <ConfirmModal
          isOpen={!!regenTarget}
          title="Regenerate API Key"
          message={`Apakah Anda yakin ingin membuat ulang API Key untuk situs "${regenTarget.name}"? Kunci lama akan langsung tidak berlaku dan seluruh klien situs ini harus diperbarui.`}
          confirmLabel="Regenerate Key"
          onConfirm={handleRegenerateKey}
          onCancel={() => setRegenTarget(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Hapus Situs"
          message={`Yakin ingin menghapus situs "${deleteTarget.name}" beserta seluruh halaman, artikel, dan konfigurasinya?`}
          onConfirm={handleDeleteSite}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
