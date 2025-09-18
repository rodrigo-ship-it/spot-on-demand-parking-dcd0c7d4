-- Add audit trigger and secure banking data functions

-- Trigger to automatically log all access to banking data
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

-- Function to securely mask banking data for display
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

-- Function for edge functions to securely access banking data
CREATE OR REPLACE FUNCTION get_secure_payout_settings(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  stripe_connect_account_id text,
  onboarding_completed boolean,
  payouts_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return essential data for edge functions (no sensitive banking details)
  -- Log the access for audit purposes
  PERFORM log_security_event_enhanced(
    'edge_function_banking_access',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'caller_user_id', auth.uid(),
      'timestamp', extract(epoch from now())
    ),
    auth.uid(),
    'warning'
  );

  RETURN QUERY
  SELECT 
    ps.id,
    ps.user_id,
    ps.stripe_connect_account_id,
    ps.onboarding_completed,
    ps.payouts_enabled
  FROM payout_settings ps
  WHERE ps.user_id = p_user_id;
END;
$$;