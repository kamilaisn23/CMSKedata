import React from 'react';
import {
  LayoutDashboard,
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
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const menuItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pages', label: 'Halaman (Pages)', icon: <FileText className="w-4 h-4" /> },
    { id: 'posts', label: 'Artikel (Posts)', icon: <Newspaper className="w-4 h-4" /> },
    { id: 'taxonomy', label: 'Kategori & Tag', icon: <Tags className="w-4 h-4" /> },
    { id: 'media', label: 'Media Library', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'menus', label: 'Menu Navigasi', icon: <MenuIcon className="w-4 h-4" /> },
    { id: 'settings', label: 'Pengaturan Situs', icon: <Settings className="w-4 h-4" /> },
    { id: 'sites', label: 'Kelola Multi-Situs', icon: <Globe2 className="w-4 h-4" /> },
    { id: 'audit-logs', label: 'Audit Log', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'api-explorer', label: 'API & Integrasi', icon: <Terminal className="w-4 h-4" />, badge: 'SDK' },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-[#3E4651] bg-[#FFFFFF] dark:bg-[#1A1E22] flex flex-col p-4 shrink-0 transition-colors">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
        Manajemen Konten
      </div>

      <nav className="flex flex-col gap-1">
        {menuItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition ${
                isActive
                  ? 'bg-[#6C7A89] text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-[#282E35]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-[#6C7A89] dark:text-[#8E9BA9]'}>
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
