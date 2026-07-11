import { supabase } from '@/integrations/supabase/client';
import type {
  SEOSettings,
  SEOSettingsInsert,
  SEOSettingsUpdate,
  Redirect,
  RedirectInsert,
  SitemapEntry,
} from '@/integrations/supabase/types_v2_cms';

// -------------------------------------------------------------------------
// SEO Settings
// -------------------------------------------------------------------------

export async function getSEOSettings(pageUrl: string): Promise<SEOSettings | null> {
  const { data, error } = await supabase
    .from('seo_settings')
    .select('*')
    .eq('page_url', pageUrl)
    .maybeSingle();
  if (error) {
    console.error('Failed to fetch SEO settings:', error);
    return null;
  }
  return data as SEOSettings | null;
}

export async function getAllSEOSettings(): Promise<SEOSettings[]> {
  const { data, error } = await supabase
    .from('seo_settings')
    .select('*')
    .order('page_url', { ascending: true });
  if (error) {
    console.error('Failed to fetch all SEO settings:', error);
    return [];
  }
  return (data as SEOSettings[]) || [];
}

export async function updateSEOSettings(
  pageUrl: string,
  settings: SEOSettingsUpdate
): Promise<SEOSettings | null> {
  // Try update first, then upsert
  const { data: existing } = await supabase
    .from('seo_settings')
    .select('id')
    .eq('page_url', pageUrl)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('seo_settings')
      .update(settings)
      .eq('page_url', pageUrl)
      .select()
      .single();
    if (error) {
      console.error('Failed to update SEO settings:', error);
      return null;
    }
    return data as SEOSettings;
  }

  const insert: SEOSettingsInsert = { page_url: pageUrl, ...settings };
  const { data, error } = await supabase
    .from('seo_settings')
    .insert(insert)
    .select()
    .single();
  if (error) {
    console.error('Failed to insert SEO settings:', error);
    return null;
  }
  return data as SEOSettings;
}

export async function updateMetaTitle(pageUrl: string, title: string): Promise<void> {
  await updateSEOSettings(pageUrl, { meta_title: title });
}

export async function updateMetaDescription(pageUrl: string, description: string): Promise<void> {
  await updateSEOSettings(pageUrl, { meta_description: description });
}

// -------------------------------------------------------------------------
// Sitemap Generation
// -------------------------------------------------------------------------

export async function generateSitemap(): Promise<string> {
  const { data: ads } = await supabase
    .from('ads')
    .select('slug, updated_at')
    .eq('status', 'approved')
    .order('updated_at', { ascending: false });

  const { data: categories } = await supabase
    .from('categories')
    .select('slug')
    .eq('is_active', true);

  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('slug, published_at')
    .eq('status', 'published');

  const { data: staticPages } = await supabase
    .from('static_pages')
    .select('slug')
    .eq('is_published', true);

  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const urls: string[] = ['<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

  // Homepage
  urls.push(`  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`);

  // Categories
  for (const cat of (categories as { slug: string }[]) || []) {
    urls.push(`  <url><loc>${baseUrl}/category/${cat.slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }

  // Ads
  for (const ad of (ads as { slug: string; updated_at: string }[]) || []) {
    const lastmod = new Date(ad.updated_at).toISOString().split('T')[0];
    urls.push(`  <url><loc>${baseUrl}/ad/${ad.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  }

  // Blog posts
  for (const post of (blogPosts as { slug: string; published_at: string }[]) || []) {
    const lastmod = new Date(post.published_at).toISOString().split('T')[0];
    urls.push(`  <url><loc>${baseUrl}/blog/${post.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`);
  }

  // Static pages
  for (const page of (staticPages as { slug: string }[]) || []) {
    urls.push(`  <url><loc>${baseUrl}/page/${page.slug}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`);
  }

  urls.push('</urlset>');
  return urls.join('\n');
}

export async function generateRobotsTxt(): Promise<string> {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /auth',
    'Disallow: /api',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ];
  return lines.join('\n');
}

// -------------------------------------------------------------------------
// Redirects
// -------------------------------------------------------------------------

export async function getRedirects(): Promise<Redirect[]> {
  const { data, error } = await supabase
    .from('redirects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch redirects:', error);
    return [];
  }
  return (data as Redirect[]) || [];
}

export async function createRedirect(
  from: string,
  to: string,
  statusCode: number = 301
): Promise<Redirect | null> {
  const payload: RedirectInsert = { from_url: from, to_url: to, status_code: statusCode };
  const { data, error } = await supabase
    .from('redirects')
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error('Failed to create redirect:', error);
    return null;
  }
  return data as Redirect;
}

export async function deleteRedirect(id: string): Promise<void> {
  const { error } = await supabase.from('redirects').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete redirect:', error);
  }
}

// -------------------------------------------------------------------------
// URL & Meta Tag Generators
// -------------------------------------------------------------------------

export function generateCanonicalUrl(pageUrl: string): string {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  return `${baseUrl}${pageUrl.startsWith('/') ? pageUrl : `/${pageUrl}`}`;
}

export function generateFriendlyUrl(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateOpenGraph(data: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}): string[] {
  const tags: string[] = [
    `<meta property="og:title" content="${data.title}" />`,
    `<meta property="og:description" content="${data.description}" />`,
    `<meta property="og:type" content="${data.type || 'website'}" />`,
  ];
  if (data.image) {
    tags.push(`<meta property="og:image" content="${data.image}" />`);
  }
  if (data.url) {
    tags.push(`<meta property="og:url" content="${data.url}" />`);
  }
  return tags;
}

export function generateTwitterCards(data: {
  title: string;
  description: string;
  image?: string;
  card?: string;
}): string[] {
  const tags: string[] = [
    `<meta name="twitter:card" content="${data.card || 'summary_large_image'}" />`,
    `<meta name="twitter:title" content="${data.title}" />`,
    `<meta name="twitter:description" content="${data.description}" />`,
  ];
  if (data.image) {
    tags.push(`<meta name="twitter:image" content="${data.image}" />`);
  }
  return tags;
}

export function generateStructuredData(
  type: string,
  data: Record<string, unknown>
): string {
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data,
  };
  return `<script type="application/ld+json">${JSON.stringify(base, null, 2)}</script>`;
}

// -------------------------------------------------------------------------
// Sitemap Entries (DB)
// -------------------------------------------------------------------------

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const { data, error } = await supabase
    .from('sitemap_entries')
    .select('*')
    .order('url', { ascending: true });
  if (error) {
    console.error('Failed to fetch sitemap entries:', error);
    return [];
  }
  return (data as SitemapEntry[]) || [];
}
