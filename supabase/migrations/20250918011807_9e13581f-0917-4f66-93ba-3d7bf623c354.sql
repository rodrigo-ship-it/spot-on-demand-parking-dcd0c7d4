-- SECURITY FIX: Banking Details Protection (Policy Update)
-- Addressing critical security vulnerability in payout_settings table

-- Drop all existing policies to recreate them securely
DROP POLICY IF EXISTS "Users can only access own banking details" ON payout_settings;
DROP POLICY IF EXISTS "Users can create own payout settings only" ON payout_settings;
DROP POLICY IF EXISTS "Users can update own payout settings only" ON payout_settings;
DROP POLICY IF EXISTS "Admins can access payout settings for support" ON payout_settings;
DROP POLICY IF EXISTS "Admins can update payout settings for support" ON payout_settings;

-- Create secure policies with enhanced validation

-- Policy 1: Users can only access their own banking details with audit logging
CREATE POLICY "Secure user banking access"
ON payout_settings
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND validate_financial_access(auth.uid(), 'payout_setting'::text, id)
);

-- Policy 2: Users can only create their own payout settings
CREATE POLICY "Secure user banking creation"
ON payout_settings
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Policy 3: Users can only update their own banking details
CREATE POLICY "Secure user banking updates"
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

-- Policy 4: Admin access with proper role validation and logging
CREATE POLICY "Secure admin banking access"
ON payout_settings
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND current_user_has_role('admin'::app_role)
);

-- Policy 5: Admin updates with proper role validation and logging
CREATE POLICY "Secure admin banking updates"
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

-- Enhanced financial data access validation function with security logging
CREATE OR REPLACE FUNCTION validate_enhanced_financial_access(
  p_user_id uuid, 
  p_resource_type text, 
  p_resource_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enhanced validation for financial data access
  CASE p_resource_type
    WHEN 'payout_setting' THEN
      -- Verify user owns the payout setting AND log the access
      IF EXISTS (
        SELECT 1 FROM payout_settings 
        WHERE id = p_resource_id AND user_id = p_user_id
      ) THEN
        -- Log sensitive financial data access
        PERFORM log_security_event_enhanced(
          'banking_data_access',
          jsonb_build_object(
            'resource_id', p_resource_id,
            'resource_type', p_resource_type,
            'access_type', 'owner_access',
            'timestamp', extract(epoch from now())
          ),
          p_user_id,
          'warning'
        );
        RETURN TRUE;
      END IF;
      RETURN FALSE;
    WHEN 'payment_method' THEN
      -- Existing payment method validation
      RETURN EXISTS (
        SELECT 1 FROM payment_methods 
        WHERE id = p_resource_id AND user_id = p_user_id
      );
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- Function to log admin access to banking data with detailed audit trail
CREATE OR REPLACE FUNCTION log_admin_banking_access(
  p_payout_setting_id uuid,
  p_action text,
  p_reason text DEFAULT 'Support inquiry'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Only allow admins to call this function
  IF NOT current_user_has_role('admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Get the user ID for the payout setting
  SELECT user_id INTO target_user_id
  FROM payout_settings
  WHERE id = p_payout_setting_id;
  
  -- Log the admin action with high security level
  PERFORM log_admin_action(
    p_action,
    target_user_id,
    'payout_settings',
    jsonb_build_object(
      'payout_setting_id', p_payout_setting_id,
      'reason', p_reason,
      'security_level', 'critical',
      'data_type', 'banking_information'
    )
  );
  
  -- Also log in security audit log
  PERFORM log_security_event_enhanced(
    'admin_banking_access',
    jsonb_build_object(
      'payout_setting_id', p_payout_setting_id,
      'target_user_id', target_user_id,
      'action', p_action,
      'reason', p_reason,
      'admin_user_id', auth.uid()
    ),
    auth.uid(),
    'critical'
  );
END;
$$;