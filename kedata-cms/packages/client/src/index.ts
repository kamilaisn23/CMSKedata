import {
  ApiResponse,
  CmsPage,
  CmsPost,
  CmsCategory,
  CmsTag,
  CmsMenu,
  CmsSiteSetting,
  CmsMedia,
  QueryParams,
} from './types.js';

export * from './types.js';

export interface ClientConfig {
  baseUrl: string; // e.g. "https://cms.kedata.id/api/v1"
  apiKey: string;  // e.g. "kd_live_..."
  fetchOptions?: RequestInit;
}

export class KedataCmsClient {
  private baseUrl: string;
  private apiKey: string;
  private defaultOptions: RequestInit;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.defaultOptions = config.fetchOptions || {};
  }

  private async request<T>(path: string, params?: QueryParams): Promise<ApiResponse<T>> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const search = new URLSearchParams();
      if (params.page) search.set('page', params.page.toString());
      if (params.perPage) search.set('perPage', params.perPage.toString());
      if (params.search) search.set('search', params.search);
      if (params.category) search.set('category', params.category);
      if (params.tag) search.set('tag', params.tag);
      if (params.sort) search.set('sort', params.sort);
      if (params.order) search.set('order', params.order);
      if (params.fields && params.fields.length > 0) search.set('fields', params.fields.join(','));
      if (params.include && params.include.length > 0) search.set('include', params.include.join(','));
      if (params.preview) search.set('preview', params.preview);

      const qs = search.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'x-api-key': this.apiKey,
    };

    const res = await fetch(url, {
      ...this.defaultOptions,
      headers: {
        ...headers,
        ...(this.defaultOptions.headers || {}),
      },
    });

    if (!res.ok) {
      let errJson: any = null;
      try {
        errJson = await res.json();
      } catch {}
      const errMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(errMsg);
      (err as any).status = res.status;
      (err as any).code = errJson?.error?.code || 'FETCH_ERROR';
      throw err;
    }

    return (await res.json()) as ApiResponse<T>;
  }

  // Pages Resource
  public pages = {
    list: async (params?: QueryParams): Promise<ApiResponse<CmsPage[]>> => {
      return this.request<CmsPage[]>('/pages', params);
    },
    getBySlug: async (slug: string, params?: { preview?: string; fields?: string[] }): Promise<ApiResponse<CmsPage>> => {
      return this.request<CmsPage>(`/pages/${encodeURIComponent(slug)}`, params);
    },
  };

  // Posts Resource
  public posts = {
    list: async (params?: QueryParams): Promise<ApiResponse<CmsPost[]>> => {
      return this.request<CmsPost[]>('/posts', params);
    },
    getBySlug: async (slug: string, params?: { preview?: string; fields?: string[] }): Promise<ApiResponse<CmsPost>> => {
      return this.request<CmsPost>(`/posts/${encodeURIComponent(slug)}`, params);
    },
  };

  // Categories Resource
  public categories = {
    list: async (): Promise<ApiResponse<CmsCategory[]>> => {
      return this.request<CmsCategory[]>('/categories');
    },
  };

  // Tags Resource
  public tags = {
    list: async (): Promise<ApiResponse<CmsTag[]>> => {
      return this.request<CmsTag[]>('/tags');
    },
  };

  // Menus Resource
  public menus = {
    list: async (location?: 'HEADER' | 'FOOTER' | 'SIDEBAR'): Promise<ApiResponse<CmsMenu[]>> => {
      const path = location ? `/menus?location=${location}` : '/menus';
      return this.request<CmsMenu[]>(path);
    },
  };

  // Site Settings Resource
  public settings = {
    get: async (): Promise<ApiResponse<CmsSiteSetting>> => {
      return this.request<CmsSiteSetting>('/settings');
    },
  };

  // Media Resource
  public media = {
    getById: async (id: string): Promise<ApiResponse<CmsMedia>> => {
      return this.request<CmsMedia>(`/media/${encodeURIComponent(id)}`);
    },
  };
}

/**
 * Webhook signature verification helper for Node.js clients
 */
export async function verifyWebhookSignature(payload: string, signatureHeader: string, secret: string): Promise<boolean> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    const expected = signatureHeader.replace(/^sha256=/, '');
    return computedHash === expected;
  }
  return false;
}
