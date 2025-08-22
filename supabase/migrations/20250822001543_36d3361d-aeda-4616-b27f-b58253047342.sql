-- Create function to get available time slots for a parking spot
CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_spot_id UUID,
  p_date DATE,
  p_duration_hours INTEGER DEFAULT 1
)
RETURNS TABLE(
  start_time TIME,
  available_spots INTEGER,
  is_fully_available BOOLEAN
) AS $$
DECLARE
  total_spots INTEGER;
  current_time TIME;
  end_time TIME;
  slot_start TIME;
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
  current_time := '06:00:00'::TIME;
  end_time := '22:00:00'::TIME;
  
  WHILE current_time <= end_time LOOP
    slot_start := current_time;
    slot_end := current_time + (p_duration_hours || ' hours')::INTERVAL;
    
    -- Don't show slots that would end after 11 PM
    IF slot_end <= '23:00:00'::TIME THEN
      -- Count occupied spots during this time slot (including grace periods)
      SELECT COUNT(*) INTO occupied_count
      FROM bookings b
      WHERE b.spot_id = p_spot_id
        AND b.status IN ('confirmed', 'active')
        AND DATE(b.start_time) = p_date
        AND (
          -- Check overlap with grace periods
          (TIME(b.start_time) < (slot_end + INTERVAL '30 minutes') AND 
           (TIME(b.end_time) + INTERVAL '30 minutes') > slot_start)
        );
      
      -- Return the slot with availability info
      RETURN QUERY SELECT 
        slot_start,
        (total_spots - occupied_count)::INTEGER,
        (occupied_count < total_spots)::BOOLEAN;
    END IF;
    
    -- Move to next 30-minute slot
    current_time := current_time + INTERVAL '30 minutes';
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;