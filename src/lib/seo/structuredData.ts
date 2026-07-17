// JSON-LD structured data builders for BazarBD
import { getBaseUrl } from './urls';

export interface BreadcrumbItem { name: string; url: string; }
export interface FaqItem { question: string; answer: string; }
export interface AdLike {
  id: string;
  title: string;
  slug?: string;
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
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  images?: { image_url: string }[];
}
export interface SellerLike {
  user_id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
  seller_rating?: number | null;
  total_sales?: number | null;
}
export interface ShopLike {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  banner_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  location_city?: string | null;
  rating?: number | null;
  total_reviews?: number | null;
}
export interface ReviewLike {
  id: string;
  rating: number;
  comment?: string | null;
  created_at?: string;
  reviewer_name?: string | null;
}
export interface ArticleLike {
  title: string;
  slug: string;
  description?: string | null;
  content?: string | null;
  published_at?: string;
  updated_at?: string;
  author_name?: string;
  image_url?: string | null;
}

export function buildOrganization() {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BazarBD',
    url: base,
    logo: `${base}/icons/icon-512.png`,
    description: 'Free classifieds marketplace to buy and sell across Bangladesh.',
    areaServed: { '@type': 'Country', name: 'Bangladesh' },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English', 'Bengali'],
    },
    sameAs: [
      'https://www.facebook.com/bazarbd',
      'https://www.instagram.com/bazarbd',
      'https://www.youtube.com/@bazarbd',
    ],
  };
}

export function buildWebSite() {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BazarBD',
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildProduct(ad: AdLike) {
  const base = getBaseUrl();
  const url = `${base}/listing/${ad.slug || ad.id}`;
  const images = ad.images?.map((img) => img.image_url) || [];

  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    price: ad.price ?? 0,
    priceCurrency: 'BDT',
    availability: 'https://schema.org/InStock',
    url,
    itemCondition: ad.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
  };

  if (ad.price_type === 'negotiable') {
    offer.priceSpecification = {
      '@type': 'PriceSpecification',
      price: ad.price ?? 0,
      priceCurrency: 'BDT',
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: ad.title,
    description: ad.description?.slice(0, 300) || ad.title,
    image: images,
    url,
    ...(ad.brand && { brand: { '@type': 'Brand', name: ad.brand } }),
    ...(ad.category_name && { category: ad.category_name }),
    offers: offer,
    ...(ad.created_at && { datePublished: ad.created_at }),
    ...(ad.updated_at && { dateModified: ad.updated_at }),
  };
}

export function buildItemList(ads: AdLike[]) {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: ads.slice(0, 20).map((ad, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${base}/listing/${ad.slug || ad.id}`,
      name: ad.title,
    })),
  };
}

export function buildCollectionPage(name: string, url: string, ads: AdLike[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url,
    hasPart: ads.slice(0, 20).map((ad) => buildProduct(ad)),
  };
}

export function buildProfilePage(seller: SellerLike) {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: `${base}/user/${seller.user_id}`,
    mainEntity: buildPerson(seller),
  };
}

export function buildPerson(profile: SellerLike) {
  return {
    '@type': 'Person',
    name: profile.full_name || 'Anonymous Seller',
    ...(profile.avatar_url && { image: profile.avatar_url }),
    ...(profile.is_verified && { hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'verified' } }),
    ...(profile.seller_rating != null && { aggregateRating: { '@type': 'AggregateRating', ratingValue: profile.seller_rating, reviewCount: profile.total_sales || 0 } }),
  };
}

export function buildStore(shop: ShopLike) {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.name,
    url: `${base}/shop/${shop.slug || shop.id}`,
    ...(shop.description && { description: shop.description }),
    ...(shop.banner_url && { image: shop.banner_url }),
    ...(shop.contact_phone && { telephone: shop.contact_phone }),
    ...(shop.contact_email && { email: shop.contact_email }),
    ...(shop.location_city && { address: { '@type': 'PostalAddress', addressLocality: shop.location_city, addressCountry: 'BD' } }),
    ...(shop.rating != null && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: shop.rating,
        reviewCount: shop.total_reviews || 0,
      },
    }),
  };
}

export function buildFAQ(faqs: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function buildReview(review: ReviewLike) {
  return {
    '@type': 'Review',
    reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5 },
    author: { '@type': 'Person', name: review.reviewer_name || 'Anonymous' },
    ...(review.comment && { reviewBody: review.comment }),
    ...(review.created_at && { datePublished: review.created_at }),
  };
}

export function buildImageObject(url: string, caption?: string) {
  return {
    '@type': 'ImageObject',
    url,
    ...(caption && { caption }),
  };
}

export function buildArticle(post: ArticleLike) {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    url: `${base}/blog/${post.slug}`,
    ...(post.description && { description: post.description }),
    ...(post.image_url && { image: post.image_url }),
    ...(post.published_at && { datePublished: post.published_at }),
    ...(post.updated_at && { dateModified: post.updated_at }),
    author: { '@type': 'Person', name: post.author_name || 'BazarBD Team' },
    publisher: {
      '@type': 'Organization',
      name: 'BazarBD',
      logo: { '@type': 'ImageObject', url: `${base}/icons/icon-512.png` },
    },
  };
}

export function buildMobileApplication() {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'BazarBD',
    operatingSystem: 'ANDROID, iOS',
    applicationCategory: 'ShoppingApplication',
    url: base,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BDT' },
  };
}

export function buildSpeakable(cssSelector: string = 'main h1, main h2') {
  return {
    '@type': 'SpeakableSpecification',
    cssSelector: [cssSelector],
  };
}
