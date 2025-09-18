import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type SecureParkingSpot = {
  id: string;
  title: string;
  description: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  price_per_hour: number | null;
  one_time_price: number | null;
  daily_price: number | null;
  monthly_price: number | null;
  pricing_type: string;
  spot_type: string;
  amenities: string[] | null;
  images: string[] | null;
  total_spots: number | null;
  available_spots: number | null;
  rating: number | null;
  total_reviews: number | null;
  is_active: boolean;
  created_at: string;
};

type SecureParkingSpotDetail = {
  id: string;
  title: string;
  description: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  price_per_hour: number | null;
  one_time_price: number | null;
  daily_price: number | null;
  monthly_price: number | null;
  pricing_type: string;
  spot_type: string;
  amenities: string[] | null;
  images: string[] | null;
  total_spots: number | null;
  available_spots: number | null;
  rating: number | null;
  total_reviews: number | null;
  access_instructions: string | null;
};

export const useSecureParkingData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSecureParkingListings = async (limit = 50, offset = 0): Promise<SecureParkingSpot[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_secure_parking_listings', {
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;
      
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch parking listings';
      setError(errorMessage);
      console.error('Error fetching secure parking listings:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getSecureParkingSpotDetail = async (spotId: string): Promise<SecureParkingSpotDetail | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_secure_parking_spot_detail', {
        spot_id_param: spotId
      });

      if (error) throw error;
      
      return data?.[0] || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch parking spot details';
      setError(errorMessage);
      console.error('Error fetching secure parking spot detail:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getSpotOwnerForInvolvedUsers = async (spotId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('get_spot_owner_for_involved_users', {
        spot_id_param: spotId
      });

      if (error) throw error;
      
      return data?.[0]?.owner_id || null;
    } catch (err) {
      console.error('Error fetching spot owner for involved users:', err);
      return null;
    }
  };

  return {
    getSecureParkingListings,
    getSecureParkingSpotDetail,
    getSpotOwnerForInvolvedUsers,
    isLoading,
    error
  };
};