-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the pg_net extension if not already enabled  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to check for late checkouts every 10 minutes
-- This will automatically detect overdue bookings and apply penalties
SELECT cron.schedule(
  'check-late-checkouts-every-10-min',
  '*/10 * * * *', -- Every 10 minutes
  $$
  SELECT
    net.http_post(
        url:='https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/check-late-checkouts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWd5d21qd2t1aHdmbmpvcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NTk3MDcsImV4cCI6MjA1NDAzNTcwN30.N-yGLEfyKWxNMH6P-mQl4_bm5sL-8SIlfqTDJCb7lQs"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '", "source": "cron"}')::jsonb
    ) as request_id;
  $$
);

-- Also create a manual function that admins can call to force check late checkouts
CREATE OR REPLACE FUNCTION public.manual_check_late_checkouts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied: Admin privileges required');
  END IF;

  -- Call the edge function to check for late checkouts
  SELECT
    net.http_post(
        url:='https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/check-late-checkouts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWd5d21qd2t1aHdmbmpvcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NTk3MDcsImV4cCI6MjA1NDAzNTcwN30.N-yGLEfyKWxNMH6P-mQl4_bm5sL-8SIlfqTDJCb7lQs"}'::jsonb,
        body:='{"timestamp": "' || now() || '", "source": "manual"}'::jsonb
    ) INTO result;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Late checkout check initiated',
    'request_id', result
  );
END;
$$;