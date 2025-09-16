-- Fix security definer view issue by updating public_parking_spots view to use security_invoker
-- This ensures the view respects RLS policies of the querying user instead of the view creator

DROP VIEW IF EXISTS public.public_parking_spots;

CREATE VIEW public.public_parking_spots
WITH (security_invoker = true) AS
SELECT 
  id,
  title,
  description,
  address,
  latitude,
  longitude,
  price_per_hour,
  one_time_price,
  daily_price,
  monthly_price,
  pricing_type,
  spot_type,
  amenities,
  images,
  total_spots,
  available_spots,
  rating,
  total_reviews,
  is_active,
  created_at,
  updated_at
FROM parking_spots
WHERE is_active = true;