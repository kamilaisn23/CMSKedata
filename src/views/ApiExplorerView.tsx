import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Layers,
  FileCode,
  Zap,
} from 'lucide-react';
import { Site } from '../components/Navbar';
import { useToast } from '../components/Toast';

export const ApiExplorerView: React.FC<{ activeSite: Site | null }> = ({ activeSite }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState('/posts');
  const [slugParam, setSlugParam] = useState('building-headless-cms');
  const [fieldsParam, setFieldsParam] = useState('');
  const [includeParam, setIncludeParam] = useState('category,tags');
  const [categoryParam, setCategoryParam] = useState('');
  const [searchParam, setSearchParam] = useState('');
  const [perPageParam, setPerPageParam] = useState('5');
  const [customApiKey, setCustomApiKey] = useState('');

  // Execution state
  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseBody, setResponseBody] = useState<any>(null);

  // Snippet Tab
  const [snippetTab, setSnippetTab] = useState<'curl' | 'nextjs' | 'vue' | 'html' | 'sdk'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const { showToast } = useToast();

  const apiKeyToUse = customApiKey || activeSite?.apiKeyPrefix || 'kd_live_demo_key';

  // Construct Query String
  const queryParams = new URLSearchParams();
  if (fieldsParam) queryParams.set('fields', fieldsParam);
  if (includeParam && selectedEndpoint.startsWith('/posts')) queryParams.set('include', includeParam);
  if (categoryParam) queryParams.set('category', categoryParam);
  if (searchParam) queryParams.set('search', searchParam);
  if (perPageParam) queryParams.set('perPage', perPageParam);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const finalPath = selectedEndpoint.includes(':slug')
    ? selectedEndpoint.replace(':slug', slugParam || 'sample') + queryString
    : selectedEndpoint + queryString;

  const fullUrl = `${window.location.origin}/api/v1${finalPath}`;

  const handleExecuteRequest = async () => {
    setLoading(true);
    setResponseBody(null);
    setResponseStatus(null);
    const start = performance.now();

    try {
      const res = await fetch(`/api/v1${finalPath}`, {
        headers: {
          'x-api-key': apiKeyToUse,
        },
      });

      const end = performance.now();
      setResponseTimeMs(Math.round(end - start));
      setResponseStatus(res.status);

      const headersObj: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headersObj[key] = val;
      });
      setResponseHeaders(headersObj);

      const json = await res.json();
      setResponseBody(json);
      showToast(`Respons HTTP ${res.status} diterima (${Math.round(end - start)} ms)`, 'info');
    } catch (err: any) {
      setResponseBody({ error: err.message });
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generate code snippet according to selected tab
  const getSnippet = () => {
    switch (snippetTab) {
      case 'curl':
        return `curl -X GET "${fullUrl}" \\
  -H "x-api-key: ${apiKeyToUse}" \\
  -H "Accept: application/json"`;

      case 'nextjs':
        return `// Next.js (App Router / Server Component)
import { revalidateTag } from 'next/cache';

export async function getPosts() {
  const res = await fetch('${fullUrl}', {
    headers: {
      'x-api-key': process.env.KEDATA_API_KEY!,
    },
    next: { tags: ['kedata-posts'], revalidate: 3600 },
  });

  if (!res.ok) throw new Error('Gagal mengambil konten dari Kedata CMS');
  const { data } = await res.json();
  return data;
}

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <main>
      <h1>Artikel Kedata CMS</h1>
      {posts.map((post: any) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
        </article>
      ))}
    </main>
  );
}`;

      case 'vue':
        return `<!-- Vue 3 / Nuxt 3 (useFetch) -->
<script setup>
const config = useRuntimeConfig();
const { data: response, pending, error } = await useFetch('${fullUrl}', {
  headers: {
    'x-api-key': config.public.kedataApiKey,
  },
});
</script>

<template>
  <div v-if="pending">Memuat artikel...</div>
  <div v-else-if="error">Gagal: {{ error.message }}</div>
  <div v-else>
    <article v-for="post in response?.data" :key="post.id">
      <h2>{{ post.title }}</h2>
      <div v-html="post.contentHtml" />
    </article>
  </div>
</template>`;

      case 'html':
        return `<!-- Static HTML + Standalone Embed Script (Zero Framework) -->
<!DOCTYPE html>
<html>
<head>
  <title>Situs Statis Saya</title>
</head>
<body>
  <h1>Berita Terbaru</h1>
  <!-- Kontainer tempat artikel dirender -->
  <div id="kedata-container"></div>

  <!-- Satu baris script embed -->
  <script
    src="${window.location.origin}/cms-embed.js"
    data-api-url="${window.location.origin}/api/v1"
    data-api-key="${apiKeyToUse}"
    data-container="#kedata-container"
    data-type="posts"
    data-limit="5"
    data-theme="light">
  </script>
</body>
</html>`;

      case 'sdk':
        return `// Menggunakan SDK Resmi @kedata/cms-client (TypeScript)
import { KedataCmsClient } from '@kedata/cms-client';

const cms = new KedataCmsClient({
  baseUrl: '${window.location.origin}/api/v1',
  apiKey: process.env.KEDATA_API_KEY!,
});

// Ambil daftar artikel dengan filter & relasi terpadu
const { data: posts, meta } = await cms.posts.list({
  perPage: 10,
  include: ['category', 'tags'],
  fields: ['title', 'slug', 'excerpt', 'publishedAt'],
});

console.log(\`Total artikel: \${meta.total}\`);
for (const post of posts) {
  console.log(\`- \${post.title} (/\${post.slug})\`);
}`;
    }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getSnippet());
    setCopiedSnippet(true);
    showToast('Cuplikan kode disalin!', 'info');
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="cms-page p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Terminal className="w-6 h-6 text-[#6C7A89]" />
            <span>API Playground & SDK Integrasi</span>
          </h1>
          <p className="text-[13px] text-slate-500">
            Uji endpoint REST API publik langsung dari dasbor dan salin kode integrasi untuk Next.js, Vue, Nuxt, HTML, atau cURL
          </p>
        </div>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg hover:text-[#6C7A89] transition "
        >
          <Code2 className="w-4 h-4 text-[#6C7A89]" />
          <span>Buka OpenAPI Interactive Docs</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Request Builder */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-5  flex flex-col gap-4">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#6C7A89]" />
              <span>Konfigurasi Permintaan (Request)</span>
            </h3>

            {/* Endpoint Selector */}
            <div>
              <label htmlFor="cms-apiexplorerview-1" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Endpoint
              </label>
              <select id="cms-apiexplorerview-1"
                value={selectedEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
                className="w-full px-3 py-2 text-[13px] font-mono font-medium bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="/posts">GET /posts (Daftar Artikel)</option>
                <option value="/posts/:slug">GET /posts/:slug (Detail Artikel)</option>
                <option value="/pages">GET /pages (Daftar Halaman)</option>
                <option value="/pages/:slug">GET /pages/:slug (Detail Halaman)</option>
                <option value="/categories">GET /categories (Daftar Kategori)</option>
                <option value="/tags">GET /tags (Daftar Tag)</option>
                <option value="/menus">GET /menus (Navigasi Menu)</option>
                <option value="/settings">GET /settings (Pengaturan & Kontak)</option>
              </select>
            </div>

            {/* Slug parameter if applicable */}
            {selectedEndpoint.includes(':slug') && (
              <div>
                <label htmlFor="cms-apiexplorerview-2" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parameter Slug (:slug)
                </label>
                <input id="cms-apiexplorerview-2"
                  type="text"
                  value={slugParam}
                  onChange={(e) => setSlugParam(e.target.value)}
                  placeholder="mis. building-headless-cms"
                  className="w-full px-3 py-1.5 text-[13px] font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {/* Query parameters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cms-apiexplorerview-3" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Field Selection (?fields=)
                </label>
                <input id="cms-apiexplorerview-3"
                  type="text"
                  value={fieldsParam}
                  onChange={(e) => setFieldsParam(e.target.value)}
                  placeholder="title,slug,publishedAt"
                  className="w-full px-2.5 py-1.5 text-[13px] font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="cms-apiexplorerview-4" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Relasi (?include=)
                </label>
                <input id="cms-apiexplorerview-4"
                  type="text"
                  value={includeParam}
                  onChange={(e) => setIncludeParam(e.target.value)}
                  placeholder="category,tags"
                  className="w-full px-2.5 py-1.5 text-[13px] font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="cms-apiexplorerview-5" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pencarian (?search=)
                </label>
                <input id="cms-apiexplorerview-5"
                  type="text"
                  value={searchParam}
                  onChange={(e) => setSearchParam(e.target.value)}
                  placeholder="kata kunci..."
                  className="w-full px-2.5 py-1.5 text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="cms-apiexplorerview-6" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Per Halaman (?perPage=)
                </label>
                <input id="cms-apiexplorerview-6"
                  type="number"
                  value={perPageParam}
                  onChange={(e) => setPerPageParam(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[13px] font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* API Key Header */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Header x-api-key (Situs: {activeSite?.name})
              </label>
              <input
                type="text"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder={activeSite?.apiKeyPrefix || 'Kunci API situs...'}
                className="w-full px-3 py-2 text-[13px] font-mono bg-slate-50 dark:bg-[#282E35] border border-slate-300 dark:border-[#3E4651] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Run Button */}
            <button
              type="button"
              onClick={handleExecuteRequest}
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium text-white bg-[#242a31] hover:bg-[#3a424c] rounded-lg transition  cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{loading ? 'Mengirim Permintaan...' : 'Kirim Permintaan (Send Request)'}</span>
            </button>
          </div>

          {/* Code Snippets Box */}
          <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-5  flex flex-col gap-3">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <span className="text-[13px] font-medium text-slate-500">Contoh Kode Klien</span>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="flex items-center gap-1 text-[13px] text-[#6C7A89] hover:underline"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Kode</span>
              </button>
            </div>

            {/* Snippet Tabs */}
            <div className="flex flex-wrap gap-1.5 text-[13px] font-semibold">
              {(['curl', 'nextjs', 'vue', 'html', 'sdk'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSnippetTab(tab)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    snippetTab === tab
                      ? 'bg-[#6C7A89] text-white'
                      : 'bg-slate-100 dark:bg-[#282E35] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'curl'
                    ? 'cURL'
                    : tab === 'nextjs'
                    ? 'Next.js'
                    : tab === 'vue'
                    ? 'Vue / Nuxt'
                    : tab === 'html'
                    ? 'HTML Embed'
                    : '@kedata/cms-client'}
                </button>
              ))}
            </div>

            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[13px] font-mono overflow-x-auto max-h-56">
              {getSnippet()}
            </pre>
          </div>
        </div>

        {/* Right Column: Live Response Viewer */}
        <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg p-5  flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100">
                Respons HTTP Langsung (Live Response)
              </h3>
              <p className="text-[13px] text-slate-500 font-mono mt-0.5 break-all">
                {finalPath}
              </p>
            </div>

            {responseStatus && (
              <div className="flex items-center gap-2 text-[13px] font-mono">
                <span
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    responseStatus >= 200 && responseStatus < 300
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {responseStatus}
                </span>
                {responseTimeMs !== null && (
                  <span className="text-slate-500">{responseTimeMs} ms</span>
                )}
              </div>
            )}
          </div>

          {/* Response Headers Widget */}
          {Object.keys(responseHeaders).length > 0 && (
            <div className="p-2.5 bg-slate-50 dark:bg-[#282E35] rounded-lg border border-slate-200 dark:border-slate-800 text-[13px] font-mono flex flex-col gap-1">
              <div className="font-medium text-slate-500 text-[13px]">Header Terpilih:</div>
              <div className="text-slate-700 dark:text-slate-300">
                <span>ETag: </span>
                <span className="text-emerald-600 dark:text-emerald-400">{responseHeaders['etag'] || '—'}</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                <span>Cache-Control: </span>
                <span className="text-blue-600 dark:text-blue-400">{responseHeaders['cache-control'] || '—'}</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                <span>RateLimit-Remaining: </span>
                <span>{responseHeaders['x-ratelimit-remaining'] || '—'}</span>
              </div>
            </div>
          )}

          {/* JSON Body View */}
          <div className="flex-1 flex flex-col">
            <span className="text-[13px] font-medium text-slate-500 mb-2">
              Badan Respons (JSON Data):
            </span>
            <div className="flex-1 min-h-[360px] max-h-[550px] overflow-auto bg-slate-900 text-emerald-400 rounded-lg p-4 font-mono text-[13px]">
              {loading ? (
                <div className="text-slate-500 italic">Mengirim permintaan dan menunggu respons...</div>
              ) : responseBody ? (
                <pre>{JSON.stringify(responseBody, null, 2)}</pre>
              ) : (
                <div className="text-slate-500 italic">
                  Klik "Kirim Permintaan" di sebelah kiri untuk melihat data JSON respons secara langsung.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
