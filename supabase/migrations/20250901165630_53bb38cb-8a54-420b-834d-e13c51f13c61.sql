-- Fix Remaining Critical Security Vulnerabilities
-- This addresses the remaining 4 critical security issues

-- 1. CRITICAL: Remove business partner access to profiles - too broad
DROP POLICY IF EXISTS "Business partners can view limited profile info" ON public.profiles;

-- Create a more secure function for getting safe profile data during business interactions
CREATE OR REPLACE FUNCTION public.get_safe_profile_for_booking(booking_id_param uuid)
RETURNS TABLE(full_name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return profile data for users involved in the specific booking
  SELECT 
    COALESCE(p.full_name, 'Anonymous User') as full_name,
    p.avatar_url
  FROM profiles p
  JOIN bookings b ON (p.user_id = b.renter_id OR p.user_id IN (
    SELECT ps.owner_id FROM parking_spots ps WHERE ps.id = b.spot_id
  ))
  WHERE b.id = booking_id_param 
    AND p.user_id != auth.uid(); -- Don't return own profile through this function
$$;

-- 2. CRITICAL: Ensure payment methods are ONLY accessible to the owner
DROP POLICY IF EXISTS "Users can view only their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can create only their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update only their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete only their own payment methods" ON public.payment_methods;

CREATE POLICY "Users can view only their own payment methods" 
ON public.payment_methods 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can create only their own payment methods" 
ON public.payment_methods 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update only their own payment methods" 
ON public.payment_methods 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete only their own payment methods" 
ON public.payment_methods 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 3. CRITICAL: Ensure payout settings are ONLY accessible to the owner
DROP POLICY IF EXISTS "Users can view only their own payout settings" ON public.payout_settings;
DROP POLICY IF EXISTS "Users can create only their own payout settings" ON public.payout_settings;
DROP POLICY IF EXISTS "Users can update only their own payout settings" ON public.payout_settings;

CREATE POLICY "Users can view only their own payout settings" 
ON public.payout_settings 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can create only their own payout settings" 
ON public.payout_settings 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update only their own payout settings" 
ON public.payout_settings 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 4. CRITICAL: Restrict refunds to user who requested them only
DROP POLICY IF EXISTS "Users can view their own refund requests" ON public.refunds;
DROP POLICY IF EXISTS "Spot owners can view refunds for their bookings" ON public.refunds;
DROP POLICY IF EXISTS "Users can create refund requests for their bookings" ON public.refunds;

-- Only allow users to see their own refund requests
CREATE POLICY "Users can view only their own refund requests" 
ON public.refunds 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can create refund requests for their own bookings" 
ON public.refunds 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL
  AND auth.uid() IN (
    SELECT renter_id FROM bookings WHERE id = refunds.booking_id
  )
);

-- 5. Add admin-only access for sensitive operations (keep existing admin policies)
-- Admins can view profiles for support purposes (keep existing policy)
-- Admins can view all profiles (keep existing policy)

-- 6. Create secure function for messaging/review display names only
CREATE OR REPLACE FUNCTION public.get_display_name_for_booking(booking_id_param uuid, target_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return display name if the requesting user is involved in the booking
  SELECT COALESCE(p.full_name, 'Anonymous User')
  FROM profiles p
  WHERE p.user_id = target_user_id
    AND auth.uid() IN (
      SELECT b.renter_id FROM bookings b WHERE b.id = booking_id_param
      UNION
      SELECT ps.owner_id FROM parking_spots ps 
      JOIN bookings b ON ps.id = b.spot_id 
      WHERE b.id = booking_id_param
    );
$$;