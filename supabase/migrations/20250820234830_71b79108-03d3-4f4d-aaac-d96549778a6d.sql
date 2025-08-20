-- Clear all pending late fees for rodrigonavarro0678@gmail.com
UPDATE penalty_credits 
SET status = 'forgiven', 
    forgiven_reason = 'Administrative forgiveness - pending charges cleared by support',
    updated_at = now()
WHERE user_id = '3bcb2453-6ded-4aab-9954-1149abf00ffc' 
  AND status = 'active';