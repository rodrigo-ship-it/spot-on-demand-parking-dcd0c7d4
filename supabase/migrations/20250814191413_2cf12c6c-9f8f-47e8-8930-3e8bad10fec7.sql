-- Fix the log_security_event function which is likely missing the search_path
CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_event_data jsonb DEFAULT '{}'::jsonb, p_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;