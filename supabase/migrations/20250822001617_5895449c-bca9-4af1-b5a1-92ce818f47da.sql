-- Create function to get available time slots for a parking spot
CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_spot_id UUID,
  p_date DATE,
  p_duration_hours INTEGER DEFAULT 1
)
RETURNS TABLE(
  time_slot TIME,
  available_spots INTEGER,
  is_available BOOLEAN
) AS $$
DECLARE
  total_spots INTEGER;
  slot_time TIME;
  slot_end TIME;
  occupied_count INTEGER;
BEGIN
  -- Get total spots for this location
  SELECT ps.total_spots INTO total_spots
  FROM parking_spots ps
  WHERE ps.id = p_spot_id;
  
  -- Default to 1 if null
  IF total_spots IS NULL OR total_spots <= 0 THEN
    total_spots := 1;
  END IF;
  
  -- Generate time slots from 6 AM to 10 PM in 30-minute intervals
  FOR hour_val IN 6..21 LOOP
    FOR minute_val IN 0..1 LOOP
      slot_time := (hour_val || ':' || (minute_val * 30) || ':00')::TIME;
      slot_end := slot_time + (p_duration_hours || ' hours')::INTERVAL;
      
      -- Don't show slots that would end after 11 PM
      IF slot_end <= '23:00:00'::TIME THEN
        -- Count occupied spots during this time slot
        SELECT COUNT(*) INTO occupied_count
        FROM bookings
        WHERE spot_id = p_spot_id
          AND status IN ('confirmed', 'active')
          AND DATE(start_time) = p_date
          AND (
            -- Check overlap with grace periods
            (TIME(start_time) < (slot_end + INTERVAL '30 minutes') AND 
             (TIME(end_time) + INTERVAL '30 minutes') > slot_time)
          );
        
        -- Return the slot with availability info
        time_slot := slot_time;
        available_spots := total_spots - occupied_count;
        is_available := occupied_count < total_spots;
        
        RETURN NEXT;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;