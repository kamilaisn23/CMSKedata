import React, { useState, useEffect } from 'react';
import {
  Globe,
  FileText,
  Newspaper,
  Image as ImageIcon,
  Key,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Radio,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Site } from '../components/Navbar';
import { NavTab } from '../components/Sidebar';
import { useToast } from '../components/Toast';

interface DashboardViewProps {
  activeSite: Site | null;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ activeSite, onNavigate }) => {
  const [stats, setStats] = useState({
    pagesCount: 0,
    postsCount: 0,
    mediaCount: 0,
  });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [publishing, setPublishing] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (activeSite) {
      loadDashboardData();
    }
  }, [activeSite]);

  const loadDashboardData = async () => {
    if (!activeSite) return;
    try {
      const [pagesRes, postsRes, mediaRes, logsRes] = await Promise.all([
        fetch(`/api/admin/pages?siteId=${activeSite.id}`),
        fetch(`/api/admin/posts?siteId=${activeSite.id}`),
        fetch(`/api/admin/media?siteId=${activeSite.id}`),
        fetch(`/api/admin/audit-logs?siteId=${activeSite.id}&perPage=5`),
      ]);

      const [pagesJson, postsJson, mediaJson, logsJson] = await Promise.all([
        pagesRes.json(),
        postsRes.json(),
        mediaRes.json(),
        logsRes.json(),
      ]);

      setStats({
        pagesCount: pagesJson.data?.length || 0,
        postsCount: postsJson.data?.length || 0,
        mediaCount: mediaJson.data?.length || 0,
      });

      setRecentPosts(postsJson.data?.slice(0, 5) || []);
      setRecentLogs(logsJson.data || []);
    } catch {
      showToast('Gagal memuat ringkasan dashboard', 'error');
    }
  };

  const handleTriggerScheduled = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/admin/cron/publish', { method: 'POST' });
      const json = await res.json();
      if (json.data) {
        showToast(`Berhasil memeriksa jadwal: ${json.data.publishedCount} artikel otomatis diterbitkan`, 'success');
        loadDashboardData();
      }
    } catch {
      showToast('Gagal menjalankan penerbitan otomatis', 'error');
    } finally {
      setPublishing(false);
    }
  };

  if (!activeSite) {
    return (
      <div className="p-8 text-center text-slate-500">
        Pilih atau buat situs untuk melihat ringkasan dashboard.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top Banner: Active Site Info */}
      <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#6C7A89] dark:text-[#8E9BA9]">
              Situs Aktif
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {activeSite.name}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
            <span>Domain: <strong className="text-slate-700 dark:text-slate-300 font-mono">{activeSite.domain}</strong></span>
            <span>•</span>
            <span>CORS: <code className="bg-slate-100 dark:bg-[#282E35] px-1.5 py-0.5 rounded text-xs">{activeSite.corsOrigins}</code></span>
            <span>•</span>
            <span>Slug: <strong className="text-slate-700 dark:text-slate-300 font-mono">{activeSite.slug}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerScheduled}
            disabled={publishing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/60 hover:bg-slate-100 dark:bg-[#282E35] dark:hover:bg-[#343C45] rounded-xl transition cursor-pointer"
            title="Periksa dan terbitkan artikel terjadwal sekarang"
          >
            <Clock className={`w-3.5 h-3.5 text-[#6C7A89] ${publishing ? 'animate-spin' : ''}`} />
            <span>{publishing ? 'Memproses...' : 'Cek Jadwal Terbit'}</span>
          </button>

          <button
            onClick={() => onNavigate('api-explorer')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6C7A89] hover:bg-[#5a6775] rounded-xl transition shadow-xs cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Uji API & SDK</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('pages')}
          className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-2xl p-5 shadow-xs hover:border-[#6C7A89] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Halaman</span>
            <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-[#282E35] text-[#6C7A89] group-hover:scale-110 transition">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">
            {stats.pagesCount}
          </div>
          <div className="text-xs text-[#6C7A89] dark:text-[#8E9BA9] mt-1 flex items-center gap-1 font-medium">
            <span>Kelola Halaman Statis</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('posts')}
          className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-2xl p-5 shadow-xs hover:border-[#6C7A89] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Artikel & Berita</span>
            <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-[#282E35] text-[#6C7A89] group-hover:scale-110 transition">
              <Newspaper className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">
            {stats.postsCount}
          </div>
          <div className="text-xs text-[#6C7A89] dark:text-[#8E9BA9] mt-1 flex items-center gap-1 font-medium">
            <span>Kelola Artikel & Jadwal</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('media')}
          className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-2xl p-5 shadow-xs hover:border-[#6C7A89] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Media Assets</span>
            <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-[#282E35] text-[#6C7A89] group-hover:scale-110 transition">
              <ImageIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">
            {stats.mediaCount}
          </div>
          <div className="text-xs text-[#6C7A89] dark:text-[#8E9BA9] mt-1 flex items-center gap-1 font-medium">
            <span>Unggah & Kelola Berkas</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Posts & Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Posts Table */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100">Artikel Terbaru</h2>
              <p className="text-xs text-slate-500">Artikel yang baru diubah atau diterbitkan</p>
            </div>
            <button
              onClick={() => onNavigate('posts')}
              className="text-xs font-semibold text-[#6C7A89] hover:underline"
            >
              Lihat Semua →
            </button>
          </div>

          {recentPosts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Belum ada artikel. Klik tombol Tambah Artikel untuk membuat konten pertama.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-2 font-bold">Judul</th>
                    <th className="pb-2 font-bold">Status</th>
                    <th className="pb-2 font-bold">Kategori</th>
                    <th className="pb-2 font-bold">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50/50 dark:hover:bg-[#282E35]/40 transition">
                      <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">
                        {post.title}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            post.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : post.status === 'SCHEDULED'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {post.category?.name || '—'}
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Audit Activity */}
        <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100">Aktivitas Audit</h2>
              <p className="text-xs text-slate-500">Catatan perubahan terakhir</p>
            </div>
            <button
              onClick={() => onNavigate('audit-logs')}
              className="text-xs font-semibold text-[#6C7A89] hover:underline"
            >
              Semua →
            </button>
          </div>

          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
            {recentLogs.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">Belum ada catatan aktivitas.</div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-[#282E35] border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#6C7A89] dark:text-[#8E9BA9]">{log.action}</span>
                    <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1">
                    {log.entityType} ({log.entityId?.slice(0, 8)}...)
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Oleh: {log.actor}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
