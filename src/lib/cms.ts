import { supabase } from '@/integrations/supabase/client';
import type {
  Banner,
  BannerInsert,
  BannerUpdate,
  HomepageSection,
  HomepageSectionUpdate,
  LandingPage,
  LandingPageInsert,
  FAQEntry,
  FAQEntryInsert,
  BlogPost,
  BlogPostInsert,
  StaticPage,
  StaticPageInsert,
  TermsVersion,
  TermsVersionInsert,
  PrivacyVersion,
  PrivacyVersionInsert,
} from '@/integrations/supabase/types_v2_cms';

// -------------------------------------------------------------------------
// Banners
// -------------------------------------------------------------------------

export async function getBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('Failed to fetch banners:', error);
    return [];
  }
  return (data as Banner[]) || [];
}

export async function createBanner(data: BannerInsert): Promise<Banner | null> {
  const { data: result, error } = await supabase
    .from('banners')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('Failed to create banner:', error);
    return null;
  }
  return result as Banner;
}

export async function updateBanner(id: string, data: BannerUpdate): Promise<Banner | null> {
  const { data: result, error } = await supabase
    .from('banners')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Failed to update banner:', error);
    return null;
  }
  return result as Banner;
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete banner:', error);
  }
}

// -------------------------------------------------------------------------
// Homepage Sections
// -------------------------------------------------------------------------

export async function getHomepageSections(): Promise<HomepageSection[]> {
  const { data, error } = await supabase
    .from('homepage_sections')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('Failed to fetch homepage sections:', error);
    return [];
  }
  return (data as HomepageSection[]) || [];
}

export async function updateHomepageSection(
  id: string,
  config: Record<string, unknown>
): Promise<HomepageSection | null> {
  const update: HomepageSectionUpdate = { config };
  const { data, error } = await supabase
    .from('homepage_sections')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Failed to update homepage section:', error);
    return null;
  }
  return data as HomepageSection;
}

// -------------------------------------------------------------------------
// Landing Pages
// -------------------------------------------------------------------------

export async function getLandingPages(): Promise<LandingPage[]> {
  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch landing pages:', error);
    return [];
  }
  return (data as LandingPage[]) || [];
}

export async function createLandingPage(data: LandingPageInsert): Promise<LandingPage | null> {
  const { data: result, error } = await supabase
    .from('landing_pages')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('Failed to create landing page:', error);
    return null;
  }
  return result as LandingPage;
}

// -------------------------------------------------------------------------
// FAQ Entries
// -------------------------------------------------------------------------

export async function getFAQEntries(): Promise<FAQEntry[]> {
  const { data, error } = await supabase
    .from('faq_entries')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('Failed to fetch FAQ entries:', error);
    return [];
  }
  return (data as FAQEntry[]) || [];
}

export async function createFAQEntry(data: FAQEntryInsert): Promise<FAQEntry | null> {
  const { data: result, error } = await supabase
    .from('faq_entries')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('Failed to create FAQ entry:', error);
    return null;
  }
  return result as FAQEntry;
}

export async function updateFAQEntry(id: string, data: Partial<FAQEntryInsert>): Promise<void> {
  const { error } = await supabase.from('faq_entries').update(data).eq('id', id);
  if (error) {
    console.error('Failed to update FAQ entry:', error);
  }
}

export async function deleteFAQEntry(id: string): Promise<void> {
  const { error } = await supabase.from('faq_entries').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete FAQ entry:', error);
  }
}

// -------------------------------------------------------------------------
// Blog Posts
// -------------------------------------------------------------------------

export async function getBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*, profiles!blog_posts_author_id_fkey(full_name)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch blog posts:', error);
    return [];
  }
  return (data as BlogPost[]) || [];
}

export async function createBlogPost(data: BlogPostInsert): Promise<BlogPost | null> {
  const { data: result, error } = await supabase
    .from('blog_posts')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('Failed to create blog post:', error);
    return null;
  }
  return result as BlogPost;
}

export async function updateBlogPost(id: string, data: Partial<BlogPostInsert>): Promise<void> {
  const { error } = await supabase.from('blog_posts').update(data).eq('id', id);
  if (error) {
    console.error('Failed to update blog post:', error);
  }
}

export async function deleteBlogPost(id: string): Promise<void> {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete blog post:', error);
  }
}

// -------------------------------------------------------------------------
// Static Pages
// -------------------------------------------------------------------------

export async function getStaticPages(): Promise<StaticPage[]> {
  const { data, error } = await supabase
    .from('static_pages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch static pages:', error);
    return [];
  }
  return (data as StaticPage[]) || [];
}

export async function createStaticPage(data: StaticPageInsert): Promise<StaticPage | null> {
  const { data: result, error } = await supabase
    .from('static_pages')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('Failed to create static page:', error);
    return null;
  }
  return result as StaticPage;
}

export async function updateStaticPage(id: string, data: Partial<StaticPageInsert>): Promise<void> {
  const { error } = await supabase.from('static_pages').update(data).eq('id', id);
  if (error) {
    console.error('Failed to update static page:', error);
  }
}

export async function deleteStaticPage(id: string): Promise<void> {
  const { error } = await supabase.from('static_pages').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete static page:', error);
  }
}

// -------------------------------------------------------------------------
// Terms & Privacy Versions
// -------------------------------------------------------------------------

export async function getTermsVersions(): Promise<TermsVersion[]> {
  const { data, error } = await supabase
    .from('terms_versions')
    .select('*')
    .order('effective_date', { ascending: false });
  if (error) {
    console.error('Failed to fetch terms versions:', error);
    return [];
  }
  return (data as TermsVersion[]) || [];
}

export async function createTermsVersion(data: TermsVersionInsert): Promise<TermsVersion | null> {
  // Deactivate previous versions
  if (data.is_active) {
    await supabase.from('terms_versions').update({ is_active: false }).eq('is_active', true);
  }
  const { data: result, error } = await supabase
    .from('terms_versions')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('Failed to create terms version:', error);
    return null;
  }
  return result as TermsVersion;
}

export async function getPrivacyVersions(): Promise<PrivacyVersion[]> {
  const { data, error } = await supabase
    .from('privacy_versions')
    .select('*')
    .order('effective_date', { ascending: false });
  if (error) {
    console.error('Failed to fetch privacy versions:', error);
    return [];
  }
  return (data as PrivacyVersion[]) || [];
}

export async function createPrivacyVersion(data: PrivacyVersionInsert): Promise<PrivacyVersion | null> {
  // Deactivate previous versions
  if (data.is_active) {
    await supabase.from('privacy_versions').update({ is_active: false }).eq('is_active', true);
  }
  const { data: result, error } = await supabase
    .from('privacy_versions')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('Failed to create privacy version:', error);
    return null;
  }
  return result as PrivacyVersion;
}
