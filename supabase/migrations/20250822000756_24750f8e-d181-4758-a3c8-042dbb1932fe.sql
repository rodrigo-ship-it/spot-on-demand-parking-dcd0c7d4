-- Update overlap check to handle multiple spots per location
CREATE OR REPLACE FUNCTION public.check_booking_overlap(
  p_spot_id UUID,
  p_start_time TIMESTAMP,
  p_end_time TIMESTAMP,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  total_spots INTEGER;
  occupied_spots INTEGER;
BEGIN
  -- Get total spots available for this parking location
  SELECT ps.total_spots INTO total_spots
  FROM parking_spots ps
  WHERE ps.id = p_spot_id;
  
  -- If total_spots is null or 0, default to 1
  IF total_spots IS NULL OR total_spots <= 0 THEN
    total_spots := 1;
  END IF;
  
  -- Count how many spots are occupied during the requested time period
  -- (including 30-minute grace periods)
  SELECT COUNT(*) INTO occupied_spots
  FROM bookings
  WHERE spot_id = p_spot_id
    AND status IN ('confirmed', 'active')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
      -- Booking overlaps with requested time (including grace periods)
      (start_time < (p_end_time + INTERVAL '30 minutes') AND 
       (end_time + INTERVAL '30 minutes') > p_start_time)
    );
  
  -- Return true if adding this booking would exceed available spots
  RETURN occupied_spots >= total_spots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;