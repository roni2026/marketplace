import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
  generateMetaTags,
  SITE_NAME,
  type MetaTagConfig,
} from '@/lib/seo/meta';
import { getBaseUrl } from '@/lib/seo/urls';
import {
  buildOrganization,
  buildWebSite,
  buildBreadcrumbList,
  type BreadcrumbItem,
} from '@/lib/seo/structuredData';

export interface SEOProps extends MetaTagConfig {
  breadcrumbs?: BreadcrumbItem[];
  structuredData?: object | object[];
  includeGlobalSchema?: boolean;
}

export default function SEO({
  title,
  description,
  keywords,
  image,
  url,
  type,
  noindex,
  nofollow,
  canonical,
  publishedTime,
  modifiedTime,
  author,
  breadcrumbs,
  structuredData,
  includeGlobalSchema = true,
}: SEOProps) {
  const meta = generateMetaTags({
    title,
    description,
    keywords,
    image,
    url,
    type,
    noindex,
    nofollow,
    canonical,
    publishedTime,
    modifiedTime,
    author,
  });

  const schemas: object[] = [];
  if (includeGlobalSchema) {
    schemas.push(buildOrganization());
    schemas.push(buildWebSite());
  }
  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push(buildBreadcrumbList(breadcrumbs));
  }
  if (structuredData) {
    if (Array.isArray(structuredData)) schemas.push(...structuredData);
    else schemas.push(structuredData);
  }

  const base = getBaseUrl();

  return (
    <Helmet>
      <html lang={meta.lang} />
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="keywords" content={meta.keywords} />
      <meta name="robots" content={meta.robots} />
      <link rel="canonical" href={meta.canonical} />

      {/* Geo tags */}
      {Object.entries(meta.geo).map(([key, val]) => (
        <meta key={key} name={key} content={val} />
      ))}

      {/* OpenGraph */}
      {Object.entries(meta.og).map(([key, val]) => (
        <meta key={key} property={key} content={val} />
      ))}

      {/* Twitter Cards */}
      {Object.entries(meta.twitter).map(([key, val]) => (
        <meta key={key} name={key} content={val} />
      ))}

      {/* hreflang */}
      <link rel="alternate" hrefLang="en" href={meta.canonical} />
      <link rel="alternate" hrefLang="bn" href={`${meta.canonical}?lang=bn`} />
      <link rel="alternate" hrefLang="x-default" href={meta.canonical} />

      {/* Theme color */}
      <meta name="theme-color" content="#0284c7" />
      <meta name="application-name" content={SITE_NAME} />

      {/* DNS prefetch / preconnect */}
      <link rel="dns-prefetch" href="//res.cloudinary.com" />
      <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />

      {/* Structured data */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
