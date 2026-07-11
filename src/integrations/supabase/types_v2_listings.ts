/**
 * TypeScript types for the v2 advanced listing, location, and media schema.
 * These complement the base types in types.ts.
 */

export type MediaType = 'image' | 'video' | '360';
export type ConditionGrade = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

export interface ListingVariant {
  id: string;
  ad_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  serial_number: string | null;
  price: number | null;
  stock: number | null;
  attributes: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ListingVariantInsert {
  ad_id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  serial_number?: string | null;
  price?: number | null;
  stock?: number | null;
  attributes?: Record<string, unknown> | null;
}

export interface ListingVariantUpdate {
  name?: string;
  sku?: string | null;
  barcode?: string | null;
  serial_number?: string | null;
  price?: number | null;
  stock?: number | null;
  attributes?: Record<string, unknown> | null;
}

export interface ListingTemplate {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  default_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ListingTemplateInsert {
  user_id: string;
  name: string;
  category_id?: string | null;
  default_fields?: Record<string, unknown> | null;
}

export interface PriceHistory {
  id: string;
  ad_id: string;
  old_price: number | null;
  new_price: number | null;
  changed_at: string;
}

export interface PriceDropAlert {
  id: string;
  user_id: string;
  ad_id: string;
  target_price: number;
  notified: boolean | null;
  created_at: string;
}

export interface PriceDropAlertInsert {
  user_id: string;
  ad_id: string;
  target_price: number;
}

export interface AdMedia {
  id: string;
  ad_id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  sort_order: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AdMediaInsert {
  ad_id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string | null;
  sort_order?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface AdLocation {
  id: string;
  ad_id: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  region: string | null;
  pickup_points: PickupPoint[] | null;
  created_at: string;
  updated_at: string;
}

export interface PickupPoint {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface AdLocationInsert {
  ad_id: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  pickup_points?: PickupPoint[] | null;
}

export interface Region {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number | null;
  created_at: string;
}

export interface City {
  id: string;
  region_id: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface MediaLibraryItem {
  id: string;
  user_id: string;
  filename: string;
  url: string;
  thumbnail_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  hash: string | null;
  duplicate_of: string | null;
  created_at: string;
}

export interface MediaLibraryInsert {
  user_id: string;
  filename: string;
  url: string;
  thumbnail_url?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  hash?: string | null;
  duplicate_of?: string | null;
}

export interface ImageOptimization {
  id: string;
  media_id: string;
  optimized_url: string;
  width: number | null;
  height: number | null;
  quality: number | null;
  created_at: string;
}

export interface ImageOptimizationInsert {
  media_id: string;
  optimized_url: string;
  width?: number | null;
  height?: number | null;
  quality?: number | null;
}
