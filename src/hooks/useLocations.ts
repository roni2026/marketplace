import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  searchByRadius,
  getNearbyListings,
  getRegions,
  getCities,
  addPickupPoint,
  getPickupPoints,
  saveUserLocation,
} from '@/lib/locations';
import type {
  Region,
  City,
  PickupPoint,
} from '@/integrations/supabase/types_v2_listings';

export function useLocations() {
  const { user } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [nearbyListings, setNearbyListings] = useState<{ ad_id: string; distance: number }[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRegions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRegions();
      setRegions(data);
    } catch (err) {
      setError('Failed to fetch regions');
      console.error('fetchRegions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCities = useCallback(async (regionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCities(regionId);
      setCities(data);
    } catch (err) {
      setError('Failed to fetch cities');
      console.error('fetchCities error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearchByRadius = useCallback(
    async (lat: number, lng: number, radiusKm: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await searchByRadius(lat, lng, radiusKm);
        setNearbyListings(results);
        return results;
      } catch (err) {
        setError('Failed to search by radius');
        console.error('searchByRadius error:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchNearbyListings = useCallback(
    async (adId: string, radiusKm: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await getNearbyListings(adId, radiusKm);
        setNearbyListings(results);
        return results;
      } catch (err) {
        setError('Failed to fetch nearby listings');
        console.error('fetchNearbyListings error:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSaveUserLocation = useCallback(
    async (lat: number, lng: number, address: string) => {
      if (!user) return false;
      return saveUserLocation(user.id, lat, lng, address);
    },
    [user]
  );

  const fetchPickupPoints = useCallback(async (adId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPickupPoints(adId);
      setPickupPoints(data);
    } catch (err) {
      setError('Failed to fetch pickup points');
      console.error('fetchPickupPoints error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddPickupPoint = useCallback(
    async (adId: string, location: PickupPoint) => {
      const data = await addPickupPoint(adId, location);
      if (data && data.pickup_points) {
        setPickupPoints(data.pickup_points);
      }
      return data;
    },
    []
  );

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  return {
    regions,
    cities,
    nearbyListings,
    pickupPoints,
    isLoading,
    error,
    fetchRegions,
    fetchCities,
    searchByRadius: handleSearchByRadius,
    fetchNearbyListings,
    saveUserLocation: handleSaveUserLocation,
    fetchPickupPoints,
    addPickupPoint: handleAddPickupPoint,
  };
}
