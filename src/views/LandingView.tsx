import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Menu, X, FileText, Globe, Search, Check } from 'lucide-react';
import { KedataMark } from '../components/KedataMark';
import './landing.css';

type Tone = 'published' | 'scheduled' | 'draft';
type Item = { title: string; status: string; tone: Tone; date: string; excerpt: string };
type Site = { id: string; name: string; article: Item[]; page: Item[] };

// Public seed examples; this page never fetches private editorial content.
const sites: Site[] = [
  {
    id: 'tech',
    name: 'Kedata Tech Blog',
    article: [
      { title: 'Building Modern Headless Architectures with Kedata CMS', status: 'Terbit', tone: 'published', date: '6 Nov', excerpt: 'Arsitektur headless memisahkan pengelolaan konten dari lapisan tampilan, sehingga setiap situs bisa memakai stack yang paling cocok.' },
      { title: 'Kedata CMS v2.0 Roadmap and Community Features', status: 'Terjadwal', tone: 'scheduled', date: '8 Nov', excerpt: 'Rencana rilis 2.0 mencakup editor kolaboratif, pratinjau draf bertoken, dan endpoint API yang lebih ringkas.' },
      { title: 'Internal Guidelines: High Performance Web Vitals', status: 'Draf', tone: 'draft', date: '9 Nov', excerpt: 'Panduan internal untuk menjaga metrik inti tetap sehat: ukuran gambar, pemuatan font, dan anggaran JavaScript.' },
      { title: 'Why Framework-Agnostic APIs Win the Long Game', status: 'Terbit', tone: 'published', date: '4 Nov', excerpt: 'API yang netral framework membuat konten tetap bisa dipakai saat tim berganti teknologi di kemudian hari.' },
    ],
    page: [
      { title: 'Tentang Kedata', status: 'Terbit', tone: 'published', date: '5 Nov', excerpt: 'Halaman profil perusahaan: siapa kami, bagaimana kami bekerja, dan prinsip yang kami pegang.' },
      { title: 'Kontak', status: 'Terbit', tone: 'published', date: '2 Nov', excerpt: 'Informasi kontak, alamat kantor, dan kanal dukungan untuk pengguna workspace.' },
      { title: 'Karier', status: 'Draf', tone: 'draft', date: '9 Nov', excerpt: 'Daftar posisi yang sedang dibuka beserta ringkasan tanggung jawab dan cara melamar.' },
    ],
  },
  {
    id: 'corp',
    name: 'Kedata Corporate Portal',
    article: [
      { title: 'Kedata Secures Strategic Growth Capital to Expand Cloud Offerings', status: 'Terbit', tone: 'published', date: '6 Nov', excerpt: 'Pengumuman pendanaan strategis untuk memperluas layanan cloud dan jangkauan regional.' },
      { title: 'Quarterly Product Update: Multi-Site Workflows', status: 'Terjadwal', tone: 'scheduled', date: '10 Nov', excerpt: 'Ringkasan pembaruan kuartal: alur kerja multi-situs, audit log, dan perbaikan editor.' },
    ],
    page: [
      { title: 'Profil Perusahaan', status: 'Terbit', tone: 'published', date: '1 Nov', excerpt: 'Sejarah, visi, dan struktur organisasi Kedata Indonesia Digital.' },
      { title: 'Investor Relations', status: 'Draf', tone: 'draft', date: '7 Nov', excerpt: 'Ringkasan informasi bagi investor: laporan, pengumuman, dan jadwal pertemuan.' },
      { title: 'Legal', status: 'Terbit', tone: 'published', date: '30 Okt', excerpt: 'Kebijakan privasi, ketentuan layanan, dan pernyataan pemrosesan data.' },
    ],
  },
];

