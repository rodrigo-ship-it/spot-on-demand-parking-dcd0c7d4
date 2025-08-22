import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TimeSlot {
  time: string;
  available: number;
  isAvailable: boolean;
}

export const useAvailableTimeSlots = (spotId: string, date: string, duration: number) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spotId || !date) return;

    const fetchAvailableSlots = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc('get_available_time_slots', {
          p_spot_id: spotId,
          p_date: date,
          p_duration_hours: duration
        });

        if (error) throw error;

        // Parse the JSON string response
        const parsedSlots = JSON.parse(data || '[]') as TimeSlot[];
        setTimeSlots(parsedSlots);
      } catch (err) {
        console.error('Error fetching available time slots:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch available times');
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();

    // Set up real-time subscription for this spot
    const channel = supabase
      .channel(`spot-availability-${spotId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `spot_id=eq.${spotId}`
        },
        () => {
          // Refetch when bookings change for this spot
          fetchAvailableSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spotId, date, duration]);

  return { timeSlots, loading, error };
};