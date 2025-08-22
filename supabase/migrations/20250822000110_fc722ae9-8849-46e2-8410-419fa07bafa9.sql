-- Add trigger to validate booking overlaps before insert/update
CREATE OR REPLACE FUNCTION public.validate_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping bookings on INSERT or UPDATE
  IF public.check_booking_overlap(
    NEW.spot_id, 
    NEW.start_time, 
    NEW.end_time, 
    NEW.id  -- Exclude current booking on UPDATE
  ) THEN
    RAISE EXCEPTION 'Booking conflicts with existing reservation. Time slot is not available.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for booking overlap validation
DROP TRIGGER IF EXISTS booking_overlap_validation ON bookings;
CREATE TRIGGER booking_overlap_validation
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_overlap();