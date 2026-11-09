import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Globe, Search } from 'lucide-react';
import type { Site } from './Navbar';

interface SiteSwitcherProps {
  sites: Site[];
  activeSite: Site | null;
  onSelectSite: (site: Site) => void;
}

export function SiteSwitcher({ sites, activeSite, onSelectSite }: SiteSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const visible = sites.filter(site => `${site.name} ${site.domain}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const focusOption = (index: number) => {
    const options = root.current?.querySelectorAll<HTMLButtonElement>('.cms-site-option');
    if (!options?.length) return;
    const option = options[(index + options.length) % options.length];
    option.focus({ preventScroll: true });
    option.scrollIntoView({ block: 'nearest' });
  };

  return (
    <div ref={root} className="cms-site-switcher" onBlur={event => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" className="cms-site-trigger" aria-label={`Situs aktif: ${activeSite?.name || 'Pilih situs'}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => { setQuery(''); setOpen(value => !value); }}>
        <Globe size={16} aria-hidden="true" />
        <span>{activeSite?.name || 'Pilih situs'}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && <div id={id} role="dialog" aria-label="Pilih situs workspace" className="cms-site-popover">
        <div className="cms-site-search">
          <Search size={16} aria-hidden="true" />
          <input autoFocus aria-label="Cari situs" placeholder="Cari nama atau domain situs…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); focusOption(event.key === 'ArrowDown' ? 0 : visible.length - 1); }
          }} />
        </div>
        <div className="cms-site-list" onKeyDown={event => {
          const options = Array.from(event.currentTarget.querySelectorAll('button'));
          const index = options.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : null;
          if (next !== null) { event.preventDefault(); focusOption(next); }
        }}>
          {visible.map(site => <button type="button" className="cms-site-option" key={site.id} aria-current={site.id === activeSite?.id ? 'true' : undefined} onClick={() => {
            if (site.id !== activeSite?.id) onSelectSite(site);
            setOpen(false);
            trigger.current?.focus();
          }}>
            <span><strong>{site.name}</strong><span>{site.domain || 'Domain belum diatur'}</span></span>
            {site.id === activeSite?.id && <Check size={16} aria-label="Situs aktif" />}
          </button>)}
          {!visible.length && <p className="cms-site-empty" role="status">Tidak ada situs yang cocok.</p>}
        </div>
        <p className="cms-site-count" role="status">{visible.length} dari {sites.length} situs</p>
      </div>}
    </div>
  );
}
