CREATE OR REPLACE FUNCTION public.update_expired_bookings()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update confirmed bookings that have started to 'active'
  UPDATE bookings
  SET status = 'active',
      updated_at = NOW()
  WHERE status = 'confirmed'
    AND start_time <= NOW()
    AND end_time > NOW();
  
  -- NOTE: Active bookings are NOT auto-completed here.
  -- Completion only happens via:
  -- 1. Manual user checkout
  -- 2. The check-late-checkouts function (3+ hours past end_time)
END;
$function$;