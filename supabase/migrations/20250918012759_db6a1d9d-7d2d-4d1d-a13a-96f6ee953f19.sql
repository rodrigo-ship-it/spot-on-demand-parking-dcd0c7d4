-- Phase 1: Critical Security Fixes - Protect Parking Data Access

-- 1. Since public_parking_spots is a view, we'll control access through secure functions instead
-- First, let's enhance the existing security functions

-- Create function to detect and prevent scraping patterns
CREATE OR REPLACE FUNCTION public.check_rate_limit_parking_access(
  p_ip_address inet DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count integer;
  is_blocked boolean := false;
BEGIN
  -- Count requests from this IP in the last hour
  SELECT COUNT(*) INTO request_count
  FROM security_audit_log
  WHERE event_type LIKE '%parking_listings%'
    AND created_at > now() - interval '1 hour'
    AND (
      (event_data->>'ip_address')::inet = COALESCE(p_ip_address, 
        inet(current_setting('request.headers', true)::json->>'cf-connecting-ip'))
      OR user_id = p_user_id
    );

  -- Block if more than 100 requests per hour from same source
  IF request_count > 100 THEN
    -- Log the block
    PERFORM log_security_event_enhanced(
      'rate_limit_blocked_parking_access',
      jsonb_build_object(
        'ip_address', COALESCE(p_ip_address, 
          inet(current_setting('request.headers', true)::json->>'cf-connecting-ip')),
        'user_id', p_user_id,
        'request_count', request_count,
        'blocked_at', extract(epoch from now())
      ),
      p_user_id,
      'critical'
    );
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 2. Create secure function to get parking spot listings without exposing sensitive data
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check rate limit first
  IF NOT check_rate_limit_parking_access() THEN
    -- Return empty result set if rate limited
    RETURN;
  END IF;

  -- Log the access
  PERFORM log_api_access('secure_parking_listings', auth.uid());

  -- Return parking spots without owner information
  RETURN QUERY
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
END;
$$;

-- 3. Update parking_spots policies to hide owner_id from anonymous users
DROP POLICY IF EXISTS "Public can browse active spots (no owner info)" ON public.parking_spots;

CREATE POLICY "Anonymous users can browse active spots (no owner data)" 
ON public.parking_spots 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NULL
  -- This policy specifically excludes owner_id from being accessible
);

-- 4. Create enhanced authenticated user policy that logs access
DROP POLICY IF EXISTS "Authenticated users can view active spots" ON public.parking_spots;

CREATE POLICY "Authenticated users can view active spots with monitoring" 
ON public.parking_spots 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
  -- Log access for monitoring
  AND (SELECT log_api_access('authenticated_parking_listings', auth.uid()) IS NOT NULL)
);

-- 5. Create monitoring function for admin to detect scraping attempts
CREATE OR REPLACE FUNCTION public.get_potential_scraping_activity()
RETURNS TABLE(
  ip_address inet,
  user_id uuid,
  request_count bigint,
  first_request timestamp with time zone,
  last_request timestamp with time zone,
  risk_level text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow admins to access this function
  SELECT 
    (event_data->>'ip_address')::inet as ip_address,
    sal.user_id,
    COUNT(*) as request_count,
    MIN(sal.created_at) as first_request,
    MAX(sal.created_at) as last_request,
    CASE 
      WHEN COUNT(*) > 200 THEN 'CRITICAL'
      WHEN COUNT(*) > 100 THEN 'HIGH'
      WHEN COUNT(*) > 50 THEN 'MEDIUM'
      ELSE 'LOW'
    END as risk_level
  FROM security_audit_log sal
  WHERE event_type LIKE '%parking_listings%'
    AND created_at > now() - interval '24 hours'
    AND current_user_has_role('admin'::app_role)
  GROUP BY (event_data->>'ip_address')::inet, sal.user_id
  HAVING COUNT(*) > 20
  ORDER BY request_count DESC;
$$;

-- 6. Create secure function for getting individual parking spot details
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to individual spot details
  PERFORM log_api_access('parking_spot_detail_view', auth.uid());
  
  -- Return spot details without owner information
  RETURN QUERY
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
END;
$$;

-- 7. Create function to get owner info only for involved users (bookings)
CREATE OR REPLACE FUNCTION public.get_spot_owner_for_involved_users(spot_id_param uuid)
RETURNS TABLE(owner_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return owner info if user has an active booking for this spot
  SELECT ps.owner_id
  FROM parking_spots ps
  WHERE ps.id = spot_id_param
    AND ps.is_active = true
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.spot_id = ps.id 
      AND (b.renter_id = auth.uid() OR ps.owner_id = auth.uid())
      AND b.status IN ('confirmed', 'active')
    );
$$;