import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import { Navbar, Site } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { LandingView } from './views/LandingView';
import { DashboardView } from './views/DashboardView';
import { PagesView } from './views/PagesView';
import { PostsView } from './views/PostsView';
import { TaxonomyView } from './views/TaxonomyView';
import { MediaView } from './views/MediaView';
import { MenusView } from './views/MenusView';
import { SettingsView } from './views/SettingsView';
import { SitesView } from './views/SitesView';
import { AuditLogsView } from './views/AuditLogsView';
import { ApiExplorerView } from './views/ApiExplorerView';
import { KedataMark } from './components/KedataMark';
import { UsersView } from './views/UsersView';
import { canManageSite } from './lib/access';
import { CalendarView } from './views/CalendarView';
import { BackupsView } from './views/BackupsView';

function AppContent() {
  const pagePath = window.location.pathname.replace(/\/+$/, '') || '/';
  const [user, setUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Sites state
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSite, setActiveSite] = useState<Site | null>(null);

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  // Dark mode
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('kd_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const { showToast } = useToast();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kd_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kd_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authChecking) return;
    if (user && (pagePath === '/' || pagePath === '/login')) window.location.replace('/dashboard');
    if (!user && pagePath !== '/' && pagePath !== '/login') window.location.replace('/login');
  }, [authChecking, user, pagePath]);

  const checkAuth = async () => {
    setAuthChecking(true);
    try {
      const res = await fetch('/api/admin/me');
      const json = await res.json();
      if (res.ok && json.data) {
        setUser(json.data);
        await loadSites();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  const loadSites = async () => {
    try {
      const res = await fetch('/api/admin/sites');
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        setSites(json.data);
        // Persist or default active site
        const savedSiteId = localStorage.getItem('kd_active_site_id');
        const matched = json.data.find((s: Site) => s.id === savedSiteId) || json.data[0];
        setActiveSite(matched);
      }
    } catch {
      showToast('Gagal memuat daftar situs', 'error');
    }
  };

  const handleSelectSite = (site: Site) => {
    setActiveSite(site);
    localStorage.setItem('kd_active_site_id', site.id);
    showToast(`Beralih ke situs: ${site.name}`, 'info');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setUser(null);
      showToast('Berhasil keluar', 'info');
    } catch {
      setUser(null);
      window.location.assign('/login');
    }
  };

  if (authChecking || (user && (pagePath === '/' || pagePath === '/login')) || (!user && pagePath !== '/' && pagePath !== '/login')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#171B1F] text-slate-600 dark:text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse">
            <KedataMark />
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
            Memuat Kedata CMS...
          </span>
        </div>
      </div>
    );
  }

  if (!user && pagePath === '/') return <LandingView />;

  if (!user) {
    return (
      <LoginView
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          window.location.replace('/dashboard');
        }}
      />
    );
  }

  return (
    <div className="cms-shell min-h-screen flex flex-col bg-white dark:bg-[#171B1F] text-slate-800 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <Navbar
        sites={sites}
        activeSite={activeSite}
        onSelectSite={handleSelectSite}
        user={user}
        onLogout={handleLogout}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(open => !open)}
      />

      {/* Main Container */}
      <div className="cms-layout flex-1 flex overflow-hidden">
        <div className="cms-sidebar-edge" aria-hidden="true" onMouseEnter={() => setSidebarOpen(true)} />
        {sidebarOpen && <button className="cms-sidebar-backdrop" aria-label="Tutup menu navigasi" onClick={() => setSidebarOpen(false)} />}
        {/* Sidebar */}
        <Sidebar role={user.role} currentTab={currentTab} open={sidebarOpen} onClose={() => { setSidebarOpen(false); document.getElementById('cms-sidebar-toggle')?.focus(); }} onSelectTab={(tab) => { setCurrentTab(tab); if (window.innerWidth <= 1100) { setSidebarOpen(false); document.getElementById('cms-sidebar-toggle')?.focus(); } }} />

        {/* View Port Area */}
        <main key={activeSite?.id || 'no-site'} className="cms-main flex-1 overflow-y-auto">
          {currentTab === 'users' && user.role === 'ADMIN' && <UsersView sites={sites} currentUserId={user.id} />}
          {currentTab === 'backups' && user.role === 'ADMIN' && <BackupsView />}
          {currentTab === 'calendar' && <CalendarView sites={sites} onManage={entry => {
            const site = sites.find(item => item.id === entry.siteId);
            if (site) {
              handleSelectSite(site);
              setPendingEditId(entry.id);
              setCurrentTab(entry.kind === 'PAGE' ? 'pages' : 'posts');
            }
          }} />}
          {currentTab === 'dashboard' && (
            <DashboardView activeSite={activeSite} onNavigate={setCurrentTab} role={user.role} />
          )}
          {currentTab === 'pages' && <PagesView activeSite={activeSite} role={user.role} userId={user.id} initialEditId={pendingEditId} onClearInitialEdit={() => setPendingEditId(null)} />}
          {currentTab === 'posts' && <PostsView activeSite={activeSite} role={user.role} userId={user.id} initialEditId={pendingEditId} onClearInitialEdit={() => setPendingEditId(null)} />}
          {currentTab === 'taxonomy' && <TaxonomyView activeSite={activeSite} />}
          {currentTab === 'media' && <MediaView activeSite={activeSite} />}
          {currentTab === 'menus' && canManageSite(user.role) && <MenusView activeSite={activeSite} />}
          {currentTab === 'settings' && canManageSite(user.role) && <SettingsView activeSite={activeSite} />}
          {currentTab === 'sites' && user.role === 'ADMIN' && (
            <SitesView
              sites={sites}
              activeSite={activeSite}
              onRefreshSites={loadSites}
              onSelectSite={handleSelectSite}
            />
          )}
          {currentTab === 'audit-logs' && canManageSite(user.role) && <AuditLogsView activeSite={activeSite} />}
          {currentTab === 'api-explorer' && canManageSite(user.role) && <ApiExplorerView activeSite={activeSite} />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
