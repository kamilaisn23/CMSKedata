import React, { useState } from 'react';
import {
  Globe,
  Key,
  Check,
  Copy,
  Moon,
  Sun,
  LogOut,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useToast } from './Toast';

export interface Site {
  id: string;
  name: string;
  slug: string;
  domain: string;
  description?: string;
  apiKeyPrefix: string;
  corsOrigins: string;
  webhookUrl?: string;
  rateLimit: number;
}

interface NavbarProps {
  sites: Site[];
  activeSite: Site | null;
  onSelectSite: (site: Site) => void;
  user: { email: string; name: string } | null;
  onLogout: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sites,
  activeSite,
  onSelectSite,
  user,
  onLogout,
  isDark,
  onToggleDark,
}) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopyPrefix = () => {
    if (activeSite) {
      navigator.clipboard.writeText(activeSite.apiKeyPrefix);
      setCopied(true);
      showToast(`Prefix API Key (${activeSite.apiKeyPrefix}) disalin`, 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-[#3E4651] bg-[#FFFFFF] dark:bg-[#1E2328] px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
      {/* Left: Brand + Active Site Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#6C7A89] text-white flex items-center justify-center font-bold text-lg shadow-xs">
            K
          </div>
          <div className="hidden sm:block">
            <div className="font-extrabold text-sm tracking-tight text-[#4F5A66] dark:text-[#DFE2DC] uppercase">
              Kedata <span className="text-[#6C7A89]">CMS</span>
            </div>
            <div className="text-[10px] text-slate-500 tracking-wider">HEADLESS MULTI-SITE</div>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

        {/* Site Switcher */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#6C7A89] hidden md:block" />
          <select
            value={activeSite?.id || ''}
            onChange={(e) => {
              const selected = sites.find((s) => s.id === e.target.value);
              if (selected) onSelectSite(selected);
            }}
            className="text-xs md:text-sm font-semibold bg-white dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#6C7A89] cursor-pointer"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.domain})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick API Key Copy */}
        {activeSite && (
          <button
            onClick={handleCopyPrefix}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] rounded-lg hover:bg-slate-50 transition"
            title="Klik untuk menyalin prefix API Key"
          >
            <Key className="w-3.5 h-3.5 text-[#6C7A89]" />
            <span>{activeSite.apiKeyPrefix}</span>
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
          </button>
        )}

        {/* OpenAPI Docs Link */}
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4F5A66] dark:text-[#DFE2DC] hover:text-[#6C7A89] bg-white dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] rounded-lg transition"
          title="Buka Dokumentasi OpenAPI Interaktif"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#6C7A89]" />
          <span className="hidden sm:inline">OpenAPI Docs</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDark}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282E35] rounded-lg transition"
          title={isDark ? 'Mode Terang' : 'Mode Gelap'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#6C7A89]" />}
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-slate-700">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.name || 'Admin'}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">
              {user?.email || 'admin@kedata.id'}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1 p-2 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
            title="Keluar (Logout)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
