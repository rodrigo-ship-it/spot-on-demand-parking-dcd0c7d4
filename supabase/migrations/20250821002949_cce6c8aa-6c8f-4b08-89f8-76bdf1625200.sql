-- Add column to track completion method
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_by_system BOOLEAN DEFAULT FALSE;

-- Create function to handle auto penalty charges when system completes late bookings
CREATE OR REPLACE FUNCTION auto_apply_late_penalty()
RETURNS TRIGGER AS $$
DECLARE
  minutes_late INTEGER;
  penalty_fee NUMERIC := 0;
  hourly_charge NUMERIC := 0;
  total_penalty NUMERIC := 0;
  spot_price NUMERIC;
  is_first_offense BOOLEAN;
  penalty_description TEXT;
  penalty_credit_id UUID;
  charge_result JSONB;
BEGIN
  -- Only proceed if this was a system completion and status changed to 'completed'
  IF NEW.status = 'completed' AND NEW.completed_by_system = TRUE AND OLD.status != 'completed' THEN
    
    -- Calculate how late the checkout is (in minutes)
    minutes_late := EXTRACT(EPOCH FROM (NEW.updated_at - NEW.end_time)) / 60;
    
    -- Only apply penalty if more than 3 hours late (180 minutes)
    IF minutes_late >= 180 THEN
      
      -- Get spot price and check if first offense
      SELECT price_per_hour INTO spot_price
      FROM parking_spots 
      WHERE id = NEW.spot_id;
      
      SELECT COALESCE(failed_checkouts, 0) = 0 INTO is_first_offense
      FROM profiles 
      WHERE user_id = NEW.renter_id;
      
      -- Calculate penalty amounts
      IF is_first_offense THEN
        penalty_fee := 20.00; -- First offense gets full penalty
      ELSE
        penalty_fee := 50.00; -- Repeat offenses get higher penalty
      END IF;
      
      -- Calculate hourly overage charges (only for hours past 3-hour grace period)
      IF minutes_late > 180 THEN
        hourly_charge := CEILING((minutes_late - 180) / 60.0) * COALESCE(spot_price, 6.00);
      END IF;
      
      total_penalty := penalty_fee + hourly_charge;
      
      -- Create description
      penalty_description := format('Auto-close: $%s penalty + $%s for %shr overstay', 
        penalty_fee, hourly_charge, ROUND((minutes_late / 60.0)::NUMERIC, 1));
      
      -- Create penalty credit record
      INSERT INTO penalty_credits (
        user_id, 
        booking_id, 
        amount, 
        credit_type, 
        description, 
        status
      ) VALUES (
        NEW.renter_id,
        NEW.id,
        total_penalty,
        'late_checkout',
        penalty_description,
        'active'
      ) RETURNING id INTO penalty_credit_id;
      
      -- Update user's failed checkout count
      UPDATE profiles 
      SET failed_checkouts = COALESCE(failed_checkouts, 0) + 1,
          total_penalty_credits = COALESCE(total_penalty_credits, 0) + total_penalty,
          last_violation_at = NOW()
      WHERE user_id = NEW.renter_id;
      
      -- Call charge-penalty function asynchronously
      SELECT net.http_post(
        url := 'https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/charge-penalty',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWd5d21qd2t1aHdmbmpvcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNDgxNDEsImV4cCI6MjA2OTcyNDE0MX0.EGAJKEHg4Jn9_mK8IaIo7btm_wPWC0OhN_Vwl6iw0pA"}'::jsonb,
        body := jsonb_build_object(
          'bookingId', NEW.id,
          'amount', total_penalty,
          'description', penalty_description,
          'penaltyCreditId', penalty_credit_id,
          'penaltyAmount', penalty_fee,
          'hourlyCharges', hourly_charge
        )
      ) INTO charge_result;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto penalty application
DROP TRIGGER IF EXISTS auto_penalty_on_completion ON bookings;
CREATE TRIGGER auto_penalty_on_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_apply_late_penalty();

-- Remove the old cron job since we're using triggers now
DELETE FROM cron.job WHERE jobname = 'check-late-checkouts-every-10-min';