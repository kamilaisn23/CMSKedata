export interface ApiResponse<T> {
  data: T;
  meta: {
    page?: number;
    perPage?: number;
    total: number;
    totalPages?: number;
  } | null;
  error: {
    code: string;
    message: string;
  } | null;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  contentJson: any;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmsCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount?: number;
}

export interface CmsTag {
  id: string;
  name: string;
  slug: string;
  postCount?: number;
}

export interface CmsPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  contentHtml: string;
  contentJson: any;
  featuredImage?: string;
  category?: CmsCategory | null;
  tags?: CmsTag[];
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmsMenuItem {
  id: string;
  label: string;
  url: string;
  target?: '_self' | '_blank';
  children?: CmsMenuItem[];
}

export interface CmsMenu {
  id: string;
  name: string;
  location: 'HEADER' | 'FOOTER' | 'SIDEBAR';
  items: CmsMenuItem[];
  updatedAt: string;
}

export interface CmsSiteSetting {
  siteId: string;
  siteTitle: string;
  tagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks: Record<string, string>;
  footerText?: string;
  customMetadata: Record<string, any>;
  updatedAt: string;
}

export interface CmsMedia {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  altText?: string;
  caption?: string;
  createdAt: string;
}

export interface QueryParams {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
  tag?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  fields?: string[];
  include?: string[];
  preview?: string;
}
