-- Fix security vulnerabilities in database functions by setting proper search_path

-- Update mark_message_as_read function to secure search_path
CREATE OR REPLACE FUNCTION public.mark_message_as_read(message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE messages 
  SET read_at = now() 
  WHERE id = message_id 
    AND recipient_id = auth.uid()
    AND read_at IS NULL;
END;
$function$;

-- Update get_unread_message_count function to secure search_path  
CREATE OR REPLACE FUNCTION public.get_unread_message_count(booking_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM messages
  WHERE booking_id = booking_id_param
    AND recipient_id = auth.uid()
    AND read_at IS NULL;
    
  RETURN COALESCE(unread_count, 0);
END;
$function$;

-- Update auto_resolve_disputes function to secure search_path
CREATE OR REPLACE FUNCTION public.auto_resolve_disputes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-approve photo disputes with clear evidence after 48 hours
  UPDATE disputes 
  SET status = 'resolved',
      resolution = 'Auto-resolved: Photo evidence reviewed',
      auto_resolved = true,
      updated_at = now()
  WHERE status = 'pending' 
    AND dispute_type = 'damage_claim'
    AND photo_url IS NOT NULL
    AND created_at < now() - interval '48 hours';
END;
$function$;

-- Remove materialized views from API access for security
REVOKE ALL ON daily_analytics FROM anon, authenticated;
REVOKE ALL ON owner_analytics FROM anon, authenticated;