import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ParkingSpot {
  id: string;
  title: string;
  address: string;
  price_per_hour: number;
  available_spots: number;
  total_spots: number;
  is_active: boolean;
  [key: string]: any;
}

export const useRealTimeSpots = () => {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth context to be ready before making database calls
    if (authLoading) return;
    
    // Initial load using secure function
    const loadSpots = async () => {
      try {
        const { data, error } = await supabase.rpc('get_secure_parking_listings', {
          p_limit: 1000, // Large limit to get all spots
          p_offset: 0
        });

        if (error) throw error;
        setSpots(data || []);
      } catch (error) {
        console.error('Error loading spots:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSpots();

    // Set up real-time subscription
    const channel = supabase
      .channel('parking-spots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parking_spots'
        },
        (payload) => {
          console.log('Real-time spot update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            setSpots(prev => [payload.new as ParkingSpot, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setSpots(prev => prev.map(spot => 
              spot.id === payload.new.id ? payload.new as ParkingSpot : spot
            ));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setSpots(prev => prev.filter(spot => spot.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading]);

  return { spots, loading };
};