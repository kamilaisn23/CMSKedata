import React, { useState, useEffect } from 'react';
import {
  Menu as MenuIcon,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Save,
  ExternalLink,
  Check,
} from 'lucide-react';
import { Site } from '../components/Navbar';
import { useToast } from '../components/Toast';

interface MenuItem {
  id: string;
  label: string;
  url: string;
  target: '_self' | '_blank';
}

interface MenuData {
  id: string;
  siteId: string;
  name: string;
  location: 'HEADER' | 'FOOTER' | 'SIDEBAR';
  itemsJson: string;
}

export const MenusView: React.FC<{ activeSite: Site | null }> = ({ activeSite }) => {
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [activeLocation, setActiveLocation] = useState<'HEADER' | 'FOOTER' | 'SIDEBAR'>('HEADER');
  const [currentMenu, setCurrentMenu] = useState<MenuData | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [menuName, setMenuName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New Item State
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newTarget, setNewTarget] = useState<'_self' | '_blank'>('_self');

  const { showToast } = useToast();

  useEffect(() => {
    if (activeSite) {
      loadMenus();
    }
  }, [activeSite]);

  useEffect(() => {
    // Switch menu when location changes
    const found = menus.find((m) => m.location === activeLocation);
    if (found) {
      setCurrentMenu(found);
      setMenuName(found.name);
      try {
        setItems(JSON.parse(found.itemsJson));
      } catch {
        setItems([]);
      }
    } else {
      setCurrentMenu(null);
      setMenuName(`Menu ${activeLocation}`);
      setItems([]);
    }
  }, [activeLocation, menus]);

  const loadMenus = async () => {
    if (!activeSite) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/menus?siteId=${activeSite.id}`);
      const json = await res.json();
      if (json.data) setMenus(json.data);
    } catch {
      showToast('Gagal memuat menu navigasi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newUrl) {
      showToast('Label dan URL wajib diisi', 'error');
      return;
    }

    const newItem: MenuItem = {
      id: Math.random().toString(36).substring(2, 9),
      label: newLabel,
      url: newUrl,
      target: newTarget,
    };

    setItems((prev) => [...prev, newItem]);
    setNewLabel('');
    setNewUrl('');
    setNewTarget('_self');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setItems(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setItems(updated);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSaveMenu = async () => {
    if (!activeSite) return;
    setSaving(true);
    try {
      const payload = {
        name: menuName || `Menu ${activeLocation}`,
        location: activeLocation,
        itemsJson: JSON.stringify(items),
      };

      const url = currentMenu
        ? `/api/admin/menus/${currentMenu.id}`
        : `/api/admin/menus?siteId=${activeSite.id}`;
      const method = currentMenu ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Gagal menyimpan menu');

      showToast('Menu navigasi berhasil disimpan', 'success');
      loadMenus();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cms-page p-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
            Menu Navigasi
          </h1>
          <p className="text-[13px] text-slate-500">
            Atur struktur tautan header, footer, dan bilah samping untuk situs {activeSite?.name}
          </p>
        </div>

        <button
          onClick={handleSaveMenu}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-[#242a31] hover:bg-[#3a424c] rounded-lg transition  cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Menu'}</span>
        </button>
      </div>

      {/* Location Selectors */}
      <div className="flex border-b border-slate-200 dark:border-[#3E4651] gap-6 text-sm font-medium">
        {(['HEADER', 'FOOTER', 'SIDEBAR'] as const).map((loc) => (
          <button
            key={loc}
            onClick={() => setActiveLocation(loc)}
            className={`pb-3 flex items-center gap-2 transition cursor-pointer ${
              activeLocation === loc
                ? 'border-b-2 border-[#6C7A89] text-[#6C7A89] dark:text-[#8E9BA9]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MenuIcon className="w-4 h-4" />
            <span>Navigasi {loc}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items Ordering List */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-5  flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100">
                Susunan Menu {activeLocation}
              </h3>
              <p className="text-[13px] text-slate-500">
                Gunakan tombol naik/turun untuk mengatur urutan tampilan
              </p>
            </div>
            <span className="text-[13px] font-medium text-[#6C7A89]">
              {items.length} Item Tautan
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {items.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-[13px]">
                Belum ada tautan di menu ini. Tambahkan item di bilah samping kanan.
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-[#3E4651] bg-slate-50 dark:bg-[#282E35] transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#1E2328] text-slate-600 dark:text-slate-300 flex items-center justify-center font-medium text-[13px]">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium text-[13px] text-slate-800 dark:text-slate-100">
                        {item.label}
                      </div>
                      <div className="text-[13px] text-slate-500 font-mono flex items-center gap-1">
                        <span>{item.url}</span>
                        {item.target === '_blank' && (
                          <span className="text-[13px] text-[#6C7A89]">(tab baru)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-20 rounded"
                      title="Geser Naik"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === items.length - 1}
                      className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-20 rounded"
                      title="Geser Turun"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-600 rounded ml-2"
                      title="Hapus Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Item Form */}
        <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-5  flex flex-col gap-4">
          <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#6C7A89]" />
            <span>Tambah Item Tautan</span>
          </h3>

          <form onSubmit={handleAddItem} className="flex flex-col gap-3">
            <div>
              <label htmlFor="cms-menusview-1" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Label Teks
              </label>
              <input id="cms-menusview-1"
                type="text"
                required
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="mis. Beranda, Tentang Kami"
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="cms-menusview-2" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                URL / Tautan
              </label>
              <input id="cms-menusview-2"
                type="text"
                required
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="mis. /about atau https://..."
                className="w-full px-3 py-2 text-[13px] font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="cms-menusview-3" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Jendela
              </label>
              <select id="cms-menusview-3"
                value={newTarget}
                onChange={(e: any) => setNewTarget(e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="_self">Jendela yang Sama (_self)</option>
                <option value="_blank">Tab Baru (_blank)</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambahkan ke Daftar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
