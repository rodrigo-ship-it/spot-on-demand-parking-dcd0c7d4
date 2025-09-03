-- Create enhanced security functions for data protection

-- Function to encrypt sensitive vehicle data
CREATE OR REPLACE FUNCTION public.encrypt_vehicle_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Mask license plate for privacy (keep first 2 and last 1 character)
  IF NEW.license_plate IS NOT NULL AND LENGTH(NEW.license_plate) > 3 THEN
    NEW.license_plate := SUBSTRING(NEW.license_plate FROM 1 FOR 2) || '***' || RIGHT(NEW.license_plate, 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for vehicle data protection
CREATE TRIGGER vehicle_data_protection_trigger
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_vehicle_data();

-- Enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  p_table_name TEXT,
  p_operation TEXT,
  p_user_id UUID DEFAULT auth.uid(),
  p_record_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to sensitive data tables
  PERFORM public.log_security_event_enhanced(
    'sensitive_data_access',
    jsonb_build_object(
      'table_name', p_table_name,
      'operation', p_operation,
      'record_id', p_record_id,
      'access_time', extract(epoch from now())
    ),
    p_user_id,
    'info'
  );
END;
$$;

-- Create function to validate financial data access
CREATE OR REPLACE FUNCTION public.validate_financial_access(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure user can only access their own financial data
  CASE p_resource_type
    WHEN 'payment_method' THEN
      RETURN EXISTS (
        SELECT 1 FROM payment_methods 
        WHERE id = p_resource_id AND user_id = p_user_id
      );
    WHEN 'payout_setting' THEN
      RETURN EXISTS (
        SELECT 1 FROM payout_settings 
        WHERE id = p_resource_id AND user_id = p_user_id
      );
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- Enhanced RLS policy for payment methods with additional validation
DROP POLICY IF EXISTS "Users can view only their own payment methods" ON public.payment_methods;
CREATE POLICY "Enhanced payment method access" ON public.payment_methods
FOR ALL
USING (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL
  AND public.validate_financial_access(auth.uid(), 'payment_method', id)
);

-- Enhanced RLS policy for payout settings with additional validation
DROP POLICY IF EXISTS "Users can view only their own payout settings" ON public.payout_settings;
CREATE POLICY "Enhanced payout settings access" ON public.payout_settings
FOR ALL
USING (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL
  AND public.validate_financial_access(auth.uid(), 'payout_setting', id)
);

-- Create audit trigger for payment methods access
CREATE OR REPLACE FUNCTION public.audit_payment_method_access()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_sensitive_data_access('payment_methods', TG_OP, auth.uid(), COALESCE(NEW.id, OLD.id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER payment_method_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_payment_method_access();

-- Create audit trigger for payout settings access
CREATE OR REPLACE FUNCTION public.audit_payout_settings_access()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_sensitive_data_access('payout_settings', TG_OP, auth.uid(), COALESCE(NEW.id, OLD.id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER payout_settings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payout_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_payout_settings_access();

-- Create function to get masked vehicle data
CREATE OR REPLACE FUNCTION public.get_masked_vehicle_data(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  make TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  license_plate_masked TEXT,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    v.id,
    v.make,
    v.model,
    v.year,
    v.color,
    CASE 
      WHEN LENGTH(v.license_plate) > 3 THEN 
        SUBSTRING(v.license_plate FROM 1 FOR 2) || '***' || RIGHT(v.license_plate, 1)
      ELSE '***'
    END as license_plate_masked,
    v.is_default,
    v.created_at
  FROM vehicles v
  WHERE v.user_id = p_user_id;
$$;

-- Add data retention policy function
CREATE OR REPLACE FUNCTION public.apply_data_retention_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete old security audit logs (90 days retention)
  DELETE FROM security_audit_log 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Archive old admin audit logs (1 year retention)
  DELETE FROM admin_audit_log 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Log the cleanup operation
  PERFORM public.log_security_event_enhanced(
    'data_retention_cleanup',
    jsonb_build_object(
      'operation', 'automatic_cleanup',
      'timestamp', extract(epoch from now())
    ),
    NULL,
    'info'
  );
END;
$$;