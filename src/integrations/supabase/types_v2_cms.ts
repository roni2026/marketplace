// Type definitions for v2 CMS, Notification, Workflow & SEO tables

export type BlogStatus = 'draft' | 'published' | 'archived';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  browser_enabled: boolean;
  mobile_push_enabled: boolean;
  digest_email_enabled: boolean;
  marketing_enabled: boolean;
  category_alerts: boolean;
  saved_search_alerts: boolean;
  wishlist_alerts: boolean;
  seller_alerts: boolean;
  admin_announcements: boolean;
  created_at: string;
}

export interface NotificationPreferencesInsert {
  user_id: string;
  browser_enabled?: boolean;
  mobile_push_enabled?: boolean;
  digest_email_enabled?: boolean;
  marketing_enabled?: boolean;
  category_alerts?: boolean;
  saved_search_alerts?: boolean;
  wishlist_alerts?: boolean;
  seller_alerts?: boolean;
  admin_announcements?: boolean;
}

export interface NotificationPreferencesUpdate {
  browser_enabled?: boolean;
  mobile_push_enabled?: boolean;
  digest_email_enabled?: boolean;
  marketing_enabled?: boolean;
  category_alerts?: boolean;
  saved_search_alerts?: boolean;
  wishlist_alerts?: boolean;
  seller_alerts?: boolean;
  admin_announcements?: boolean;
}

export interface NotificationSchedule {
  id: string;
  notification_id: string;
  scheduled_for: string;
  sent: boolean;
  sent_at: string | null;
}

export interface NotificationScheduleInsert {
  notification_id: string;
  scheduled_for: string;
  sent?: boolean;
  sent_at?: string | null;
}

export interface WorkflowRule {
  id: string;
  name: string;
  trigger: string;
  condition: Record<string, unknown>;
  action: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface WorkflowRuleInsert {
  name: string;
  trigger: string;
  condition?: Record<string, unknown>;
  action: string;
  is_active?: boolean;
  priority?: number;
}

export interface WorkflowRuleUpdate {
  name?: string;
  trigger?: string;
  condition?: Record<string, unknown>;
  action?: string;
  is_active?: boolean;
  priority?: number;
}

export interface WorkflowLog {
  id: string;
  rule_id: string | null;
  entity_id: string | null;
  entity_type: string | null;
  action_taken: string | null;
  success: boolean;
  created_at: string;
  workflow_rules?: { name: string } | null;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  is_active: boolean;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
}

export interface CronJobInsert {
  name: string;
  schedule: string;
  command: string;
  is_active?: boolean;
  next_run?: string | null;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  position: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface BannerInsert {
  title: string;
  image_url?: string | null;
  link_url?: string | null;
  position?: string;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface BannerUpdate {
  title?: string;
  image_url?: string | null;
  link_url?: string | null;
  position?: string;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface HomepageSection {
  id: string;
  title: string;
  component_type: string;
  config: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface HomepageSectionUpdate {
  title?: string;
  component_type?: string;
  config?: Record<string, unknown>;
  sort_order?: number;
  is_active?: boolean;
}

export interface LandingPage {
  id: string;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  created_at: string;
}

export interface LandingPageInsert {
  slug: string;
  title: string;
  content?: Record<string, unknown>;
  meta_title?: string | null;
  meta_description?: string | null;
  is_published?: boolean;
}

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface FAQEntryInsert {
  question: string;
  answer: string;
  category?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface BlogPost {
  id: string;
  author_id: string | null;
  title: string;
  slug: string;
  body: string | null;
  featured_image: string | null;
  status: BlogStatus;
  published_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

export interface BlogPostInsert {
  author_id?: string | null;
  title: string;
  slug: string;
  body?: string | null;
  featured_image?: string | null;
  status?: BlogStatus;
  published_at?: string | null;
}

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  is_published: boolean;
  created_at: string;
}

export interface StaticPageInsert {
  slug: string;
  title: string;
  content?: Record<string, unknown>;
  is_published?: boolean;
}

export interface TermsVersion {
  id: string;
  version: string;
  content: string;
  effective_date: string;
  is_active: boolean;
  created_at: string;
}

export interface TermsVersionInsert {
  version: string;
  content: string;
  effective_date: string;
  is_active?: boolean;
}

export interface PrivacyVersion {
  id: string;
  version: string;
  content: string;
  effective_date: string;
  is_active: boolean;
  created_at: string;
}

export interface PrivacyVersionInsert {
  version: string;
  content: string;
  effective_date: string;
  is_active?: boolean;
}

export interface SEOSettings {
  id: string;
  page_url: string;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_card: string;
  canonical_url: string | null;
  structured_data: Record<string, unknown>;
  created_at: string;
}

export interface SEOSettingsInsert {
  page_url: string;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_card?: string;
  canonical_url?: string | null;
  structured_data?: Record<string, unknown>;
}

export interface SEOSettingsUpdate {
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_card?: string;
  canonical_url?: string | null;
  structured_data?: Record<string, unknown>;
}

export interface Redirect {
  id: string;
  from_url: string;
  to_url: string;
  status_code: number;
  created_at: string;
}

export interface RedirectInsert {
  from_url: string;
  to_url: string;
  status_code?: number;
}

export interface SitemapEntry {
  id: string;
  url: string;
  last_modified: string;
  change_frequency: string;
  priority: number;
  created_at: string;
}
