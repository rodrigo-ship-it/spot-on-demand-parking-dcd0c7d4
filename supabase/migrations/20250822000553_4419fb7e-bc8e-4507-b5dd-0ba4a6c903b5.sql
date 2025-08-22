-- Update overlap check to include 30-minute grace period after bookings end
CREATE OR REPLACE FUNCTION public.check_booking_overlap(
  p_spot_id UUID,
  p_start_time TIMESTAMP,
  p_end_time TIMESTAMP,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if there are any overlapping confirmed or active bookings
  -- Includes 30-minute grace period after existing bookings end
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE spot_id = p_spot_id
      AND status IN ('confirmed', 'active')
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND (
        -- New booking starts during existing booking (including grace period)
        (p_start_time >= start_time AND p_start_time < (end_time + INTERVAL '30 minutes'))
        OR
        -- New booking ends during existing booking (including grace period before start)
        (p_end_time > (start_time - INTERVAL '30 minutes') AND p_end_time <= end_time)
        OR
        -- New booking completely encompasses existing booking (including buffers)
        (p_start_time <= (start_time - INTERVAL '30 minutes') AND p_end_time >= (end_time + INTERVAL '30 minutes'))
        OR
        -- Additional check: existing booking encompasses new booking
        (start_time <= p_start_time AND end_time >= p_end_time)
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;