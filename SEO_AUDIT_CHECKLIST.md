# BazarBD SEO Audit Checklist

This checklist covers all 21 sections of the SEO implementation.
Use it to verify each feature is correctly implemented and passing.

## How to Use
- Check each item as **Pass** or **Fail**
- Use the referenced tools to validate
- Fix any **Fail** items before deploying

---

## 1. Technical SEO

| # | Check | Tool | Status |
|---|-------|------|--------|
| 1.1 | robots.txt exists and is valid | `curl /robots.txt` | ⬜ |
| 1.2 | sitemap-index.xml exists | `curl /sitemap-index.xml` | ⬜ |
| 1.3 | Dynamic sitemap index references all sub-sitemaps | Browser | ⬜ |
| 1.4 | Image sitemap generated | `curl /sitemap-images.xml` | ⬜ |
| 1.5 | Category sitemap generated | `curl /sitemap-categories.xml` | ⬜ |
| 1.6 | Location sitemap generated | `curl /sitemap-locations.xml` | ⬜ |
| 1.7 | Listing sitemap generated | `curl /sitemap-listings.xml` | ⬜ |
| 1.8 | Shops sitemap generated | `curl /sitemap-shops.xml` | ⬜ |
| 1.9 | Canonical URLs on all pages | View source | ⬜ |
| 1.10 | No duplicate URLs | Google Search Console | ⬜ |
| 1.11 | hreflang tags present | View source | ⬜ |
| 1.12 | UTF-8 charset declared | View source | ⬜ |
| 1.13 | HTTPS enforced | Browser | ⬜ |
| 1.14 | Breadcrumb navigation on all pages | Visual check | ⬜ |
| 1.15 | Crawl budget optimized (private routes blocked) | robots.txt | ⬜ |
| 1.16 | Pagination uses crawlable links | View source | ⬜ |
| 1.17 | robots meta tags on noindex pages | View source | ⬜ |
| 1.18 | OpenGraph tags on all pages | [OpenGraph Debugger](https://developers.facebook.com/tools/debug/) | ⬜ |
| 1.19 | Twitter Cards on all pages | [Twitter Card Validator](https://cards-dev.twitter.com/validator) | ⬜ |
| 1.20 | favicon metadata | View source | ⬜ |
| 1.21 | theme-color meta | View source | ⬜ |
| 1.22 | manifest.webmanifest | View source | ⬜ |
| 1.23 | DNS prefetch hints | View source | ⬜ |
| 1.24 | preconnect hints | View source | ⬜ |
| 1.25 | Images use lazy loading | DevTools Network | ⬜ |
| 1.26 | Responsive images (srcset/sizes) | View source | ⬜ |
| 1.27 | WebP/AVIF image formats | DevTools Network | ⬜ |
| 1.28 | Font optimization | DevTools Network | ⬜ |
| 1.29 | CLS < 0.1 | [PageSpeed Insights](https://pagespeed.web.dev/) | ⬜ |
| 1.30 | LCP < 2.5s | PageSpeed Insights | ⬜ |
| 1.31 | FCP < 1.8s | PageSpeed Insights | ⬜ |
| 1.32 | INP < 200ms | PageSpeed Insights | ⬜ |
| 1.33 | TTFB < 500ms | PageSpeed Insights | ⬜ |
| 1.34 | JS code splitting | DevTools Network | ⬜ |
| 1.35 | CSS code splitting | DevTools Network | ⬜ |
| 1.36 | Gzip/Brotli compression | DevTools Network | ⬜ |

## 2. Meta Tags

| # | Check | Tool | Status |
|---|-------|------|--------|
| 2.1 | Unique title on every page | View source | ⬜ |
| 2.2 | Unique description on every page | View source | ⬜ |
| 2.3 | Keywords meta tag | View source | ⬜ |
| 2.4 | Canonical link | View source | ⬜ |
| 2.5 | OpenGraph tags | View source | ⬜ |
| 2.6 | Twitter Card tags | View source | ⬜ |
| 2.7 | Robots meta tag | View source | ⬜ |
| 2.8 | Geo tags (region, placename) | View source | ⬜ |
| 2.9 | Language tags | View source | ⬜ |

## 3. Dynamic Page Titles

| # | Check | Example | Status |
|---|-------|---------|--------|
| 3.1 | Listing titles include product + location | "iPhone 15 Pro Max Price in Dhaka \| BazarBD" | ⬜ |
| 3.2 | Category titles include category + location | "Mobile Phones in Dhaka \| BazarBD" | ⬜ |
| 3.3 | Location pages have dynamic titles | "Buy & Sell in Dhaka \| BazarBD" | ⬜ |
| 3.4 | Search pages have dynamic titles | "Search: iPhone in Dhaka \| BazarBD" | ⬜ |

## 4. Dynamic Meta Descriptions

| # | Check | Status |
|---|-------|--------|
| 4.1 | Each listing has unique description | ⬜ |
| 4.2 | Each category has unique description | ⬜ |
| 4.3 | Each location has unique description | ⬜ |
| 4.4 | Descriptions are human-readable | ⬜ |

## 5. URL Structure

| # | Check | Example | Status |
|---|-------|---------|--------|
| 5.1 | SEO-friendly category URLs | /electronics/mobile-phones | ⬜ |
| 5.2 | SEO-friendly listing URLs | /listing/iphone-15-pro-max-dhaka | ⬜ |
| 5.3 | SEO-friendly location URLs | /location/dhaka | ⬜ |
| 5.4 | SEO-friendly shop URLs | /shop/apple-store | ⬜ |

## 6. Structured Data (JSON-LD)

| # | Check | Tool | Status |
|---|-------|------|--------|
| 6.1 | Organization schema | [Rich Results Test](https://search.google.com/test/rich-results) | ⬜ |
| 6.2 | WebSite schema with SearchAction | Rich Results Test | ⬜ |
| 6.3 | BreadcrumbList on all pages | Rich Results Test | ⬜ |
| 6.4 | Product schema on listings | Rich Results Test | ⬜ |
| 6.5 | ItemList on category/search pages | Rich Results Test | ⬜ |
| 6.6 | ProfilePage on seller profiles | Rich Results Test | ⬜ |
| 6.7 | Store on shop pages | Rich Results Test | ⬜ |
| 6.8 | FAQPage where applicable | Rich Results Test | ⬜ |
| 6.9 | Review/Rating where applicable | Rich Results Test | ⬜ |
| 6.10 | ImageObject on images | Rich Results Test | ⬜ |

## 7-8. Category & Location Landing Pages

| # | Check | Status |
|---|-------|--------|
| 7.1 | Each category has SEO intro text | ⬜ |
| 7.2 | Each category shows latest listings | ⬜ |
| 7.3 | Each category has FAQs | ⬜ |
| 7.4 | Each location shows latest listings | ⬜ |
| 7.5 | Each location has popular searches | ⬜ |

## 9. Listing Page SEO

| # | Check | Status |
|---|-------|--------|
| 9.1 | Unique H1 on each listing | ⬜ |
| 9.2 | Breadcrumbs on each listing | ⬜ |
| 9.3 | Image alt text | ⬜ |
| 9.4 | Product structured data | ⬜ |
| 9.5 | Related listings section | ⬜ |
| 9.6 | Seller profile link | ⬜ |
| 9.7 | Location information | ⬜ |

## 10. Image SEO

| # | Check | Status |
|---|-------|--------|
| 10.1 | All images have ALT text | ⬜ |
| 10.2 | Images have title attributes | ⬜ |
| 10.3 | Images use lazy loading | ⬜ |
| 10.4 | Images have width/height | ⬜ |
| 10.5 | WebP format served | ⬜ |

## 11. Internal Linking

| # | Check | Status |
|---|-------|--------|
| 11.1 | Category links in navigation | ⬜ |
| 11.2 | Related listings on listing pages | ⬜ |
| 11.3 | Recently viewed section | ⬜ |
| 11.4 | Popular searches on home | ⬜ |

## 12. Search Optimization

| # | Check | Status |
|---|-------|--------|
| 12.1 | Brand + Category pages | ⬜ |
| 12.2 | Category + District pages | ⬜ |
| 12.3 | Category + Price filter pages | ⬜ |

## 13. Content SEO

| # | Check | Status |
|---|-------|--------|
| 13.1 | Unique content on every page | ⬜ |
| 13.2 | No keyword stuffing | ⬜ |
| 13.3 | Semantic keywords used | ⬜ |

## 14. E-E-A-T

| # | Check | Status |
|---|-------|--------|
| 14.1 | About Us page | ⬜ |
| 14.2 | Contact page | ⬜ |
| 14.3 | Privacy Policy | ⬜ |
| 14.4 | Terms of Service | ⬜ |
| 14.5 | Safety Tips page | ⬜ |
| 14.6 | Verified seller badges | ⬜ |

## 15. Core Web Vitals

| # | Metric | Target | Tool | Status |
|---|--------|--------|------|--------|
| 15.1 | LCP | < 2.5s | PageSpeed Insights | ⬜ |
| 15.2 | CLS | < 0.1 | PageSpeed Insights | ⬜ |
| 15.3 | INP | < 200ms | PageSpeed Insights | ⬜ |
| 15.4 | TTFB | < 500ms | PageSpeed Insights | ⬜ |
| 15.5 | Performance Score | > 95 | Lighthouse | ⬜ |
| 15.6 | SEO Score | 100 | Lighthouse | ⬜ |

## 16. Schema Validation

| # | Check | Tool | Status |
|---|-------|------|--------|
| 16.1 | All pages pass Rich Results Test | [Rich Results Test](https://search.google.com/test/rich-results) | ⬜ |
| 16.2 | Schema.org validation | [Schema.org Validator](https://validator.schema.org/) | ⬜ |

## 17. Indexing

| # | Check | Tool | Status |
|---|-------|------|--------|
| 17.1 | Google indexing | Google Search Console | ⬜ |
| 17.2 | Bing indexing | Bing Webmaster Tools | ⬜ |

## 18. Blog

| # | Check | Status |
|---|-------|--------|
| 18.1 | Blog architecture exists | ⬜ |
| 18.2 | Buying guides | ⬜ |
| 18.3 | Selling guides | ⬜ |

## 19. Programmatic SEO

| # | Check | Status |
|---|-------|--------|
| 19.1 | Brand + City landing pages | ⬜ |
| 19.2 | Category + City landing pages | ⬜ |

## 20. Analytics

| # | Check | Tool | Status |
|---|-------|------|--------|
| 20.1 | Google Analytics 4 | GA4 Dashboard | ⬜ |
| 20.2 | Google Search Console | GSC Dashboard | ⬜ |
| 20.3 | Microsoft Clarity | Clarity Dashboard | ⬜ |

## 21. Final Compliance

| # | Check | Status |
|---|-------|--------|
| 21.1 | No black-hat SEO | ⬜ |
| 21.2 | No doorway pages | ⬜ |
| 21.3 | No duplicate content | ⬜ |
| 21.4 | No keyword stuffing | ⬜ |
| 21.5 | Optimized for users first | ⬜ |

---

## Summary

| Section | Total Checks | Implemented |
|---------|-------------|-------------|
| 1. Technical SEO | 36 | ⬜ |
| 2. Meta Tags | 9 | ⬜ |
| 3. Dynamic Titles | 4 | ⬜ |
| 4. Dynamic Descriptions | 4 | ⬜ |
| 5. URL Structure | 4 | ⬜ |
| 6. Structured Data | 10 | ⬜ |
| 7-8. Landing Pages | 5 | ⬜ |
| 9. Listing SEO | 7 | ⬜ |
| 10. Image SEO | 5 | ⬜ |
| 11. Internal Linking | 4 | ⬜ |
| 12. Search Optimization | 3 | ⬜ |
| 13. Content SEO | 3 | ⬜ |
| 14. E-E-A-T | 6 | ⬜ |
| 15. Core Web Vitals | 6 | ⬜ |
| 16. Schema Validation | 2 | ⬜ |
| 17. Indexing | 2 | ⬜ |
| 18. Blog | 3 | ⬜ |
| 19. Programmatic SEO | 2 | ⬜ |
| 20. Analytics | 3 | ⬜ |
| 21. Final Compliance | 5 | ⬜ |
| **Total** | **107** | **⬜** |
