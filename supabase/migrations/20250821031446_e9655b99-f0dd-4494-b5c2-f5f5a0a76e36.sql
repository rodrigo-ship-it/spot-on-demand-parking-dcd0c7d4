-- Phase 1: Critical Admin Security - Create role-based access control system

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Create convenience function to check if current user has role
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role);
$$;

-- Create improved is_admin function using roles
CREATE OR REPLACE FUNCTION public.is_admin_v2()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_has_role('admin');
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.current_user_has_role('admin'));

CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.current_user_has_role('admin'))
WITH CHECK (public.current_user_has_role('admin'));

-- Insert admin role for existing admin user
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES ('6873bf76-bda8-4035-991c-db90d509ffd6', 'admin', '6873bf76-bda8-4035-991c-db90d509ffd6')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create security audit table for admin actions
CREATE TABLE public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL,
    action TEXT NOT NULL,
    target_user_id UUID,
    target_resource TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin audit logs
CREATE POLICY "Admins can view admin audit logs"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.current_user_has_role('admin'));

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_action TEXT,
    p_target_user_id UUID DEFAULT NULL,
    p_target_resource TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id UUID;
BEGIN
    -- Only allow admins to log actions
    IF NOT public.current_user_has_role('admin') THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    INSERT INTO public.admin_audit_log (
        admin_user_id,
        action,
        target_user_id,
        target_resource,
        details,
        ip_address,
        user_agent
    ) VALUES (
        auth.uid(),
        p_action,
        p_target_user_id,
        p_target_resource,
        p_details,
        inet(current_setting('request.headers', true)::json->>'cf-connecting-ip'),
        current_setting('request.headers', true)::json->>'user-agent'
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Update manual penalty charge function to use new admin check
CREATE OR REPLACE FUNCTION public.manual_charge_penalty_v2(penalty_credit_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  penalty_record record;
  formatted_timestamp text;
BEGIN
  -- Only allow admins to run this using new role system
  IF NOT public.current_user_has_role('admin') THEN
    RETURN jsonb_build_object('error', 'Access denied: Admin privileges required');
  END IF;

  -- Log admin action
  PERFORM public.log_admin_action('manual_penalty_charge', NULL, 'penalty_credits', 
    jsonb_build_object('penalty_credit_id', penalty_credit_id_param));

  -- Get penalty credit details
  SELECT pc.*, b.renter_id, b.total_amount as booking_amount
  INTO penalty_record
  FROM penalty_credits pc
  JOIN bookings b ON pc.booking_id = b.id
  WHERE pc.id = penalty_credit_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Penalty credit not found');
  END IF;

  IF penalty_record.status != 'active' THEN
    RETURN jsonb_build_object('error', 'Penalty credit is not active');
  END IF;

  -- Format timestamp properly for JSON
  formatted_timestamp := to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  -- Call the charge-penalty edge function with the FULL amount from penalty_credits table
  SELECT
    net.http_post(
        url:='https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/charge-penalty',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWd5d21qd2t1aHdmbmpvcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNDgxNDEsImV4cCI6MjA2OTcyNDE0MX0.EGAJKEHg4Jn9_mK8IaIo7btm_wPWC0OhN_Vwl6iw0pA"}'::jsonb,
        body:=jsonb_build_object(
          'bookingId', penalty_record.booking_id,
          'amount', penalty_record.amount,
          'description', penalty_record.description,
          'penaltyCreditId', penalty_record.id,
          'penaltyAmount', 20,
          'hourlyCharges', 18
        )
    ) INTO result;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Manual penalty charge initiated',
    'penalty_credit_id', penalty_credit_id_param,
    'amount', penalty_record.amount,
    'request_result', result
  );
END;
$$;

-- Update manual late checkout check function
CREATE OR REPLACE FUNCTION public.manual_check_late_checkouts_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  formatted_timestamp text;
BEGIN
  -- Only allow admins to run this using new role system
  IF NOT public.current_user_has_role('admin') THEN
    RETURN jsonb_build_object('error', 'Access denied: Admin privileges required');
  END IF;

  -- Log admin action
  PERFORM public.log_admin_action('manual_late_checkout_check', NULL, 'bookings', '{}'::jsonb);

  -- Format timestamp properly for JSON
  formatted_timestamp := to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  -- Call the edge function to check for late checkouts
  SELECT
    net.http_post(
        url:='https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/check-late-checkouts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWd5d21qd2t1aHdmbmpvcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNDgxNDEsImV4cCI6MjA2OTcyNDE0MX0.EGAJKEHg4Jn9_mK8IaIo7btm_wPWC0OhN_Vwl6iw0pA"}'::jsonb,
        body:=jsonb_build_object('timestamp', formatted_timestamp, 'source', 'manual')
    ) INTO result;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Late checkout check initiated',
    'request_id', result
  );
END;
$$;

-- Enhanced security audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
    p_event_type TEXT, 
    p_event_data JSONB DEFAULT '{}',
    p_user_id UUID DEFAULT auth.uid(),
    p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    format('%s_severity:%s', p_event_type, p_severity),
    p_event_data || jsonb_build_object('severity', p_severity, 'timestamp', extract(epoch from now())),
    inet(current_setting('request.headers', true)::json->>'cf-connecting-ip'),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Strengthen profiles RLS policies
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

CREATE POLICY "Authenticated users only for profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can only access own profile data"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can access all profiles for support"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.current_user_has_role('admin'));

-- Add triggers for updated_at on new tables
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_admin_audit_log_admin_user_id ON public.admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);