-- Test penalty with your actual booking
INSERT INTO public.penalty_credits (
  user_id,
  booking_id,
  amount,
  credit_type,
  description,
  status
) VALUES (
  '3bcb2453-6ded-4aab-9954-1149abf00ffc',
  'c2f2236c-2c34-47a9-aeb3-1d50728162dc',
  21.00,
  'late_checkout',
  'Test penalty: $12.00 fine + $9.00 for 1h 30m extra time',
  'active'
) RETURNING id;