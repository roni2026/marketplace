/**
 * Location utilities: radius search, distance calculation,
// geocoding, region/city management, pickup points, and user location.
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  Region,
  City,
  AdLocation,
  AdLocationInsert,
  PickupPoint,
} from '@/integrations/supabase/types_v2_listings';

// -------------------------------------------------------------------------
// Distance Calculation (Haversine formula)
// -------------------------------------------------------------------------

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// -------------------------------------------------------------------------
// Radius Search
// -------------------------------------------------------------------------

export async function searchByRadius(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<{ ad_id: string; distance: number }[]> {
  // Fetch all ad locations (Supabase doesn't have native geo queries;
  // for production use PostGIS or a database function)
  const { data, error } = await supabase
    .from('ad_locations')
    .select('ad_id, latitude, longitude');

  if (error) {
    console.error('searchByRadius error:', error);
    return [];
  }

  const results: { ad_id: string; distance: number }[] = [];
  for (const loc of data || []) {
    if (loc.latitude !== null && loc.longitude !== null) {
      const distance = calculateDistance(lat, lng, loc.latitude, loc.longitude);
      if (distance <= radiusKm) {
        results.push({ ad_id: loc.ad_id, distance: Math.round(distance * 100) / 100 });
      }
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
}

export async function getNearbyListings(
  adId: string,
  radiusKm: number
): Promise<{ ad_id: string; distance: number }[]> {
  // Get the ad's location
  const { data: loc, error } = await supabase
    .from('ad_locations')
    .select('latitude, longitude')
    .eq('ad_id', adId)
    .single();

  if (error || !loc || loc.latitude === null || loc.longitude === null) {
    return [];
  }

  const nearby = await searchByRadius(loc.latitude, loc.longitude, radiusKm);
  return nearby.filter((n) => n.ad_id !== adId);
}

// -------------------------------------------------------------------------
// Geocoding (placeholder for external API integration)
// -------------------------------------------------------------------------

export async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  // Placeholder: integrate with Google Maps, Mapbox, or Nominatim API
  // Example with Nominatim (OpenStreetMap):
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const results = await response.json();
    if (results && results.length > 0) {
      return {
        latitude: parseFloat(results[0].lat),
        longitude: parseFloat(results[0].lon),
      };
    }
  } catch (err) {
    console.error('geocodeAddress error:', err);
  }
  return null;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ address: string; city: string | null; region: string | null } | null> {
  // Placeholder: integrate with Google Maps, Mapbox, or Nominatim API
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const result = await response.json();
    if (result && result.address) {
      return {
        address: result.display_name || '',
        city: result.address.city || result.address.town || result.address.village || null,
        region: result.address.state || result.address.region || null,
      };
    }
  } catch (err) {
    console.error('reverseGeocode error:', err);
  }
  return null;
}

// -------------------------------------------------------------------------
// Regions & Cities
// -------------------------------------------------------------------------

export async function getRegions(): Promise<Region[]> {
  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getRegions error:', error);
    return [];
  }
  return (data as Region[]) || [];
}

export async function getCities(regionId: string): Promise<City[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('region_id', regionId)
    .order('name', { ascending: true });

  if (error) {
    console.error('getCities error:', error);
    return [];
  }
  return (data as City[]) || [];
}

// -------------------------------------------------------------------------
// Pickup Points
// -------------------------------------------------------------------------

export async function addPickupPoint(
  adId: string,
  location: PickupPoint
): Promise<AdLocation | null> {
  // Fetch existing ad location
  const { data: existing, error: fetchError } = await supabase
    .from('ad_locations')
    .select('*')
    .eq('ad_id', adId)
    .maybeSingle();

  if (fetchError) {
    console.error('addPickupPoint fetch error:', fetchError);
    return null;
  }

  if (existing) {
    const current = existing as AdLocation;
    const points = current.pickup_points || [];
    const updated: Partial<AdLocationInsert> = {
      pickup_points: [...points, location],
    };
    const { data, error } = await supabase
      .from('ad_locations')
      .update({ ...updated, updated_at: new Date().toISOString() })
      .eq('ad_id', adId)
      .select()
      .single();

    if (error) {
      toast.error('Failed to add pickup point');
      console.error('addPickupPoint update error:', error);
      return null;
    }
    toast.success('Pickup point added');
    return data as AdLocation;
  }

  // Create new ad location record
  const payload: AdLocationInsert = {
    ad_id: adId,
    pickup_points: [location],
  };
  const { data, error } = await supabase
    .from('ad_locations')
    .insert(payload)
    .select()
    .single();

  if (error) {
    toast.error('Failed to add pickup point');
    console.error('addPickupPoint insert error:', error);
    return null;
  }
  toast.success('Pickup point added');
  return data as AdLocation;
}

export async function getPickupPoints(adId: string): Promise<PickupPoint[]> {
  const { data, error } = await supabase
    .from('ad_locations')
    .select('pickup_points')
    .eq('ad_id', adId)
    .maybeSingle();

  if (error) {
    console.error('getPickupPoints error:', error);
    return [];
  }
  if (!data) return [];
  return (data.pickup_points as PickupPoint[]) || [];
}

// -------------------------------------------------------------------------
// User Location
// -------------------------------------------------------------------------

export async function saveUserLocation(
  userId: string,
  lat: number,
  lng: number,
  address: string
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      area: address,
    })
    .eq('user_id', userId);

  if (error) {
    toast.error('Failed to save location');
    console.error('saveUserLocation error:', error);
    return false;
  }
  toast.success('Location saved');
  return true;
}
