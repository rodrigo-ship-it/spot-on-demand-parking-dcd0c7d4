-- Drop and recreate the trigger to ensure it's using the latest function
DROP TRIGGER IF EXISTS auto_apply_late_penalty_trigger ON bookings;

CREATE TRIGGER auto_apply_late_penalty_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION auto_apply_late_penalty();

-- Also fix the charge-penalty function to handle the correct total amount  
CREATE OR REPLACE FUNCTION public.manual_charge_penalty(penalty_credit_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  penalty_record record;
  formatted_timestamp text;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied: Admin privileges required');
  END IF;

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
          'amount', penalty_record.amount, -- This will now use the full calculated amount
          'description', penalty_record.description,
          'penaltyCreditId', penalty_record.id,
          'penaltyAmount', 20, -- Base penalty amount
          'hourlyCharges', 18  -- Hourly overage amount
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
$function$