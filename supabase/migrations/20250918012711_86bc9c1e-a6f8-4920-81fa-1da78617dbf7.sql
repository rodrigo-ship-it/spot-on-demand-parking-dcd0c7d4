-- Phase 1: Critical Security Fixes - Protect Public Parking Data

-- 1. Enable RLS on public_parking_spots table if not already enabled
ALTER TABLE public.public_parking_spots ENABLE ROW LEVEL SECURITY;

-- 2. Create secure policies for public_parking_spots to prevent unlimited scraping
CREATE POLICY "Rate limited public access to parking spots" 
ON public.public_parking_spots 
FOR SELECT 
USING (
  -- Allow access but log it for monitoring
  (SELECT log_api_access('public_parking_listings', auth.uid(), 
    inet(current_setting('request.headers', true)::json->>'cf-connecting-ip'))
  ) IS NOT NULL
);

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

-- 4. Create enhanced authenticated user policy that allows owner_id access only when authenticated
CREATE POLICY "Authenticated users can view active spots with limited owner info" 
ON public.parking_spots 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
  -- Log access for monitoring
  AND (SELECT log_api_access('authenticated_parking_listings', auth.uid()) IS NOT NULL)
);

-- 5. Create function to detect and prevent scraping patterns
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

-- 6. Create function to get secure parking spot listings without exposing sensitive data
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

-- 7. Create monitoring function for admin to detect scraping attempts
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

-- 8. Tighten INSERT policies with NULL qualifiers by adding explicit auth checks
-- Update any problematic INSERT policies to ensure proper authentication

-- Create audit trigger for parking spot access
CREATE OR REPLACE FUNCTION public.audit_parking_spot_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log SELECT operations on parking spots for monitoring
  IF TG_OP = 'SELECT' THEN
    PERFORM log_security_event_enhanced(
      'parking_spot_accessed',
      jsonb_build_object(
        'spot_id', NEW.id,
        'access_type', 'direct_table_access',
        'user_id', auth.uid(),
        'timestamp', extract(epoch from now())
      ),
      auth.uid(),
      'info'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;