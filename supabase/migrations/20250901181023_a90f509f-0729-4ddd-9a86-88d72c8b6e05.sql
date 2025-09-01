-- Fix premium subscription for user who completed payment but webhook failed
INSERT INTO premium_subscriptions (
  user_id, 
  status, 
  current_period_start, 
  current_period_end, 
  stripe_customer_id, 
  stripe_subscription_id,
  created_at,
  updated_at
) VALUES (
  '2df2cc93-59c0-4484-9c32-d889b9a4b395', 
  'active', 
  '2025-09-01 18:07:27+00', 
  '2025-10-01 18:07:27+00', 
  'cus_SsHkwy7RtrjxZf', 
  'sub_1S2c8U8FwwT7qkz7jGyx9kbn',
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
  updated_at = now();