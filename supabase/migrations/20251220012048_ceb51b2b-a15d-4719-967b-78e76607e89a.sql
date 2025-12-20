-- Fix auto_apply_late_penalty to use end_time_utc for timezone-aware comparison
CREATE OR REPLACE FUNCTION public.auto_apply_late_penalty()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  minutes_late INTEGER;
  base_penalty NUMERIC := 20.00;
  hourly_overage NUMERIC := 0;
  platform_fee NUMERIC := 0;
  stripe_fee NUMERIC := 0;
  tax_rate NUMERIC := 0.085;
  total_overage_with_fees NUMERIC := 0;
  total_charge_amount NUMERIC := 0;
  max_charge_amount NUMERIC := 70.00;
  spot_price NUMERIC;
  spot_pricing_type TEXT;
  penalty_description TEXT;
  penalty_credit_id UUID;
  existing_penalty_count INTEGER;
  charge_result JSONB;
BEGIN
  -- Only process system completions
  IF NEW.status = 'completed' 
     AND NEW.completed_by_system = TRUE 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get spot info
    SELECT price_per_hour, pricing_type INTO spot_price, spot_pricing_type
    FROM parking_spots WHERE id = NEW.spot_id;
    
    -- Skip monthly bookings
    IF spot_pricing_type = 'monthly' THEN
      RETURN NEW;
    END IF;
    
    -- Check for existing penalty
    SELECT COUNT(*) INTO existing_penalty_count
    FROM penalty_credits WHERE booking_id = NEW.id AND credit_type = 'late_checkout';
    
    IF existing_penalty_count > 0 THEN
      RETURN NEW;
    END IF;
    
    -- SIMPLE: Calculate lateness using end_time_utc (already in correct timezone)
    -- Compare current UTC time against the booking's end_time_utc
    IF NEW.end_time_utc IS NOT NULL THEN
      minutes_late := EXTRACT(EPOCH FROM (NOW() - NEW.end_time_utc)) / 60;
    ELSE
      -- Fallback for legacy bookings without UTC time
      minutes_late := EXTRACT(EPOCH FROM (NEW.updated_at - NEW.end_time)) / 60;
    END IF;
    
    -- Only apply penalty if 3+ hours late
    IF minutes_late >= 180 THEN
      
      -- Calculate overage hours (beyond 3-hour grace)
      hourly_overage := CEILING((minutes_late - 180) / 60.0) * COALESCE(spot_price, 6.00);
      
      -- Fee calculations
      platform_fee := ROUND(hourly_overage * 0.07, 2);
      stripe_fee := ROUND((hourly_overage + base_penalty) * 0.029, 2) + 0.30;
      total_overage_with_fees := ROUND((hourly_overage + platform_fee + stripe_fee) * (1 + tax_rate), 2);
      
      -- Total capped at $70
      total_charge_amount := base_penalty + total_overage_with_fees;
      IF total_charge_amount > max_charge_amount THEN
        total_charge_amount := max_charge_amount;
      END IF;
      
      penalty_description := format('Auto-close: $%s penalty + $%s overage', base_penalty, hourly_overage);
      
      -- Create penalty credit
      INSERT INTO penalty_credits (user_id, booking_id, amount, credit_type, description, status)
      VALUES (NEW.renter_id, NEW.id, total_charge_amount, 'late_checkout', penalty_description, 'active')
      RETURNING id INTO penalty_credit_id;
      
      -- Update user profile
      UPDATE profiles 
      SET failed_checkouts = COALESCE(failed_checkouts, 0) + 1,
          total_penalty_credits = COALESCE(total_penalty_credits, 0) + total_charge_amount,
          last_violation_at = NOW()
      WHERE user_id = NEW.renter_id;
      
      RAISE NOTICE 'Penalty applied: booking %, amount $%', NEW.id, total_charge_amount;
      
      -- Call charge function
      SELECT net.http_post(
        url := 'https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/charge-penalty',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWd5d21qd2t1aHdmbmpvcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNDgxNDEsImV4cCI6MjA2OTcyNDE0MX0.EGAJKEHg4Jn9_mK8IaIo7btm_wPWC0OhN_Vwl6iw0pA"}'::jsonb,
        body := jsonb_build_object(
          'bookingId', NEW.id,
          'amount', total_charge_amount,
          'description', penalty_description,
          'penaltyCreditId', penalty_credit_id
        )
      ) INTO charge_result;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;