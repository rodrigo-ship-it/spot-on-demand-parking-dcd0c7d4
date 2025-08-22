-- Fix security warning: set search_path for check_booking_overlap function
CREATE OR REPLACE FUNCTION public.check_booking_overlap(
  p_spot_id UUID,
  p_start_time TIMESTAMP,
  p_end_time TIMESTAMP,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if there are any overlapping confirmed or active bookings
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE spot_id = p_spot_id
      AND status IN ('confirmed', 'active')
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND (
        -- New booking starts during existing booking
        (p_start_time >= start_time AND p_start_time < end_time)
        OR
        -- New booking ends during existing booking  
        (p_end_time > start_time AND p_end_time <= end_time)
        OR
        -- New booking completely encompasses existing booking
        (p_start_time <= start_time AND p_end_time >= end_time)
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;