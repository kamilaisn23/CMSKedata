/**
 * Example 2: Vue 3 Composable for Kedata CMS
 */

import { ref, onMounted } from 'vue';

export function useKedataCms(endpoint = '/posts', options: { apiKey?: string; baseUrl?: string } = {}) {
  const data = ref<any>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  const baseUrl = options.baseUrl || 'http://localhost:3000/api/v1';
  const apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env.VITE_KEDATA_API_KEY : '');

  const fetchData = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'x-api-key': apiKey || '',
          'Accept': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      data.value = json.data;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchData();
  });

  return { data, loading, error, refetch: fetchData };
}
