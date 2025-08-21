-- Test the corrected charge-penalty function with full amount and payout distribution
SELECT 
  net.http_post(
    url := 'https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/charge-penalty',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWd5d21qd2t1aHdmbmpvcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNDgxNDEsImV4cCI6MjA2OTcyNDE0MX0.EGAJKEHg4Jn9_mK8IaIo7btm_wPWC0OhN_Vwl6iw0pA"}'::jsonb,
    body := jsonb_build_object(
      'bookingId', 'f541fe99-71a3-4349-97f1-88817cdaaddd',
      'amount', 38,
      'description', 'Auto-close: $20 penalty + $18 for 3hr overstay',
      'penaltyCreditId', '8c6a4667-d42c-405e-b0ae-33f8feba77d9'
    )
  ) as charge_result;