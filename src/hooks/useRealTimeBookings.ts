import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Booking {
  id: string;
  spot_id: string;
  renter_id: string;
  status: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  [key: string]: any;
}

export const useRealTimeBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Initial load
    const loadBookings = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            parking_spots (
              title,
              address,
              price_per_hour,
              owner_id
            )
          `)
          .eq('renter_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        console.error('Error loading bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();

    // Set up real-time subscription for user's bookings
    const channel = supabase
      .channel('user-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `renter_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time booking update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            setBookings(prev => [payload.new as Booking, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setBookings(prev => prev.map(booking => 
              booking.id === payload.new.id ? { ...booking, ...payload.new } : booking
            ));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setBookings(prev => prev.filter(booking => booking.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { bookings, loading };
};