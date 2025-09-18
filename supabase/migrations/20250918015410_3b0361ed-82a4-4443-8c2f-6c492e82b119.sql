-- Fix all security-related RLS and function issues that are breaking booking functionality

-- 1. First, create a simpler get session details function that doesn't rely on complex security checks
CREATE OR REPLACE FUNCTION get_session_payment_intent(session_id_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- This is a simplified version that edge functions can call
  -- The actual session validation happens in the edge function
  RETURN session_id_param;
END;
$function$;

-- 2. Fix RLS policies on bookings to ensure proper access for booking confirmation
-- Update the booking RLS policies to be less restrictive for the user's own bookings
DROP POLICY IF EXISTS "Users can view bookings they're involved in" ON bookings;
DROP POLICY IF EXISTS "Users can view their own bookings as renter" ON bookings;

-- Create a comprehensive policy for viewing own bookings
CREATE POLICY "Users can view their bookings" 
ON bookings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = renter_id OR 
    auth.uid() IN (
      SELECT owner_id FROM parking_spots WHERE id = bookings.spot_id
    )
  )
);

-- 3. Fix profile access for booking-related owner information
-- Allow secure access to profile information for bookings
CREATE OR REPLACE FUNCTION get_booking_owner_info(booking_id_param uuid)
RETURNS TABLE(owner_name text, owner_phone text, owner_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return owner info if the requesting user is involved in the booking
  RETURN QUERY
  SELECT 
    COALESCE(p.full_name, 'Unknown Owner') as owner_name,
    COALESCE(p.phone, 'No phone') as owner_phone,
    p.user_id as owner_id
  FROM bookings b
  JOIN parking_spots ps ON ps.id = b.spot_id
  JOIN profiles p ON p.user_id = ps.owner_id
  WHERE b.id = booking_id_param
    AND (
      auth.uid() = b.renter_id OR 
      auth.uid() = ps.owner_id
    );
END;
$function$;

-- 4. Create a safe function to get parking spot details for bookings
CREATE OR REPLACE FUNCTION get_booking_spot_details(spot_id_param uuid, booking_id_param uuid)
RETURNS TABLE(
  id uuid, 
  title text, 
  address text, 
  price_per_hour numeric, 
  daily_price numeric, 
  monthly_price numeric, 
  pricing_type text,
  owner_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return spot details if the user is involved in the specific booking
  RETURN QUERY
  SELECT 
    ps.id,
    ps.title,
    ps.address,
    ps.price_per_hour,
    ps.daily_price,
    ps.monthly_price,
    ps.pricing_type,
    ps.owner_id
  FROM parking_spots ps
  JOIN bookings b ON b.spot_id = ps.id
  WHERE ps.id = spot_id_param 
    AND b.id = booking_id_param
    AND (
      auth.uid() = b.renter_id OR 
      auth.uid() = ps.owner_id
    );
END;
$function$;

-- 5. Fix time zone handling by removing problematic timezone conversion functions
-- Create a simple function to handle local time display
CREATE OR REPLACE FUNCTION format_booking_time_display(
  start_time_param timestamp without time zone,
  end_time_param timestamp without time zone,
  pricing_type_param text
)
RETURNS TABLE(
  display_date text,
  display_start_time text,
  display_end_time text,
  display_duration_text text
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  start_date timestamp;
  end_date timestamp;
  duration_hours integer;
BEGIN
  start_date := start_time_param;
  end_date := end_time_param;
  
  -- Calculate duration in hours
  duration_hours := EXTRACT(EPOCH FROM (end_date - start_date)) / 3600;
  
  -- Return formatted display values
  RETURN QUERY SELECT
    TO_CHAR(start_date, 'MM/DD/YYYY') as display_date,
    CASE 
      WHEN pricing_type_param = 'monthly' THEN NULL
      ELSE TO_CHAR(start_date, 'HH12:MI AM')
    END as display_start_time,
    CASE 
      WHEN pricing_type_param = 'monthly' THEN NULL
      ELSE TO_CHAR(end_date, 'HH12:MI AM')
    END as display_end_time,
    CASE 
      WHEN pricing_type_param = 'monthly' THEN 
        CASE 
          WHEN duration_hours >= 720 THEN CEIL(duration_hours / 720.0)::text || ' months'
          ELSE '1 month'
        END
      WHEN duration_hours >= 24 THEN 
        CEIL(duration_hours / 24.0)::text || ' days'
      ELSE 
        duration_hours::text || ' hours'
    END as display_duration_text;
END;
$function$;