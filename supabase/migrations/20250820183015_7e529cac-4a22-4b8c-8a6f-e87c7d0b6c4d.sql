-- Clear penalty credits for testing account rodrigonavarro0678@gmail.com

-- First, delete all penalty credits for this user
DELETE FROM penalty_credits 
WHERE user_id = (
    SELECT user_id 
    FROM profiles 
    WHERE email = 'rodrigonavarro0678@gmail.com'
);

-- Reset the penalty totals in the user's profile
UPDATE profiles 
SET 
    total_penalty_credits = 0,
    failed_checkouts = 0,
    last_violation_at = NULL,
    updated_at = now()
WHERE email = 'rodrigonavarro0678@gmail.com';