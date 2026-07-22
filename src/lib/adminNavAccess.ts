/** Maps /admin hrefs to admin_tab_permissions.permission_key values. */

export const HREF_TO_PERMISSION_KEY: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/moderation': 'moderation_inbox',
  '/admin/search': 'search',
  '/admin/bulk-operations': 'bulk_operations',
  '/admin/activity-log': 'activity_log',
  '/admin/analytics': 'analytics',
  '/admin/reporting': 'reporting',
  '/admin/products': 'products',
  '/admin/listing-management': 'listing_management',
  '/admin/listing-analytics': 'listing_analytics',
  '/admin/search-analytics': 'search_analytics',
  '/admin/sponsored-listings': 'sponsored_listings',
  '/admin/ads/search': 'ad_search',
  '/admin/ad-promotions': 'ad_promotions',
  '/admin/ads': 'ad_moderation',
  '/admin/categories': 'categories',
  '/admin/brands': 'brands',
  '/admin/inventory': 'inventory',
  '/admin/users': 'users',
  '/admin/customers': 'customers',
  '/admin/sellers': 'sellers',
  '/admin/seller-reports': 'seller_reports',
  '/admin/shops': 'shops',
  '/admin/shop-verifications': 'shop_verifications',
  '/admin/trust': 'trust',
  '/admin/reports': 'reports',
  '/admin/reviews': 'reviews',
  '/admin/messages': 'messages',
  '/admin/fraud': 'fraud',
  '/admin/media': 'media',
  '/admin/transactions': 'transactions',
  '/admin/orders': 'orders',
  '/admin/payouts': 'payouts',
  '/admin/coupons': 'coupons',
  '/admin/campaigns': 'campaigns',
  '/admin/revenue-analytics': 'revenue_analytics',
  '/admin/cms': 'cms',
  '/admin/seo': 'seo',
  '/admin/support': 'support',
  '/admin/permissions': 'permissions',
  '/admin/audit': 'audit',
  '/admin/monitoring': 'monitoring',
  '/admin/system-health': 'system_health',
  '/admin/api-logs': 'api_logs',
  '/admin/email-queue': 'email_queue',
  '/admin/failed-jobs': 'failed_jobs',
  '/admin/webhooks': 'webhooks',
  '/admin/feature-flags': 'feature_flags',
  '/admin/workflow': 'workflow',
  '/admin/tools': 'tools',
  '/admin/compliance': 'compliance',
  '/admin/compliance-dashboard': 'compliance',
  '/admin/developer': 'developer',
  '/admin/backup': 'backup',
  '/admin/settings': 'settings',
};

export function hrefToPermissionKey(href: string): string | null {
  if (HREF_TO_PERMISSION_KEY[href]) return HREF_TO_PERMISSION_KEY[href];
  // prefix match longest
  const keys = Object.keys(HREF_TO_PERMISSION_KEY).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (href === k || href.startsWith(k + '/')) return HREF_TO_PERMISSION_KEY[k];
  }
  return null;
}

/** Tabs every authenticated staff member may always see (none by default — super_admin sees all). */
export function isAlwaysVisibleForAnyAdmin(_href: string): boolean {
  return false;
}
