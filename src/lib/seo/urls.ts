// SEO URL generation utilities for BazarBD

export function getBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SITE_URL) {
    return (import.meta as any).env.VITE_SITE_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://bazarbd.com';
}

export function canonicalUrl(path: string): string {
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function listingUrl(slug: string): string {
  return `/listing/${slug}`;
}

export function categoryUrl(categorySlug: string, subcategorySlug?: string): string {
  return subcategorySlug
    ? `/category/${categorySlug}/${subcategorySlug}`
    : `/category/${categorySlug}`;
}

export function locationUrl(locationSlug: string): string {
  return `/location/${locationSlug}`;
}

export function shopUrl(slug: string): string {
  return `/shop/${slug}`;
}

export function profileUrl(userId: string): string {
  return `/user/${userId}`;
}

export interface SearchParams {
  q?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sort?: string;
  page?: number;
}

export function searchUrl(params: SearchParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.category) sp.set('category', params.category);
  if (params.location) sp.set('location', params.location);
  if (params.minPrice != null) sp.set('minPrice', String(params.minPrice));
  if (params.maxPrice != null) sp.set('maxPrice', String(params.maxPrice));
  if (params.condition) sp.set('condition', params.condition);
  if (params.sort) sp.set('sort', params.sort);
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  const qs = sp.toString();
  return qs ? `/search?${qs}` : '/search';
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export const slugify = generateSlug;
