/**
 * Example 4: React (Vite / SPA) using Hooks
 */

import React, { useState, useEffect } from 'react';

export function KedataReactFeed({ apiKey, siteUrl = 'http://localhost:3000/api/v1' }: { apiKey: string; siteUrl?: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${siteUrl}/posts?perPage=5&include=category`, {
      headers: { 'x-api-key': apiKey },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return res.json();
      })
      .then((json) => setPosts(json.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [apiKey, siteUrl]);

  if (loading) return <div>Memuat feed Kedata CMS...</div>;
  if (error) return <div>Terjadi kesalahan: {error}</div>;

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {posts.map((post) => (
        <div key={post.id} style={{ border: '1px solid #DFE2DC', padding: '16px', borderRadius: '8px' }}>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
        </div>
      ))}
    </div>
  );
}