const capabilities = [
  { name: 'Tulis', desc: 'Editor visual TipTap untuk artikel dan halaman, lengkap dengan format teks, tautan, gambar, dan blok kode.' },
  { name: 'Susun', desc: 'Susun menu dan struktur halaman tiap situs langsung dari dasbor, tanpa menyentuh kode.' },
  { name: 'Tinjau', desc: 'Riwayat versi dan audit log mencatat setiap perubahan sebelum dipulihkan.' },
  { name: 'Jadwalkan', desc: 'Siapkan draf dan jadwal terbit; API publik hanya mengembalikan konten yang sudah terbit.' },
  { name: 'Kelola aset', desc: 'Media tersimpan per situs, dengan pemilihan aset asli untuk setiap halaman.' },
  { name: 'Hubungkan', desc: 'REST API dengan API key per situs untuk React, Nuxt, Laravel, atau aplikasi mobile.' },
];

const stages = [
  { name: 'Tulis', desc: 'Draf tersimpan saat Anda menulis, lengkap dengan format dan media.', time: 'Otomatis' },
  { name: 'Tinjau', desc: 'Bandingkan riwayat versi dan setujui perubahan bersama tim.', time: 'Sekali klik' },
  { name: 'Terbit', desc: 'Rilis sekarang atau jadwalkan untuk waktu yang Anda tentukan.', time: 'Di bawah 1 detik' },
  { name: 'Hubungkan', desc: 'Webhook mengabari layanan Anda setiap kali konten berubah.', time: 'Seketika' },
];

const snippets = {
  JavaScript: `const response = await fetch(
  '/api/v1/posts?fields=title,slug',
  { headers: { 'x-api-key': siteApiKey } }
);

const { data, meta } = await response.json();`,
  PHP: `$request = curl_init(
  $cmsUrl . '/api/v1/posts?fields=title,slug'
);
curl_setopt_array($request, [
  CURLOPT_HTTPHEADER => ['x-api-key: ' . $siteApiKey],
  CURLOPT_RETURNTRANSFER => true,
]);
$result = json_decode(curl_exec($request), true);`,
};

const responseSample = `HTTP/1.1 200 OK
{
  "data": [
    {
      "id": "post_01",
      "title": "Building Modern Headless Architecture",
      "slug": "building-modern-headless-architecture"
    },
    {
      "id": "post_02",
      "title": "Why Framework-Agnostic APIs Win",
      "slug": "framework-agnostic-apis"
    }
  ],
  "meta": { "page": 1, "perPage": 2, "total": 4 }
}`;

const teamPaths = [
  {
    name: 'Tim konten',
    title: 'Fokus pada cerita Anda.',
    description: 'Dari draf pertama hingga siap terbit, kelola tulisan dan aset tanpa berpindah-pindah aplikasi.',
    rows: [
      ['Artikel & halaman', 'Tulis dan sunting lewat editor visual.'],
      ['Media', 'Temukan gambar dan aset di situs yang tepat.'],
      ['Jadwal terbit', 'Siapkan konten untuk waktu publikasi Anda.'],
    ],
    link: '#demo', action: 'Jelajahi contoh konten',
  },
  {
    name: 'Pengelola situs',
    title: 'Banyak situs, tetap teratur.',
    description: 'Pilih situs yang sedang dikerjakan. Konten, menu, dan pengaturannya berada dalam ruang masing-masing.',
    rows: [
      ['Multi-situs', 'Pindah konteks situs dari satu workspace.'],
      ['Navigasi', 'Susun menu untuk kebutuhan setiap website.'],
      ['Aktivitas', 'Tinjau perubahan lewat audit log.'],
    ],
    link: '/login', action: 'Buka workspace situs',
  },
  {
    name: 'Pengembang',
    title: 'Konten siap untuk stack Anda.',
    description: 'Ambil konten terbit melalui REST API. Frontend tetap memakai framework dan tampilan pilihan tim Anda.',
    rows: [
      ['REST API', 'Ambil artikel, halaman, menu, dan media.'],
      ['API key', 'Hubungkan aplikasi ke situs yang sesuai.'],
      ['OpenAPI', 'Periksa parameter dan coba request langsung.'],
    ],
    link: '/docs', action: 'Buka dokumentasi API',
  },
];

