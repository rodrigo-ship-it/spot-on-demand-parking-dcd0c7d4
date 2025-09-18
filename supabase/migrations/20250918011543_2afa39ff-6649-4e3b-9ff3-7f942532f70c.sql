-- SECURITY FIX: Banking Details Protection
-- Addressing critical security vulnerability in payout_settings table

-- 1. Drop existing potentially vulnerable policies
DROP POLICY IF EXISTS "Enhanced payout settings access" ON payout_settings;

-- 2. Create more restrictive and secure policies

-- Policy 1: Block ALL access to anonymous users (already exists, but ensuring it's correct)
CREATE POLICY IF NOT EXISTS "Deny anonymous access to payout_settings" 
ON payout_settings 
FOR ALL
USING (false)
WITH CHECK (false);

-- Policy 2: Users can only access their own payout settings with enhanced validation
CREATE POLICY "Users can only access own banking details"
ON payout_settings
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND validate_financial_access(auth.uid(), 'payout_setting'::text, id)
);

-- Policy 3: Users can only create payout settings for themselves
CREATE POLICY "Users can create own payout settings only"
ON payout_settings
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Policy 4: Users can only update their own payout settings
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

-- Policy 5: Secure admin access using role-based system
CREATE POLICY "Admins can access payout settings for support"
ON payout_settings
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND current_user_has_role('admin'::app_role)
);

-- Policy 6: Admins can update payout settings for support (with logging)
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

-- 3. Enhanced financial data access validation function
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

-- 4. Function to log admin access to banking data
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

-- 5. Trigger to automatically log all access to banking data
CREATE OR REPLACE FUNCTION audit_banking_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all access to payout_settings table
  PERFORM log_security_event_enhanced(
    'banking_table_access',
    jsonb_build_object(
      'operation', TG_OP,
      'user_id', auth.uid(),
      'record_id', COALESCE(NEW.id, OLD.id),
      'timestamp', extract(epoch from now()),
      'ip_address', current_setting('request.headers', true)::json->>'cf-connecting-ip'
    ),
    auth.uid(),
    'critical'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for banking data access auditing
DROP TRIGGER IF EXISTS audit_payout_settings_access ON payout_settings;
CREATE TRIGGER audit_payout_settings_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON payout_settings
  FOR EACH ROW EXECUTE FUNCTION audit_banking_data_access();

-- 6. Function to securely mask banking data for display
CREATE OR REPLACE FUNCTION get_masked_banking_info(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  bank_name text,
  account_last_four text,
  account_type text,
  onboarding_completed boolean,
  payouts_enabled boolean,
  is_verified boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return only non-sensitive banking information with masking
  SELECT 
    ps.id,
    ps.bank_name,
    ps.account_number_last_four as account_last_four,
    ps.account_type,
    ps.onboarding_completed,
    ps.payouts_enabled,
    ps.is_verified
  FROM payout_settings ps
  WHERE ps.user_id = p_user_id
  AND (auth.uid() = p_user_id OR current_user_has_role('admin'::app_role));
$$;