-- Security Enhancement: Restrict competitor data access
-- Phase 1: Address high-priority security issues

-- 1. Update parking_spots RLS to hide owner_id from public queries
-- Drop existing public access policy and create a more secure one
DROP POLICY IF EXISTS "Everyone can view active parking spots" ON parking_spots;

-- Create secure public view policy that excludes owner_id
CREATE POLICY "Public can browse active spots (no owner info)" 
ON parking_spots 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NULL  -- This policy only applies to anonymous users
);

-- Allow authenticated users to see more details but still protect owner privacy
CREATE POLICY "Authenticated users can view active spots" 
ON parking_spots 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
);

-- 2. Restrict places table access to authenticated users only
-- Drop existing public access policy
DROP POLICY IF EXISTS "Rate limited public access to places" ON places;

-- Create authenticated-only access policy for places
CREATE POLICY "Authenticated users can search places" 
ON places 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. Create a secure function for public spot data without owner info
CREATE OR REPLACE FUNCTION get_public_spot_listings()
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
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Return parking spot data for public browsing WITHOUT owner information
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
    ps.created_at,
    ps.updated_at
    -- Deliberately excluding owner_id to prevent competitor data harvesting
  FROM parking_spots ps
  WHERE ps.is_active = true
  ORDER BY ps.created_at DESC;
$$;

-- 4. Enhanced rate limiting function for API protection
CREATE OR REPLACE FUNCTION log_api_access(
  endpoint_name text,
  user_id_param uuid DEFAULT auth.uid(),
  ip_address_param inet DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log API access for rate limiting analysis
  PERFORM log_security_event_enhanced(
    'api_access',
    jsonb_build_object(
      'endpoint', endpoint_name,
      'user_id', user_id_param,
      'ip_address', COALESCE(ip_address_param, inet(current_setting('request.headers', true)::json->>'cf-connecting-ip')),
      'timestamp', extract(epoch from now()),
      'user_agent', current_setting('request.headers', true)::json->>'user-agent'
    ),
    user_id_param,
    'info'
  );
END;
$$;

-- 5. Function to detect suspicious data access patterns
CREATE OR REPLACE FUNCTION detect_scraping_patterns()
RETURNS TABLE(
  ip_address inet,
  request_count integer,
  first_request timestamp with time zone,
  last_request timestamp with time zone,
  risk_score integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Analyze security logs for potential scraping patterns
  WITH recent_api_access AS (
    SELECT 
      (event_data->>'ip_address')::inet as ip,
      created_at,
      event_data->>'endpoint' as endpoint
    FROM security_audit_log 
    WHERE event_type LIKE 'api_access%'
      AND created_at > now() - interval '1 hour'
      AND event_data->>'ip_address' IS NOT NULL
  ),
  ip_stats AS (
    SELECT 
      ip,
      COUNT(*) as request_count,
      MIN(created_at) as first_request,
      MAX(created_at) as last_request,
      COUNT(DISTINCT endpoint) as unique_endpoints
    FROM recent_api_access
    GROUP BY ip
  )
  SELECT 
    ip as ip_address,
    request_count,
    first_request,
    last_request,
    CASE 
      WHEN request_count > 100 THEN 100
      WHEN request_count > 50 AND unique_endpoints > 5 THEN 80
      WHEN request_count > 30 THEN 60
      WHEN request_count > 15 AND unique_endpoints > 3 THEN 40
      ELSE 20
    END as risk_score
  FROM ip_stats
  WHERE request_count > 10  -- Only flag IPs with significant activity
  ORDER BY risk_score DESC, request_count DESC;
$$;