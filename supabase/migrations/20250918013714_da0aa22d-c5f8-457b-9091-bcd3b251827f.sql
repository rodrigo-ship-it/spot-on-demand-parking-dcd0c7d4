-- Fix the secure functions to handle read-only contexts properly

-- Update the secure parking spot detail function to not require INSERT in read-only contexts
CREATE OR REPLACE FUNCTION public.get_secure_parking_spot_detail(spot_id_param uuid)
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
  total_reviews integer,
  access_instructions text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return spot details without owner information (no logging to avoid read-only issues)
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
    ps.total_reviews,
    ps.access_instructions
    -- Deliberately excluding owner_id for security
  FROM parking_spots ps
  WHERE ps.id = spot_id_param
    AND ps.is_active = true;
$$;

-- Update the secure parking listings function to not require INSERT in read-only contexts
CREATE OR REPLACE FUNCTION public.get_secure_parking_listings(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
) RETURNS TABLE(
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
  total_reviews integer,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return parking spots without owner information (no logging to avoid read-only issues)
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
    ps.total_reviews,
    ps.is_active,
    ps.created_at
    -- Deliberately excluding owner_id and updated_at for security
  FROM parking_spots ps
  WHERE ps.is_active = true
  ORDER BY ps.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;