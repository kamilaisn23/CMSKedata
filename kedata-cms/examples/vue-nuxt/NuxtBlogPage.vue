<!-- Example 2b: Nuxt 3 Page using useFetch & Kedata CMS -->
<template>
  <main class="container">
    <header class="header">
      <h1>Nuxt 3 + Kedata CMS</h1>
      <p>SSR-friendly reactive content loading</p>
    </header>

    <div v-if="pending" class="loading">Memuat konten...</div>
    <div v-else-if="error" class="error">Gagal: {{ error.message }}</div>

    <div v-else class="grid">
      <article v-for="post in posts" :key="post.id" class="card">
        <span class="badge">{{ post.category?.name || 'General' }}</span>
        <h2>{{ post.title }}</h2>
        <p>{{ post.excerpt }}</p>
        <div class="content" v-html="post.contentHtml" />
      </article>
    </div>
  </main>
</template>

<script setup lang="ts">
// Nuxt 3 useFetch with SSR caching & headers
const config = useRuntimeConfig();

const { data: response, pending, error } = await useFetch('http://localhost:3000/api/v1/posts', {
  headers: {
    'x-api-key': config.public.kedataApiKey || 'kd_live_demo',
  },
  query: {
    include: 'category,tags',
    perPage: 10,
  },
});

const posts = computed(() => response.value?.data || []);
</script>

<style scoped>
.container { max-width: 800px; margin: 40px auto; font-family: sans-serif; }
.header { border-bottom: 2px solid #6C7A89; padding-bottom: 16px; margin-bottom: 24px; }
.card { border: 1px solid #DFE2DC; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.badge { background: #DFE2DC; color: #4F5A66; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
</style>
