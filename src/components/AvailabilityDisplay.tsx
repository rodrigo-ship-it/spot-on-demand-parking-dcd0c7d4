
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AvailabilityDisplayProps {
  spotType: string;
  totalSpots?: number;
  spotId: string;
}

export const AvailabilityDisplay = ({ spotType, totalSpots = 1, spotId }: AvailabilityDisplayProps) => {
  const [availableSpots, setAvailableSpots] = useState(totalSpots);

  // Get real-time availability from current bookings
  useEffect(() => {
    const fetchCurrentAvailability = async () => {
      try {
        // Format current time as local time string for database comparison
        const now = new Date();
        const nowStr = now.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
        
        const { data: activeBookings, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('spot_id', spotId)
          .in('status', ['confirmed', 'active'])
          .lte('start_time', nowStr)
          .gte('end_time', nowStr);

        if (error) throw error;

        const occupiedSpots = activeBookings?.length || 0;
        setAvailableSpots(Math.max(0, totalSpots - occupiedSpots));
      } catch (error) {
        console.error('Error fetching availability:', error);
        setAvailableSpots(totalSpots); // Default to available if error
      }
    };

    fetchCurrentAvailability();

    // Set up real-time subscription
    const channel = supabase
      .channel(`availability-${spotId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `spot_id=eq.${spotId}`
        },
        () => {
          fetchCurrentAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spotId, totalSpots]);

  if (spotType === "entire-garage" || spotType === "entire-lot") {
    const isFullyOccupied = availableSpots === 0;
    const isAlmostFull = availableSpots <= Math.ceil(totalSpots * 0.2);

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Car className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">
            {availableSpots}/{totalSpots} available
          </span>
        </div>
        <Badge 
          variant={isFullyOccupied ? "destructive" : isAlmostFull ? "secondary" : "default"}
          className={
            isFullyOccupied 
              ? "bg-red-100 text-red-800" 
              : isAlmostFull 
              ? "bg-yellow-100 text-yellow-800" 
              : "bg-green-100 text-green-800"
          }
        >
          {isFullyOccupied ? "Full" : isAlmostFull ? "Almost Full" : "Available"}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Car className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium">
          Available
        </span>
      </div>
      <Badge variant="default" className="bg-green-100 text-green-800">
        Available
      </Badge>
    </div>
  );
};
