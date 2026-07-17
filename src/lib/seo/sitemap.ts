// Sitemap generation utilities for BazarBD
import { supabase } from '@/integrations/supabase/client';
import { getBaseUrl } from './urls';

const BASE = getBaseUrl();

function xmlEscape(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function urlEntry(loc: string, lastmod?: string, changefreq = 'weekly', priority = '0.7'): string {
  let entry = `  <url><loc>${xmlEscape(loc)}</loc>`;
  if (lastmod) entry += `<lastmod>${lastmod}</lastmod>`;
  entry += `<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  return entry;
}

export function generateMainSitemap(): string {
  const sitemaps = [
    `${BASE}/sitemap-static.xml`,
    `${BASE}/sitemap-categories.xml`,
    `${BASE}/sitemap-listings.xml`,
    `${BASE}/sitemap-locations.xml`,
    `${BASE}/sitemap-shops.xml`,
    `${BASE}/sitemap-images.xml`,
  ];
  const entries = sitemaps.map((s) => `  <sitemap><loc>${xmlEscape(s)}</loc></sitemap>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
}

export function generateStaticSitemap(): string {
  const pages: Array<{ path: string; priority: string; changefreq: string }> = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/categories', priority: '0.9', changefreq: 'daily' },
    { path: '/search', priority: '0.9', changefreq: 'daily' },
    { path: '/about', priority: '0.5', changefreq: 'monthly' },
    { path: '/contact', priority: '0.5', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { path: '/terms', priority: '0.3', changefreq: 'yearly' },
    { path: '/safety-tips', priority: '0.5', changefreq: 'monthly' },
    { path: '/blog', priority: '0.7', changefreq: 'weekly' },
  ];
  const entries = pages.map((p) => urlEntry(`${BASE}${p.path}`, undefined, p.changefreq, p.priority)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

export async function generateCategorySitemap(): Promise<string> {
  const { data: categories } = await supabase.from('categories').select('slug, name, updated_at').eq('is_active', true);
  const { data: subcategories } = await supabase.from('subcategories').select('slug, category_id, categories(slug)');

  const entries: string[] = [];
  for (const cat of (categories as { slug: string; updated_at?: string }[]) || []) {
    const lastmod = cat.updated_at ? new Date(cat.updated_at).toISOString().split('T')[0] : undefined;
    entries.push(urlEntry(`${BASE}/category/${cat.slug}`, lastmod, 'weekly', '0.8'));
  }
  for (const sub of (subcategories as { slug: string; categories: { slug: string } }[]) || []) {
    if (sub.categories?.slug) {
      entries.push(urlEntry(`${BASE}/category/${sub.categories.slug}/${sub.slug}`, undefined, 'weekly', '0.7'));
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}

export async function generateListingSitemap(): Promise<string> {
  const PAGE_SIZE = 5000;
  const entries: string[] = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from('ads')
      .select('slug, updated_at')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    for (const ad of data as { slug: string; updated_at: string }[]) {
      const lastmod = new Date(ad.updated_at).toISOString().split('T')[0];
      entries.push(urlEntry(`${BASE}/listing/${ad.slug}`, lastmod, 'weekly', '0.7'));
    }
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}

export async function generateLocationSitemap(): Promise<string> {
  const { data: divisions } = await supabase.from('divisions').select('slug, name, updated_at').eq('is_active', true);
  const { data: districts } = await supabase.from('districts').select('slug, name, updated_at').eq('is_active', true);

  const entries: string[] = [];
  for (const div of (divisions as { slug: string; updated_at?: string }[]) || []) {
    const lastmod = div.updated_at ? new Date(div.updated_at).toISOString().split('T')[0] : undefined;
    entries.push(urlEntry(`${BASE}/location/${div.slug}`, lastmod, 'weekly', '0.6'));
  }
  for (const dist of (districts as { slug: string; updated_at?: string }[]) || []) {
    const lastmod = dist.updated_at ? new Date(dist.updated_at).toISOString().split('T')[0] : undefined;
    entries.push(urlEntry(`${BASE}/location/${dist.slug}`, lastmod, 'weekly', '0.5'));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}

export async function generateShopSitemap(): Promise<string> {
  const PAGE_SIZE = 5000;
  const entries: string[] = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from('shops')
      .select('slug, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    for (const shop of data as { slug: string; updated_at: string }[]) {
      const lastmod = new Date(shop.updated_at).toISOString().split('T')[0];
      entries.push(urlEntry(`${BASE}/shop/${shop.slug}`, lastmod, 'weekly', '0.6'));
    }
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}

export async function generateImageSitemap(): Promise<string> {
  const PAGE_SIZE = 5000;
  const entries: string[] = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from('ad_images')
      .select('image_url, ads(slug), ads!inner(status)')
      .eq('ads.status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    for (const img of data as { image_url: string; ads: { slug: string } }[]) {
      const listingUrl = `${BASE}/listing/${img.ads?.slug || ''}`;
      entries.push(`  <url><loc>${xmlEscape(listingUrl)}</loc><image:image><image:loc>${xmlEscape(img.image_url)}</image:loc></image:image></url>`);
    }
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>`;
}
