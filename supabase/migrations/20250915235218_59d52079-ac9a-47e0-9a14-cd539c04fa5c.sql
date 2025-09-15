-- Reverse the incorrect auto-close penalty for booking bcadf960-4a49-4ac7-83e3-5c49743a619c
-- This booking was incorrectly marked as completed before it even started due to timezone issues

-- 1. Update the booking status back to active since it's currently running
UPDATE bookings 
SET status = 'active', 
    completed_by_system = false,
    updated_at = now()
WHERE id = 'bcadf960-4a49-4ac7-83e3-5c49743a619c';

-- 2. Mark the penalty credit as forgiven due to system error
UPDATE penalty_credits 
SET status = 'forgiven',
    forgiven_reason = 'System timezone error - booking was incorrectly marked as late before it started',
    updated_at = now()
WHERE booking_id = 'bcadf960-4a49-4ac7-83e3-5c49743a619c' 
AND credit_type = 'late_checkout';

-- 3. Update the user's profile to reverse the penalty impact
UPDATE profiles 
SET failed_checkouts = GREATEST(0, failed_checkouts - 1),
    total_penalty_credits = GREATEST(0, total_penalty_credits - 42.42),
    updated_at = now()
WHERE user_id = '3bcb2453-6ded-4aab-9954-1149abf00ffc';