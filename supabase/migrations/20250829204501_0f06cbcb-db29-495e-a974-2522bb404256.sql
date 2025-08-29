-- First delete any penalty credits that reference these bookings
DELETE FROM penalty_credits 
WHERE booking_id IN (
  '6247e492-63d2-481f-9f8d-5a265016ad21',
  'c5bbe9f8-5f8e-4f0e-908a-834cbc1094d5'
);

-- Then delete the bookings themselves
DELETE FROM bookings 
WHERE id IN (
  '6247e492-63d2-481f-9f8d-5a265016ad21',
  'c5bbe9f8-5f8e-4f0e-908a-834cbc1094d5'
);