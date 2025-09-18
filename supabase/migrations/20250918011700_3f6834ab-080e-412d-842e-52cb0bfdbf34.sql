-- SECURITY FIX: Banking Details Protection
-- Addressing critical security vulnerability in payout_settings table

-- 1. Drop existing potentially vulnerable policies
DROP POLICY IF EXISTS "Enhanced payout settings access" ON payout_settings;
DROP POLICY IF EXISTS "Users can create only their own payout settings" ON payout_settings;
DROP POLICY IF EXISTS "Users can update only their own payout settings" ON payout_settings;

-- 2. Create more restrictive and secure policies

-- Policy 1: Users can only access their own payout settings with enhanced validation
CREATE POLICY "Users can only access own banking details"
ON payout_settings
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND validate_financial_access(auth.uid(), 'payout_setting'::text, id)
);

-- Policy 2: Users can only create payout settings for themselves
CREATE POLICY "Users can create own payout settings only"
ON payout_settings
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Policy 3: Users can only update their own payout settings
CREATE POLICY "Users can update own payout settings only"
ON payout_settings
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND validate_financial_access(auth.uid(), 'payout_setting'::text, id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Policy 4: Secure admin access using role-based system
CREATE POLICY "Admins can access payout settings for support"
ON payout_settings
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND current_user_has_role('admin'::app_role)
);

-- Policy 5: Admins can update payout settings for support (with logging)
CREATE POLICY "Admins can update payout settings for support"
ON payout_settings
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND current_user_has_role('admin'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND current_user_has_role('admin'::app_role)
);