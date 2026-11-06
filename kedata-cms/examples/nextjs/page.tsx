/**
 * Example 1: Next.js (App Router / Server Component)
 * Demonstrates: Server-side fetching, full typing, TipTap HTML rendering, and ISR caching
 */

import React from 'react';

interface CmsPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  category?: { name: string };
  publishedAt: string;
}

const CMS_API_URL = process.env.KEDATA_CMS_URL || 'http://localhost:3000/api/v1';
const CMS_API_KEY = process.env.KEDATA_API_KEY || 'kd_live_tech_demo';

export async function fetchPublishedPosts(): Promise<CmsPost[]> {
  const res = await fetch(`${CMS_API_URL}/posts?include=category,tags&perPage=10`, {
    headers: {
      'x-api-key': CMS_API_KEY,
      'Accept': 'application/json',
    },
    // Next.js ISR tag-based cache
    next: {
      tags: ['kedata-posts'],
      revalidate: 3600, // Background revalidate every hour
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch from Kedata CMS: ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export default async function NextJsBlogPage() {
  const posts = await fetchPublishedPosts();

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #6C7A89', paddingBottom: 16 }}>
        <h1 style={{ color: '#6C7A89' }}>Kedata CMS + Next.js Server Component</h1>
        <p>Framework-agnostic headless content seamlessly rendered on Next.js</p>
      </header>

      <section style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {posts.map((post) => (
          <article key={post.id} style={{ border: '1px solid #DFE2DC', borderRadius: 8, padding: 20 }}>
            <span style={{ fontSize: 12, background: '#DFE2DC', color: '#4F5A66', padding: '2px 8px', borderRadius: 4 }}>
              {post.category?.name || 'General'}
            </span>
            <h2 style={{ color: '#2D3748', marginTop: 8 }}>{post.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
          </article>
        ))}
      </section>
    </div>
  );
}
