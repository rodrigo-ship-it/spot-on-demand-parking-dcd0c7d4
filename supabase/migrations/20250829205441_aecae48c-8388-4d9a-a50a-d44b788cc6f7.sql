-- Add missing columns to extensions table for complete workflow
ALTER TABLE extensions 
ADD COLUMN stripe_session_id TEXT,
ADD COLUMN new_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN stripe_payment_intent_id TEXT;