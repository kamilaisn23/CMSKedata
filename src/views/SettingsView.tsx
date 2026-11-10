import React, { useState, useEffect } from 'react';
import { Settings, Save, Globe, Mail, Phone, Share2, FileText } from 'lucide-react';
import { Site } from '../components/Navbar';
import { useToast } from '../components/Toast';

export const SettingsView: React.FC<{ activeSite: Site | null }> = ({ activeSite }) => {
  const [siteTitle, setSiteTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [footerText, setFooterText] = useState('');
  const [customMetadata, setCustomMetadata] = useState('{}');

  // Social Links
  const [twitter, setTwitter] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [instagram, setInstagram] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (activeSite) {
      loadSettings();
    }
  }, [activeSite]);

  const loadSettings = async () => {
    if (!activeSite) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/settings?siteId=${activeSite.id}`);
      const json = await res.json();
      if (json.data) {
        const s = json.data;
        setSiteTitle(s.siteTitle || activeSite.name);
        setTagline(s.tagline || '');
        setLogoUrl(s.logoUrl || '');
        setFaviconUrl(s.faviconUrl || '');
        setContactEmail(s.contactEmail || '');
        setContactPhone(s.contactPhone || '');
        setFooterText(s.footerText || '');
        setCustomMetadata(s.customMetadata || '{}');

        try {
          const links = JSON.parse(s.socialLinks || '{}');
          setTwitter(links.twitter || '');
          setGithub(links.github || '');
          setLinkedin(links.linkedin || '');
          setInstagram(links.instagram || '');
        } catch {}
      }
    } catch {
      showToast('Gagal memuat pengaturan situs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite) return;
    setSaving(true);

    try {
      const socialLinksObj = {
        twitter: twitter.trim(),
        github: github.trim(),
        linkedin: linkedin.trim(),
        instagram: instagram.trim(),
      };

      const payload = {
        siteTitle,
        tagline,
        logoUrl,
        faviconUrl,
        contactEmail,
        contactPhone,
        socialLinks: JSON.stringify(socialLinksObj),
        footerText,
        customMetadata,
      };

      const res = await fetch(`/api/admin/settings?siteId=${activeSite.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Gagal menyimpan pengaturan');

      showToast('Pengaturan situs berhasil diperbarui', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cms-page cms-settings-page p-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
            Pengaturan Situs
          </h1>
          <p className="text-[13px] text-slate-500">
            Konfigurasi identitas publik, logo, kontak, dan tautan sosial untuk {activeSite?.name}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-[#242a31] hover:bg-[#3a424c] rounded-lg transition  cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Identitas Situs */}
        <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-6  flex flex-col gap-4">
          <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#6C7A89]" />
            <span>Identitas & Merek</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cms-settingsview-1" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Judul Situs (Site Title)
              </label>
              <input id="cms-settingsview-1"
                type="text"
                required
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                placeholder="mis. Kedata Engineering & Tech Blog"
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="cms-settingsview-2" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tagline / Slogan
              </label>
              <input id="cms-settingsview-2"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="mis. Catatan teknis & arsitektur digital"
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="cms-settingsview-3" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Logo URL
              </label>
              <input id="cms-settingsview-3"
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://.../logo.png"
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="mt-2 h-10 object-contain rounded" />
              )}
            </div>

            <div>
              <label htmlFor="cms-settingsview-4" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Favicon URL
              </label>
              <input id="cms-settingsview-4"
                type="text"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://.../favicon.ico"
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Informasi Kontak */}
        <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-6  flex flex-col gap-4">
          <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#6C7A89]" />
            <span>Kontak Resmi</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cms-settingsview-5" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Kontak
              </label>
              <input id="cms-settingsview-5"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@kedata.id"
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="cms-settingsview-6" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Telepon
              </label>
              <input id="cms-settingsview-6"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+62 21 555-0192"
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Tautan Media Sosial */}
        <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-6  flex flex-col gap-4">
          <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#6C7A89]" />
            <span>Tautan Media Sosial</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cms-settingsview-7" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Twitter / X URL
              </label>
              <input id="cms-settingsview-7"
                type="url"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://twitter.com/..."
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="cms-settingsview-8" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GitHub URL
              </label>
              <input id="cms-settingsview-8"
                type="url"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="cms-settingsview-9" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                LinkedIn URL
              </label>
              <input id="cms-settingsview-9"
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/company/..."
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="cms-settingsview-10" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Instagram URL
              </label>
              <input id="cms-settingsview-10"
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-6  flex flex-col gap-4">
          <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#6C7A89]" />
            <span>Teks Hak Cipta & Footer</span>
          </h3>

          <div>
            <textarea
              rows={2}
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="mis. © 2026 PT Kedata Indonesia. All rights reserved."
              className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </form>
    </div>
  );
};
