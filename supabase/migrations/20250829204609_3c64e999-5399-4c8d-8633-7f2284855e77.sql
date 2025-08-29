-- Delete all related records first, then the bookings

-- Delete penalty credits
DELETE FROM penalty_credits 
WHERE booking_id IN (
  '6247e492-63d2-481f-9f8d-5a265016ad21',
  'c5bbe9f8-5f8e-4f0e-908a-834cbc1094d5'
);

-- Delete verification attempts
DELETE FROM verification_attempts 
WHERE booking_id IN (
  '6247e492-63d2-481f-9f8d-5a265016ad21',
  'c5bbe9f8-5f8e-4f0e-908a-834cbc1094d5'
);

-- Delete extensions
DELETE FROM extensions 
WHERE booking_id IN (
  '6247e492-63d2-481f-9f8d-5a265016ad21',
  'c5bbe9f8-5f8e-4f0e-908a-834cbc1094d5'
);

-- Delete reviews
DELETE FROM reviews 
WHERE booking_id IN (
  '6247e492-63d2-481f-9f8d-5a265016ad21',
  'c5bbe9f8-5f8e-4f0e-908a-834cbc1094d5'
);

-- Delete disputes
DELETE FROM disputes 
WHERE booking_id IN (
  '6247e492-63d2-481f-9f8d-5a265016ad21',
  'c5bbe9f8-5f8e-4f0e-908a-834cbc1094d5'
);

-- Delete messages
DELETE FROM messages 
WHERE booking_id IN (
  '6247e492-63d2-481f-9f8d-5a265016ad21',
  'c5bbe9f8-5f8e-4f0e-908a-834cbc1094d5'
);

-- Delete call sessions
DELETE FROM call_sessions 
WHERE booking_id IN (
  '6247e492-63d2-481f-9f8d-5a265016ad21',
  'c5bbe9f8-5f8e-4f0e-908a-834cbc1094d5'
);

-- Finally delete the bookings themselves
DELETE FROM bookings 
WHERE id IN (
  '6247e492-63d2-481f-9f8d-5a265016ad21',
  'c5bbe9f8-5f8e-4f0e-908a-834cbc1094d5'
);