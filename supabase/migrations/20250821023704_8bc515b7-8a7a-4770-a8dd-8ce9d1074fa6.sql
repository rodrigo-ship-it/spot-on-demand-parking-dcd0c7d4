CREATE OR REPLACE FUNCTION public.auto_apply_late_penalty()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  minutes_late INTEGER;
  base_penalty NUMERIC := 0;
  hourly_overage NUMERIC := 0;
  
  -- Fee calculations
  platform_fee_from_overage NUMERIC := 0;
  stripe_processing_fee NUMERIC := 0;
  tax_rate NUMERIC := 0.085; -- 8.5% tax
  total_overage_with_fees NUMERIC := 0;
  owner_payout_amount NUMERIC := 0;
  
  -- Final total amount to charge user
  total_charge_amount NUMERIC := 0;
  
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
      
      -- Calculate base penalty (stays with platform)
      IF is_first_offense THEN
        base_penalty := 20.00; -- First offense penalty
      ELSE
        base_penalty := 50.00; -- Repeat offense penalty
      END IF;
      
      -- Calculate hourly overage charges (only for hours past 3-hour grace period)
      IF minutes_late > 180 THEN
        hourly_overage := CEILING((minutes_late - 180) / 60.0) * COALESCE(spot_price, 6.00);
        
        -- Apply fee structure to overage (same as regular bookings)
        platform_fee_from_overage := ROUND(hourly_overage * 0.07, 2); -- 7% platform fee
        stripe_processing_fee := ROUND((hourly_overage + base_penalty) * 0.029, 2) + 0.30; -- 2.9% + $0.30
        
        -- Calculate total with taxes
        total_overage_with_fees := ROUND((hourly_overage + platform_fee_from_overage + stripe_processing_fee) * (1 + tax_rate), 2);
        
        -- Owner gets 93% of base overage amount
        owner_payout_amount := ROUND(hourly_overage * 0.93, 2);
      ELSE
        total_overage_with_fees := 0;
        owner_payout_amount := 0;
      END IF;
      
      -- Calculate TOTAL amount to charge user (penalty + overage + all fees)
      total_charge_amount := base_penalty + total_overage_with_fees;
      
      -- Create description with proper breakdown
      penalty_description := format('Auto-close: $%s penalty + $%s overage + fees/taxes (Total: $%s)', 
        base_penalty, hourly_overage, total_charge_amount);
      
      -- Create penalty credit record for TOTAL amount charged to user
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
        total_charge_amount, -- Use the total charge amount here
        'late_checkout',
        penalty_description,
        'active'
      ) RETURNING id INTO penalty_credit_id;
      
      -- Update user's failed checkout count
      UPDATE profiles 
      SET failed_checkouts = COALESCE(failed_checkouts, 0) + 1,
          total_penalty_credits = COALESCE(total_penalty_credits, 0) + total_charge_amount,
          last_violation_at = NOW()
      WHERE user_id = NEW.renter_id;
      
      -- Call charge-penalty function with TOTAL amount and proper breakdown
      SELECT net.http_post(
        url := 'https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/charge-penalty',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWd5d21qd2t1aHdmbmpvcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNDgxNDEsImV4cCI6MjA2OTcyNDE0MX0.EGAJKEHg4Jn9_mK8IaIo7btm_wPWC0OhN_Vwl6iw0pA"}'::jsonb,
        body := jsonb_build_object(
          'bookingId', NEW.id,
          'amount', total_charge_amount, -- Pass the TOTAL amount including all fees
          'description', penalty_description,
          'penaltyCreditId', penalty_credit_id,
          'penaltyAmount', base_penalty,
          'hourlyCharges', hourly_overage,
          'totalOverageWithFees', total_overage_with_fees,
          'ownerPayoutAmount', owner_payout_amount,
          'platformFee', platform_fee_from_overage,
          'processingFee', stripe_processing_fee,
          'taxRate', tax_rate
        )
      ) INTO charge_result;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;