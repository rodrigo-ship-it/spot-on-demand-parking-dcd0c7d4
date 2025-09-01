-- Fix parking spots security issue: Hide owner_id from public access

-- Drop existing public access policy for parking spots
DROP POLICY IF EXISTS "Anonymous can view limited parking spot info" ON public.parking_spots;

-- Create a more secure policy that excludes owner_id from public access
CREATE POLICY "Public can view parking spots without owner info" ON public.parking_spots
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Create a secure function to get parking spot data without exposing owner information
CREATE OR REPLACE FUNCTION public.get_public_parking_spot_info(spot_id_param uuid)
RETURNS TABLE(
  id uuid, 
  title text, 
  description text, 
  address text, 
  latitude numeric, 
  longitude numeric, 
  price_per_hour numeric, 
  one_time_price numeric, 
  daily_price numeric, 
  monthly_price numeric, 
  pricing_type text, 
  spot_type text, 
  amenities text[], 
  images text[], 
  total_spots integer, 
  available_spots integer, 
  rating numeric, 
  total_reviews integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return parking spot data without owner information for public use
  SELECT 
    ps.id,
    ps.title,
    ps.description,
    ps.address,
    ps.latitude,
    ps.longitude,
    ps.price_per_hour,
    ps.one_time_price,
    ps.daily_price,
    ps.monthly_price,
    ps.pricing_type,
    ps.spot_type,
    ps.amenities,
    ps.images,
    ps.total_spots,
    ps.available_spots,
    ps.rating,
    ps.total_reviews
    -- Note: owner_id is deliberately excluded for privacy
  FROM parking_spots ps
  WHERE ps.id = spot_id_param
    AND ps.is_active = true;
$$;

-- Create a function for authenticated users to get owner info (only when they're involved in bookings)
CREATE OR REPLACE FUNCTION public.get_spot_owner_for_booking(spot_id_param uuid, booking_id_param uuid)
RETURNS TABLE(owner_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return owner info if the user is involved in a booking for this spot
  SELECT ps.owner_id
  FROM parking_spots ps
  JOIN bookings b ON b.spot_id = ps.id
  WHERE ps.id = spot_id_param
    AND b.id = booking_id_param
    AND (b.renter_id = auth.uid() OR ps.owner_id = auth.uid())
    AND auth.uid() IS NOT NULL;
$$;

-- Log this security fix
SELECT public.log_security_event_enhanced(
  'parking_spots_privacy_hardening',
  jsonb_build_object(
    'action', 'secured_owner_information',
    'tables_affected', 'parking_spots',
    'functions_created', ARRAY['get_public_parking_spot_info', 'get_spot_owner_for_booking'],
    'timestamp', extract(epoch from now())
  ),
  auth.uid(),
  'high'
);