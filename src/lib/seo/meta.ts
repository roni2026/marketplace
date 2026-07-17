// Meta tag generation utilities for BazarBD
import { getBaseUrl, canonicalUrl } from './urls';

export const SITE_NAME = 'BazarBD';
export const DEFAULT_DESCRIPTION =
  'BazarBD is a free classifieds marketplace to buy and sell electronics, vehicles, property, jobs and more across Bangladesh.';

export function getDefaultKeywords(): string {
  return [
    'bangladesh marketplace',
    'buy and sell bangladesh',
    'classifieds bangladesh',
    'bazarbd',
    'second hand bangladesh',
    'used phones dhaka',
    'cars for sale bangladesh',
    'property rent dhaka',
    'jobs bangladesh',
    'online marketplace bd',
  ].join(', ');
}

export function generateHomeTitle(): string {
  return `${SITE_NAME} — Buy & Sell Anything in Bangladesh`;
}

export interface MetaTagConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  noindex?: boolean;
  nofollow?: boolean;
  canonical?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

export interface GeneratedMetaTags {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  robots: string;
  og: Record<string, string>;
  twitter: Record<string, string>;
  geo: Record<string, string>;
  lang: string;
}

export function generateMetaTags(config: MetaTagConfig): GeneratedMetaTags {
  const title = config.title || generateHomeTitle();
  const description = config.description || DEFAULT_DESCRIPTION;
  const keywords = config.keywords || getDefaultKeywords();
  const url = config.canonical || config.url || canonicalUrl(typeof window !== 'undefined' ? window.location.pathname : '/');
  const image = config.image || `${getBaseUrl()}/icons/icon-512.png`;
  const type = config.type || 'website';

  const robotsParts: string[] = [];
  if (config.noindex) robotsParts.push('noindex');
  else robotsParts.push('index');
  if (config.nofollow) robotsParts.push('nofollow');
  else robotsParts.push('follow');

  return {
    title,
    description,
    keywords,
    canonical: url,
    robots: robotsParts.join(', '),
    og: {
      'og:title': title,
      'og:description': description,
      'og:type': type,
      'og:url': url,
      'og:image': image,
      'og:site_name': SITE_NAME,
      'og:locale': 'en_US',
      'og:locale:alternate': 'bn_BD',
      ...(config.publishedTime && { 'article:published_time': config.publishedTime }),
      ...(config.modifiedTime && { 'article:modified_time': config.modifiedTime }),
      ...(config.author && { 'article:author': config.author }),
    },
    twitter: {
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': image,
    },
    geo: {
      'geo.region': 'BD',
      'geo.placename': 'Bangladesh',
      'ICBM': '23.685, 90.3563',
    },
    lang: 'en',
  };
}

// ---- Dynamic title/description generators ----

interface AdLike {
  title: string;
  price?: number | null;
  price_type?: string;
  condition?: string;
  division?: string | null;
  district?: string | null;
  area?: string | null;
  category_name?: string | null;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
}

export function generateListingTitle(ad: AdLike): string {
  const parts: string[] = [ad.title];
  if (ad.condition && ad.condition !== 'used') {
    // e.g. "New iPhone 15 Pro Max"
    // Don't prepend if title already starts with condition
    if (!ad.title.toLowerCase().startsWith(ad.condition.toLowerCase())) {
      parts.unshift(ad.condition.charAt(0).toUpperCase() + ad.condition.slice(1));
    }
  }
  const location = ad.area || ad.district || ad.division;
  const titleStr = parts.join(' ');
  if (location) {
    return `${titleStr} for Sale in ${location} | ${SITE_NAME}`;
  }
  return `${titleStr} Price in Bangladesh | ${SITE_NAME}`;
}

export function generateListingDescription(ad: AdLike): string {
  const parts: string[] = [];
  const condition = ad.condition === 'new' ? 'Brand new' : 'Used';
  parts.push(`Buy ${condition.toLowerCase()} ${ad.title}`);

  if (ad.brand) parts.push(`(${ad.brand}${ad.model ? ` ${ad.model}` : ''})`);
  if (ad.division || ad.district) {
    parts.push(`in ${ad.area || ad.district || ad.division}`);
  }
  if (ad.price != null && ad.price > 0) {
    parts.push(`for ৳${ad.price.toLocaleString()}`);
  }
  parts.push(`on ${SITE_NAME}.`);
  parts.push(`Compare prices, view photos and contact sellers instantly.`);

  let desc = parts.join(' ');
  if (ad.description) {
    const extra = ad.description.slice(0, 80).trim();
    if (extra) desc = `${desc} ${extra}...`;
  }
  return desc.slice(0, 165);
}

export function generateCategoryTitle(cat: { name: string }, location?: string): string {
  if (location) {
    return `${cat.name} in ${location} | ${SITE_NAME}`;
  }
  return `${cat.name} in Bangladesh | ${SITE_NAME}`;
}

export function generateCategoryDescription(cat: { name: string }, location?: string): string {
  const loc = location || 'Bangladesh';
  return `Buy and sell ${cat.name.toLowerCase()} in ${loc}. Browse new and used ${cat.name.toLowerCase()} for sale with photos, prices and seller contact details on ${SITE_NAME}.`;
}

export function generateLocationTitle(location: string): string {
  return `Buy & Sell in ${location} | ${SITE_NAME}`;
}

export function generateLocationDescription(location: string): string {
  return `Find great deals on electronics, vehicles, property and more in ${location}. Post free ads and connect with buyers and sellers on ${SITE_NAME}.`;
}

export function generateSearchTitle(query: string, location?: string): string {
  if (location) {
    return `Search: ${query} in ${location} | ${SITE_NAME}`;
  }
  return `Search: ${query} | ${SITE_NAME}`;
}

export function generateSearchDescription(query: string, location?: string): string {
  const loc = location ? ` in ${location}` : '';
  return `Search results for "${query}"${loc}. Find new and used items for sale on ${SITE_NAME}, Bangladesh's marketplace.`;
}

export function generateShopTitle(shop: { name: string }): string {
  return `${shop.name} — Shop on ${SITE_NAME}`;
}

export function generateShopDescription(shop: { name: string; description?: string | null }): string {
  if (shop.description) {
    return shop.description.slice(0, 165);
  }
  return `Visit ${shop.name} on ${SITE_NAME}. Browse their products, reviews and contact the shop directly.`;
}

export function generateProfileTitle(profile: { full_name?: string | null }): string {
  return `${profile.full_name || 'Seller'} — Profile on ${SITE_NAME}`;
}

export function generateProfileDescription(profile: { full_name?: string | null }): string {
  return `View ${profile.full_name || 'this seller'}'s profile on ${SITE_NAME}. See their listings, reviews, ratings and contact information.`;
}
