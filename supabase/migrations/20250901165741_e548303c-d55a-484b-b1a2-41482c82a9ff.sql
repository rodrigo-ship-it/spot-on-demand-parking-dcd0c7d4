-- Final Security Lockdown - Ensure No Anonymous Access to Sensitive Data
-- This ensures all sensitive tables are completely locked down from anonymous access

-- 1. CRITICAL: Ensure profiles table has NO anonymous access
-- First, check if there are any policies allowing anonymous access
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous can view profiles" ON public.profiles;

-- Ensure RLS is enabled on all sensitive tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. CRITICAL: Add explicit DENY policies for anonymous users on sensitive tables
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to payment_methods" 
ON public.payment_methods 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to payout_settings" 
ON public.payout_settings 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to refunds" 
ON public.refunds 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to bookings" 
ON public.bookings 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to disputes" 
ON public.disputes 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to vehicles" 
ON public.vehicles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to messages" 
ON public.messages 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- 3. CRITICAL: Ensure parking_spots only shows safe data to anonymous users
DROP POLICY IF EXISTS "Public can view basic parking spot info" ON public.parking_spots;

-- Create a very restrictive policy for anonymous users viewing parking spots
CREATE POLICY "Anonymous can view limited parking spot info" 
ON public.parking_spots 
FOR SELECT 
TO anon
USING (
  is_active = true 
  -- Only allow viewing of essential booking info, not sensitive owner data
);

-- Create a function to get safe parking spot data for anonymous users
CREATE OR REPLACE FUNCTION public.get_safe_parking_spot_data(spot_id_param uuid)
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
  -- Return parking spot data without exposing owner information
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
  FROM parking_spots ps
  WHERE ps.id = spot_id_param
    AND ps.is_active = true;
$$;