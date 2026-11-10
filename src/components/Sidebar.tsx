import React from 'react';
import { canManageSite } from '../lib/access';
import {
  LayoutDashboard,
  CalendarDays,
  ArchiveRestore,
  FileText,
  Newspaper,
  Tags,
  Image as ImageIcon,
  Menu as MenuIcon,
  Settings,
  Globe2,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'calendar'
  | 'backups'
  | 'users'
  | 'pages'
  | 'posts'
  | 'taxonomy'
  | 'media'
  | 'menus'
  | 'settings'
  | 'sites'
  | 'audit-logs'
  | 'api-explorer';

interface SidebarProps {
  role: string;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  open: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, currentTab, onSelectTab, open, onClose }) => {
  const menuItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pages', label: 'Halaman', icon: <FileText className="w-4 h-4" /> },
    { id: 'posts', label: 'Artikel', icon: <Newspaper className="w-4 h-4" /> },
    { id: 'calendar', label: 'Kalender Editorial', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'taxonomy', label: 'Kategori & Tag', icon: <Tags className="w-4 h-4" /> },
    { id: 'media', label: 'Media Library', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'menus', label: 'Menu Navigasi', icon: <MenuIcon className="w-4 h-4" /> },
    { id: 'settings', label: 'Pengaturan Situs', icon: <Settings className="w-4 h-4" /> },
    { id: 'sites', label: 'Kelola Multi-Situs', icon: <Globe2 className="w-4 h-4" /> },
    { id: 'users', label: 'Tim & Akses', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'backups', label: 'Backup & Pemulihan', icon: <ArchiveRestore className="w-4 h-4" /> },
    { id: 'audit-logs', label: 'Audit Log', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'api-explorer', label: 'API & Integrasi', icon: <Terminal className="w-4 h-4" />, badge: 'SDK' },
  ];

  return (
    <aside id="cms-sidebar" aria-hidden={!open} inert={!open} data-open={open} onMouseLeave={onClose} className="cms-sidebar w-64 border-r border-slate-200 dark:border-[#3E4651] bg-[#FFFFFF] dark:bg-[#1A1E22] flex flex-col p-4 shrink-0 transition-colors" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <div className="text-xs font-medium text-slate-500 px-3 mb-3">
        Manajemen Konten
      </div>

      <nav id="cms-navigation" aria-label="Navigasi utama" className="flex flex-col gap-1">
        {menuItems.filter(item => {
          if (item.id === 'users' || item.id === 'sites' || item.id === 'backups') return role === 'ADMIN';
          if (['menus', 'settings', 'audit-logs', 'api-explorer'].includes(item.id)) return canManageSite(role);
          return true;
        }).map((item) => {
          const isActive = currentTab === item.id;
          return (
            <React.Fragment key={item.id}>
            {(item.id === 'pages' || item.id === 'settings') && <div className="cms-nav-group">{item.id === 'pages' ? 'Konten situs' : 'Workspace'}</div>}
            <button
              key={item.id}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition ${
                isActive
                  ? 'bg-slate-100 text-slate-900 dark:bg-[#282E35] dark:text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-[#282E35]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#4F5A66] dark:bg-[#343C45] dark:text-[#DFE2DC]'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-[#3E4651] text-[11px] text-slate-500">
        <div className="font-semibold text-slate-600 dark:text-slate-400">Kedata Headless CMS</div>
        <div className="text-[10px] mt-0.5">Versi 1.0.0 (Prisma & SQLite)</div>
      </div>
    </aside>
  );
};
