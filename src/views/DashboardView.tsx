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


  if (!activeSite) return <div className="cms-overview"><h1>Dashboard</h1><p>Pilih atau buat situs untuk mulai mengelola konten.</p><button className="cms-primary" onClick={() => onNavigate('sites')}>Kelola situs</button></div>;
  const metrics = [
    {label:'Halaman', value:stats.pagesCount, tab:'pages' as NavTab, description:'Konten halaman situs'},
    {label:'Artikel', value:stats.postsCount, tab:'posts' as NavTab, description:'Berita dan publikasi'},
    {label:'Media', value:stats.mediaCount, tab:'media' as NavTab, description:'Gambar dan dokumen'},
  ];
  return <div className="cms-overview">
    <div className="cms-title-row">
      <div><h1>Dashboard</h1><p>Kelola konten <strong>{activeSite.name}</strong> dari satu tempat.</p></div>
      <button className="cms-primary" onClick={() => onNavigate('posts')}><Plus size={16}/>Kelola artikel</button>
    </div>
    <section className="cms-site-strip" aria-label="Situs aktif">
      <div><Globe size={18}/><strong>{activeSite.name}</strong><span>{activeSite.domain || 'Domain belum diatur'}</span></div>
      <button className="cms-text-button" onClick={() => onNavigate('settings')}>Pengaturan situs <ArrowUpRight size={14}/></button>
    </section>
    {/* Three equal columns: 3 × ((available width - 2px) / 3) + 2 dividers = available width. */}
    <section className="cms-metrics" aria-label="Ringkasan konten">
      {metrics.map(metric => <button key={metric.tab} onClick={() => onNavigate(metric.tab)}>
        <span>{metric.label}<ArrowUpRight size={15}/></span><strong>{metric.value.toLocaleString('id-ID')}</strong><small>{metric.description}</small>
      </button>)}
    </section>
    <div className="cms-dashboard-grid">
      <section className="cms-panel">
        <div className="cms-section-title"><div><h2>Artikel terbaru</h2><p>Publikasi dan konten yang sedang disiapkan.</p></div><button onClick={() => onNavigate('posts')}>Lihat semua <ArrowUpRight size={14}/></button></div>
        {!recentPosts.length ? <div className="cms-empty"><p>Belum ada artikel di situs ini.</p><button className="cms-text-button" onClick={() => onNavigate('posts')}>Mulai kelola artikel <ArrowUpRight size={14}/></button></div> : <div className="cms-table-scroll"><table className="cms-post-table"><thead><tr><th>Judul artikel</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>{recentPosts.map(post => <tr key={post.id}><td><button onClick={() => onNavigate('posts')}>{post.title}</button><small>{post.category?.name || 'Tanpa kategori'}</small></td><td><span className={'cms-status cms-status-'+post.status.toLowerCase()}>{post.status === 'PUBLISHED' ? 'Terbit' : post.status === 'SCHEDULED' ? 'Terjadwal' : 'Draf'}</span></td><td>{new Date(post.createdAt).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="cms-panel cms-activity-panel">
        <div className="cms-section-title"><div><h2>Aktivitas terbaru</h2><p>Perubahan pada konten situs.</p></div><button onClick={() => onNavigate('audit-logs')} aria-label="Lihat semua aktivitas"><ArrowUpRight size={16}/></button></div>
        {!recentLogs.length ? <div className="cms-empty">Belum ada aktivitas di situs ini.</div> : <ul className="cms-activity">{recentLogs.map(log => <li key={log.id}><span className="cms-activity-dot"/><div><strong>{log.action.replaceAll('_',' ')} · {log.entityType}</strong><p>{log.actor}</p></div><time>{new Date(log.createdAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</time></li>)}</ul>}
      </section>
    </div>
    <section className="cms-tools" aria-label="Alat publikasi">
      <div><h2>Publikasi & integrasi</h2><p>Periksa jadwal konten atau hubungkan situs melalui API.</p></div>
      <div><button className="cms-secondary" disabled={publishing} onClick={handleTriggerScheduled}><Clock size={16}/>{publishing ? 'Memeriksa…' : 'Cek jadwal terbit'}</button><button className="cms-secondary" onClick={() => onNavigate('api-explorer')}><Radio size={16}/>API & SDK</button></div>
    </section>
  </div>;
};
