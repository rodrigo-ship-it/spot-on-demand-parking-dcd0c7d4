-- Recreate the trigger since it doesn't exist
CREATE TRIGGER auto_apply_late_penalty_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION auto_apply_late_penalty();

-- Also check if there are any scheduled jobs that might be creating penalties
SELECT cron.schedule('check-late-checkouts', '*/5 * * * *', 
  $$SELECT net.http_post(
    url := 'https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/check-late-checkouts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWd5d21qd2t1aHdmbmpvcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNDgxNDEsImV4cCI6MjA2OTcyNDE0MX0.EGAJKEHg4Jn9_mK8IaIo7btm_wPWC0OhN_Vwl6iw0pA"}'::jsonb,
    body := jsonb_build_object('timestamp', now()::text, 'source', 'cron')
  )$$
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-late-checkouts'
);