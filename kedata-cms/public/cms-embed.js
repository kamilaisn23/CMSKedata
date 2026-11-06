/**
 * Kedata CMS - Universal Embed Script (cms-embed.js)
 * Framework-agnostic client embed. Zero external dependencies.
 *
 * Usage:
 * <div id="kedata-posts"></div>
 * <script
 *   src="https://your-cms-url/cms-embed.js"
 *   data-api-url="https://your-cms-url/api/v1"
 *   data-api-key="kd_live_..."
 *   data-container="#kedata-posts"
 *   data-type="posts"
 *   data-limit="5"
 *   data-theme="light">
 * </script>
 */

(function () {
  'use strict';

  // Find the current executing script tag
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  if (!currentScript) return;

  const scriptSrc = currentScript.src || '';
  const defaultApiUrl = scriptSrc ? new URL('/api/v1', scriptSrc).href : '/api/v1';

  const apiUrl = currentScript.getAttribute('data-api-url') || defaultApiUrl;
  const apiKey = currentScript.getAttribute('data-api-key');
  const containerSelector = currentScript.getAttribute('data-container') || '#kedata-posts';
  const type = currentScript.getAttribute('data-type') || 'posts';
  const slug = currentScript.getAttribute('data-slug');
  const limit = currentScript.getAttribute('data-limit') || '5';
  const category = currentScript.getAttribute('data-category');
  const theme = currentScript.getAttribute('data-theme') || 'light';

  if (!apiKey) {
    console.warn('[Kedata CMS] data-api-key attribute is required on script tag.');
    return;
  }

  function init() {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn(`[Kedata CMS] Target container '${containerSelector}' not found in DOM.`);
      return;
    }

    container.innerHTML = '<div style="padding:16px;font-family:sans-serif;color:#6C7A89;">Memuat konten Kedata CMS...</div>';

    let endpoint = `${apiUrl}/posts?perPage=${limit}`;
    if (category) endpoint += `&category=${encodeURIComponent(category)}`;
    if (type === 'page' && slug) {
      endpoint = `${apiUrl}/pages/${encodeURIComponent(slug)}`;
    }

    fetch(endpoint, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return res.json();
      })
      .then((response) => {
        if (response.error) throw new Error(response.error.message);
        render(container, response.data, type);
      })
      .catch((err) => {
        container.innerHTML = `<div style="padding:16px;border:1px solid #e53e3e;border-radius:6px;background:#fff5f5;color:#c53030;font-family:sans-serif;">
          <strong>Kedata CMS Error:</strong> ${err.message}
        </div>`;
      });
  }

  function render(container, data, renderType) {
    const isDark = theme === 'dark';
    const bg = isDark ? '#202428' : '#F5F7F4';
    const cardBg = isDark ? '#282E35' : '#FFFFFF';
    const textColor = isDark ? '#DFE2DC' : '#2D3748';
    const primaryColor = isDark ? '#8E9BA9' : '#6C7A89';
    const border = isDark ? '#3E4651' : '#DFE2DC';

    if (renderType === 'page') {
      const page = data;
      container.innerHTML = `
        <article style="background:${cardBg};border:1px solid ${border};border-radius:8px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:${textColor};line-height:1.6;">
          <h1 style="color:${primaryColor};margin-top:0;font-size:2rem;">${escapeHtml(page.title)}</h1>
          <div style="margin-top:16px;">${page.contentHtml}</div>
        </article>
      `;
      return;
    }

    const posts = Array.isArray(data) ? data : [];
    if (posts.length === 0) {
      container.innerHTML = `<div style="padding:20px;text-align:center;font-family:sans-serif;color:#6C7A89;">Belum ada artikel yang dipublikasikan.</div>`;
      return;
    }

    let cardsHtml = '';
    for (const post of posts) {
      const dateStr = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '';
      const catBadge = post.category ? `<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;background:#DFE2DC;color:#4F5A66;border-radius:12px;margin-bottom:8px;">${escapeHtml(post.category.name)}</span>` : '';
      const imgHtml = post.featuredImage ? `<img src="${escapeHtml(post.featuredImage)}" alt="" style="width:100%;height:160px;object-fit:cover;border-radius:6px 6px 0 0;" />` : '';

      cardsHtml += `
        <div style="background:${cardBg};border:1px solid ${border};border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.05);display:flex;flex-direction:column;transition:transform 0.2s ease;">
          ${imgHtml}
          <div style="padding:16px;flex:1;display:flex;flex-direction:column;">
            ${catBadge}
            <h3 style="margin:0 0 8px 0;font-size:1.15rem;color:${primaryColor};line-height:1.3;">${escapeHtml(post.title)}</h3>
            <p style="margin:0 0 12px 0;font-size:0.9rem;color:${textColor};opacity:0.85;flex:1;line-height:1.5;">${escapeHtml(post.excerpt || '')}</p>
            <div style="font-size:0.8rem;color:#8E9BA9;display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${border};padding-top:8px;">
              <span>${dateStr}</span>
              <span style="color:${primaryColor};font-weight:500;">Baca selengkapnya →</span>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:20px;padding:8px 0;">
        ${cardsHtml}
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
