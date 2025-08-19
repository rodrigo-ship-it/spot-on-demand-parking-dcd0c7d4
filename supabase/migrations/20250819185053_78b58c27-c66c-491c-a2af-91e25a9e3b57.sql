-- Delete test bookings that don't have payment intent IDs
DELETE FROM bookings 
WHERE payment_intent_id IS NULL;