const catalog = sites.flatMap(site => [
  ...site.article.map(item => ({ ...item, site: site.name, siteId: site.id, type: 'Artikel' })),
  ...site.page.map(item => ({ ...item, site: site.name, siteId: site.id, type: 'Halaman' })),
]);

const searchExamples = ['Tentang', 'API', 'Karier'];

export const LandingView: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | null>(null);
  const copyTimer = useRef<number | null>(null);

  const [query, setQuery] = useState('');
  const [demoSite, setDemoSite] = useState(0);
  const [demoItem, setDemoItem] = useState(0);
  const previewSite = sites[demoSite];
  const previewItem = previewSite.article[demoItem];
  const [siteFilter, setSiteFilter] = useState<'all' | Site['id']>('all');
  const [language, setLanguage] = useState<keyof typeof snippets>('JavaScript');
  const [mode, setMode] = useState<'request' | 'response'>('request');
  const [typed, setTyped] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [active, setActive] = useState('fitur');
  const [teamPath, setTeamPath] = useState(0);
  const selectedPath = teamPaths[teamPath];
  const [editorStage, setEditorStage] = useState(0);
  const [sampleTitle, setSampleTitle] = useState('Cerita berikutnya dimulai di sini');
  const [sampleBody, setSampleBody] = useState('Bagikan ide, kabar terbaru, atau cerita dari tim Anda. Kelola semuanya dalam satu workspace, lalu hadirkan di website pilihan Anda.');

  const needle = query.trim().toLowerCase();
  const matchingItems = catalog.filter(item => {
    const matchesQuery = !needle || `${item.title} ${item.excerpt} ${item.site}`.toLowerCase().includes(needle);
    return matchesQuery && (siteFilter === 'all' || item.siteId === siteFilter);
  });
  const results = matchingItems.slice(0, 4);

  useEffect(() => {
    const page = root.current;
    if (!page || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    page.querySelectorAll('.kd-reveal').forEach(item => observer.observe(item));
    page.classList.add('kd-motion');
    return () => { observer.disconnect(); page.classList.remove('kd-motion'); };
  }, []);

  useEffect(() => {
    const ids = ['fitur', 'alur', 'integrasi', 'untuk-tim'];
    const sections = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!sections.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: '-42% 0px -52% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'smooth';
    return () => { html.style.scrollBehavior = previous; };
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setNavOpen(false); toggleRef.current?.focus(); }
    };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!headerRef.current?.contains(event.target)) setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [navOpen]);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);

  const runSample = () => {
    if (timer.current) window.clearInterval(timer.current);
    setMode('response');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTyped(responseSample); return; }
    setTyped('');
    let index = 0;
    timer.current = window.setInterval(() => {
      index += 4;
      setTyped(responseSample.slice(0, index));
      if (index >= responseSample.length) {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
      }
    }, 16);
  };

  const copySample = async () => {
    try {
      await navigator.clipboard.writeText(snippets[language]);
      setCopied(true);
      setCopyMessage('Contoh request berhasil disalin.');
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => {
        setCopied(false);
        setCopyMessage('');
      }, 2000);
    } catch {
      setCopied(false);
      setCopyMessage('Clipboard tidak tersedia. Salin kode langsung dari contoh di atas.');
    }
  };

  const codeShown = mode === 'response' ? typed : snippets[language];

  return (
    <div ref={root} className="kd-landing">
      <a className="kd-skip" href="#konten">Lewati ke konten</a>
      <header ref={headerRef} className="kd-header">
        <a href="/" className="kd-brand" aria-label="Kedata CMS beranda"><KedataMark className="h-9 w-9" /><span>Kedata CMS</span></a>
        <div className="kd-header-actions">
          <nav id="kd-nav" className={`kd-nav-links${navOpen ? ' is-open' : ''}`} aria-label="Navigasi utama">
            <a href="#fitur" className={active === 'fitur' ? 'is-active' : undefined} aria-current={active === 'fitur' ? 'true' : undefined} onClick={() => setNavOpen(false)}>Kemampuan</a>
            <a href="#alur" className={active === 'alur' ? 'is-active' : undefined} aria-current={active === 'alur' ? 'true' : undefined} onClick={() => setNavOpen(false)}>Alur kerja</a>
            <a href="#integrasi" className={active === 'integrasi' ? 'is-active' : undefined} aria-current={active === 'integrasi' ? 'true' : undefined} onClick={() => setNavOpen(false)}>Integrasi</a>
            <a href="#untuk-tim" className={active === 'untuk-tim' ? 'is-active' : undefined} aria-current={active === 'untuk-tim' ? 'true' : undefined} onClick={() => setNavOpen(false)}>Untuk tim</a>
            <a href="/docs" onClick={() => setNavOpen(false)}>Dokumentasi</a>
          </nav>
          <button ref={toggleRef} type="button" className="kd-nav-toggle" aria-expanded={navOpen} aria-controls="kd-nav" aria-label={navOpen ? 'Tutup menu' : 'Buka menu'} onClick={() => setNavOpen(open => !open)}>
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main id="konten">
        <section className="kd-hero" aria-labelledby="kd-title">
          <div className="kd-hero-stage" onPointerMove={event => {
            if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const frame = event.currentTarget.getBoundingClientRect();
            event.currentTarget.style.setProperty('--hero-x', `${(event.clientX - frame.left - frame.width / 2) * .025}px`);
            event.currentTarget.style.setProperty('--hero-y', `${(event.clientY - frame.top - frame.height / 2) * .025}px`);
          }} onPointerLeave={event => {
            event.currentTarget.style.setProperty('--hero-x', '0px');
            event.currentTarget.style.setProperty('--hero-y', '0px');
          }}>
            <div className="kd-hero-landscape" aria-hidden="true">
              <svg className="kd-hero-ribbon kd-hero-ribbon-back" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
                <path d="M-100 150 C350 -180 500 210 900 90 S1400 -40 1750 200 L1750 -100 L-100 -100Z" />
                <path d="M-100 820 C300 420 650 1060 1100 650 S1500 450 1750 580 L1750 1100 L-100 1100Z" />
              </svg>
              <svg className="kd-hero-contours" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
                {Array.from({ length: 14 }, (_, index) => <path key={index} d={`M-200 ${460 + index * 23} C160 ${80 + index * 22} 360 ${970 + index * 8} 850 ${550 + index * 17} S1320 ${80 + index * 24} 1800 ${300 + index * 22}`} />)}
              </svg>
              <svg className="kd-hero-ribbon kd-hero-ribbon-front" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><path d="M-150 950 C80 540 380 1060 800 850 S1420 540 1780 760 L1780 1100 L-150 1100Z" /></svg>
              <div className="kd-hero-orbit kd-hero-orbit-one" />
              <div className="kd-hero-orbit kd-hero-orbit-two" />
            </div>
            <svg className="kd-hero-seam" viewBox="0 0 1600 180" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C400 170 1050 -15 1600 85 L1600 180 L0 180Z" /></svg>
          <div className="kd-hero-copy">
            <h1 id="kd-title" className="kd-hero-statement">Semua situs.<br />Satu dasbor.</h1>
            <p className="kd-hero-description">Ruang untuk konten Anda berkembang. Tulis, kelola, dan terbitkan ke banyak website dari satu workspace yang rapi.</p>
            <div className="kd-hero-buttons">
              <a href="/login" className="kd-primary">Masuk ke workspace <ArrowRight size={16} /></a>
              <a href="#demo" className="kd-text-link">Jelajahi demo <ArrowUpRight size={16} /></a>
            </div>
            <p className="kd-hero-note"><Check size={15} /> Multi-situs <span>·</span> REST API <span>·</span> Editor visual</p>
          </div>
          </div>
          <div id="demo" className="kd-demo" data-ui aria-label="Demo interaktif workspace">
            <div className="kd-demo-top"><span><KedataMark className="h-6 w-6" /> Workspace</span><span className="kd-demo-label">Demo interaktif</span></div>
            <div className="kd-demo-body">
              <div className="kd-demo-sites" role="group" aria-label="Pilih situs demo">
                {sites.map((site, index) => <button key={site.id} type="button" aria-pressed={demoSite === index} onClick={() => { setDemoSite(index); setDemoItem(0); }}><Globe size={16} />{site.name}<ArrowUpRight size={14} /></button>)}
              </div>
              <div className="kd-demo-heading"><h2>Konten terbaru</h2><span>{previewSite.article.length} artikel</span></div>
              <div className="kd-demo-articles" role="group" aria-label="Pilih artikel untuk pratinjau">
                {previewSite.article.map((item, index) => <button key={item.title} type="button" aria-pressed={demoItem === index} onClick={() => setDemoItem(index)}><FileText size={17} /><span>{item.title}</span><span className={`kd-demo-status kd-tone-${item.tone}`}>{item.status}</span></button>)}
              </div>
              <div className="kd-demo-preview" key={previewItem.title} aria-live="polite"><span>Pratinjau artikel · {previewItem.date}</span><p className="kd-demo-title">{previewItem.title}</p><p>{previewItem.excerpt}</p></div>
            </div>
            <div className="kd-demo-foot"><span><span className="kd-online" /> Contoh konten, aman untuk dijelajahi</span><ArrowRight size={15} /></div>
          </div>
        </section>

        <section className="kd-search" aria-labelledby="kd-search-title">
          <h2 id="kd-search-title" className="kd-search-title">Cari konten di seluruh situs</h2>
          <label className="kd-sr" htmlFor="kd-search-input">Ketik untuk menyaring contoh konten</label>
          <div className="kd-search-live" data-ui>
            <div className="kd-search-control">
              <Search size={22} aria-hidden="true" />
              <input
                id="kd-search-input"
                className="kd-search-input"
                type="text"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Ketik judul atau kata kunci"
                autoComplete="off"
                spellCheck={false}
              />
              {query && <button className="kd-search-clear" type="button" onClick={() => setQuery('')}>Hapus pencarian</button>}
            </div>
            <p className="kd-search-count" role="status" aria-live="polite">
              {matchingItems.length ? `Menampilkan ${results.length} dari ${matchingItems.length} contoh konten` : 'Tidak ada contoh konten yang cocok'}
            </p>
            <ul className="kd-search-results" aria-label="Hasil contoh konten">
              {results.map(item => (
                <li className="kd-result" key={`${item.site}-${item.type}-${item.title}`}>
                  <p className="kd-result-title">{item.title}</p>
                  <p className="kd-result-meta">{item.site} · {item.type} · <span className={`kd-tone-${item.tone}`}>{item.status}</span></p>
                </li>
              ))}
              {!results.length && <li className="kd-result is-empty">Coba kata kunci lain atau pilih semua situs.</li>}
            </ul>
          </div>
          <div className="kd-search-filters" role="group" aria-label="Filter konten berdasarkan situs">
            <span className="kd-search-filter-label">Situs</span>
            <button type="button" aria-pressed={siteFilter === 'all'} onClick={() => setSiteFilter('all')}>Semua situs</button>
            {sites.map(site => (
              <button key={site.id} type="button" aria-pressed={siteFilter === site.id} onClick={() => setSiteFilter(site.id)}>{site.name}</button>
            ))}
          </div>
          <div className="kd-search-examples">
            <span>Coba:</span>
            {searchExamples.map(example => <button key={example} type="button" onClick={() => setQuery(example)}>{example}</button>)}
          </div>
        </section>

        <section id="fitur" className="kd-capabilities" aria-labelledby="kd-cap-title">
          <h2 id="kd-cap-title" className="kd-cap-lead kd-reveal">Kemampuan</h2>
          <ol className="kd-cap-list">
            {capabilities.map(capability => (
              <li className="kd-cap-row kd-reveal" key={capability.name}>
                <h3 className="kd-cap-name">{capability.name}</h3>
                <p className="kd-cap-desc">{capability.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="kd-publishing" aria-labelledby="kd-publishing-title">
          <div className="kd-publishing-intro">
            <h2 id="kd-publishing-title">Dari ide ke publikasi</h2>
            <p>Coba alur konten Anda. Tulis cerita, periksa tampilannya, lalu lihat bagaimana konten siap diterbitkan.</p>
            <p className="kd-publishing-note">Demo lokal. Perubahan Anda hanya tampil di halaman ini.</p>
          </div>
          <div className="kd-publishing-demo" data-ui>
            <div className="kd-publishing-tabs" role="group" aria-label="Tahap demo publikasi">
              {['Tulis', 'Tinjau', 'Terbit'].map((label, index) => <button type="button" key={label} aria-pressed={editorStage === index} onClick={() => setEditorStage(index)}>{label}{index < editorStage && <Check size={14} />}</button>)}
            </div>
            <div className="kd-publishing-bar"><span><FileText size={15} /> Artikel baru</span><span>{['Draf contoh', 'Pratinjau contoh', 'Simulasi terbit'][editorStage]}</span></div>
            <div className="kd-publishing-canvas">
              {editorStage === 0 ? <div className="kd-publishing-fields">
                <label htmlFor="kd-demo-title">Judul artikel</label>
                <input id="kd-demo-title" maxLength={120} value={sampleTitle} onChange={event => setSampleTitle(event.target.value)} placeholder="Tulis judul cerita Anda" />
                <label htmlFor="kd-demo-body">Isi cerita</label>
                <textarea id="kd-demo-body" maxLength={1200} rows={5} value={sampleBody} onChange={event => setSampleBody(event.target.value)} placeholder="Mulai menulis di sini�" />
              </div> : <article className="kd-publishing-preview">
                <h3>{sampleTitle.trim() || 'Artikel tanpa judul'}</h3>
                <p>{sampleBody.trim() || 'Belum ada isi cerita. Kembali ke Tulis untuk menambahkan konten.'}</p>
              </article>}
            </div>
            <div className="kd-publishing-bottom">
              <p role="status">{['Coba ubah judul dan isi cerita.', 'Periksa cerita sebelum melanjutkan.', 'Simulasi selesai. Konten tidak diterbitkan ke website.'][editorStage]}</p>
              <button type="button" className="kd-primary" onClick={() => setEditorStage(stage => (stage + 1) % 3)}>{['Tinjau cerita', 'Simulasikan terbit', 'Kembali menulis'][editorStage]}<ArrowRight size={15} /></button>
            </div>
          </div>
        </section>

        <section id="alur" className="kd-flow" aria-labelledby="kd-flow-title">
          <h2 id="kd-flow-title" className="kd-flow-head kd-reveal">Alur kerja</h2>
          <div className="kd-flow-grid">
            {stages.map(stage => (
              <div className="kd-flow-stage kd-reveal" key={stage.name}>
                <h3 className="kd-flow-name">{stage.name}</h3>
                <p className="kd-flow-desc">{stage.desc}</p>
                <p className="kd-flow-time">{stage.time}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="integrasi" className="kd-api kd-reveal" aria-labelledby="kd-api-title">
          <div className="kd-api-head">
            <h2 id="kd-api-title">Konten Anda. Stack pilihan Anda.</h2>
            <p>Ambil konten terbit lewat REST API dengan API key per situs. Hubungkan ke React, Nuxt, Laravel, atau aplikasi mobile.</p>
            <a href="/docs" className="kd-text-link">Baca dokumentasi API <ArrowRight size={16} /></a>
          </div>
          <div className="kd-code-sample" data-ui>
            <div className="kd-code-tabs" role="group" aria-label="Bahasa contoh integrasi">
              {(Object.keys(snippets) as (keyof typeof snippets)[]).map(item => (
                <button type="button" key={item} aria-pressed={language === item && mode === 'request'} onClick={() => { setLanguage(item); setMode('request'); }}>{item}</button>
              ))}
              <span>{mode === 'response' ? 'Respons 200 · contoh' : 'Contoh request'}</span>
            </div>
            <pre tabIndex={0} aria-label={mode === 'response' ? 'Contoh respons API' : `Contoh request ${language}`}><code>{codeShown || ' '}</code></pre>
            <div className="kd-code-foot">
              <button type="button" onClick={copySample}>{copied ? 'Tersalin' : 'Salin request'}</button>
              <span className="kd-copy-status" role="status" aria-live="polite">{copyMessage}</span>
              <button type="button" onClick={runSample}>{mode === 'response' ? 'Ulangi' : 'Jalankan'}</button>
            </div>
          </div>
        </section>

        <section id="untuk-tim" className="kd-team" aria-labelledby="kd-team-title">
          <div className="kd-team-intro">
            <h2 id="kd-team-title">Satu workspace.<br />Cara kerja Anda.</h2>
            <p>Menulis cerita, mengelola situs, atau membangun aplikasi. Temukan tempat Anda di Kedata.</p>
          </div>
          <div className="kd-team-workspace">
            <div className="kd-team-switch" role="group" aria-label="Pilih peran tim">
              {teamPaths.map((path, index) => <button key={path.name} type="button" aria-pressed={teamPath === index} aria-controls="kd-team-detail" onClick={() => setTeamPath(index)}>{path.name}</button>)}
            </div>
            <div id="kd-team-detail" className="kd-team-detail" key={selectedPath.name} aria-live="polite">
              <h3>{selectedPath.title}</h3>
              <p>{selectedPath.description}</p>
              <dl className="kd-team-tasks">
                {selectedPath.rows.map(([label, description]) => <div key={label}><dt>{label}</dt><dd>{description}</dd></div>)}
              </dl>
              <a className="kd-text-link" href={selectedPath.link}>{selectedPath.action}<ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section className="kd-close" aria-labelledby="kd-close-title">
          <div className="kd-close-panel">
            <div className="kd-close-copy">
              <h2 id="kd-close-title">Cerita Anda berikutnya,<br />mulai dari sini.</h2>
              <p>Satu ruang untuk ide, konten, dan semua situs Anda. Buka workspace dan lanjutkan cerita tim Anda.</p>
            </div>
            <div className="kd-close-actions">
              <a href="/login" className="kd-primary">Buka workspace <ArrowRight size={16} aria-hidden="true" /></a>
              <a href="/docs" className="kd-text-link">Pelajari integrasi API <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="kd-site-footer">
        <div className="kd-site-footer-main">
          <div className="kd-site-footer-identity">
            <a href="/" className="kd-brand" aria-label="Kedata CMS beranda"><KedataMark className="h-8 w-8" /><span>Kedata CMS</span></a>
            <p>Konten terpusat.<br />Website tetap milik Anda.</p>
          </div>
          <nav aria-label="Tautan footer" className="kd-site-footer-links">
            <a href="/docs">Dokumentasi API</a>
            <a href="#demo">Jelajahi demo</a>
            <a href="/rss.xml">RSS</a>
            <a href="/health">Status layanan</a>
          </nav>
        </div>
        <div className="kd-site-footer-bottom">
          <p>© {new Date().getFullYear()} Kedata CMS</p>
          <a href="#konten">Kembali ke atas <ArrowUpRight size={14} aria-hidden="true" /></a>
        </div>
      </footer>
    </div>
  );
};
