-- Fix security warning: Set search_path for the function
DROP FUNCTION IF EXISTS public.log_security_event(TEXT, JSONB, UUID);

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT auth.uid()
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
    p_event_type,
    p_event_data,
    inet(current_setting('request.headers', true)::json->>'cf-connecting-ip'),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;