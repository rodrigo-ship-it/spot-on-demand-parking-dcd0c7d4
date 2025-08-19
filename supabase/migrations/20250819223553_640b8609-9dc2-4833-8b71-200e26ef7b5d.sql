-- Fix the manual function to properly format JSON
CREATE OR REPLACE FUNCTION public.manual_check_late_checkouts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  current_timestamp text;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied: Admin privileges required');
  END IF;

  -- Format timestamp properly for JSON
  current_timestamp := to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  -- Call the edge function to check for late checkouts
  SELECT
    net.http_post(
        url:='https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/check-late-checkouts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWd5d21qd2t1aHdmbmpvcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NTk3MDcsImV4cCI6MjA1NDAzNTcwN30.N-yGLEfyKWxNMH6P-mQl4_bm5sL-8SIlfqTDJCb7lQs"}'::jsonb,
        body:=jsonb_build_object('timestamp', current_timestamp, 'source', 'manual')
    ) INTO result;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Late checkout check initiated',
    'request_id', result
  );
END;
$$;