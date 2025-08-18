-- Add user trust and verification tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  trust_score integer DEFAULT 100,
  successful_checkouts integer DEFAULT 0,
  failed_checkouts integer DEFAULT 0,
  total_penalty_credits numeric DEFAULT 0,
  last_violation_at timestamp with time zone DEFAULT NULL;

-- Add verification details to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS 
  checkout_verification_method text DEFAULT NULL,
  checkout_location_verified boolean DEFAULT false,
  checkout_photo_verified boolean DEFAULT false,
  checkout_timestamp_verified boolean DEFAULT false,
  verification_score integer DEFAULT NULL;

-- Create penalty credits table
CREATE TABLE IF NOT EXISTS penalty_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES bookings(id),
  amount numeric NOT NULL DEFAULT 0,
  credit_type text NOT NULL DEFAULT 'late_checkout',
  description text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  forgiven_reason text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '90 days')
);

-- Create verification attempts table
CREATE TABLE IF NOT EXISTS verification_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES bookings(id),
  user_id uuid NOT NULL,
  attempt_type text NOT NULL,
  verification_data jsonb DEFAULT '{}',
  success boolean DEFAULT false,
  failure_reason text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE penalty_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for penalty_credits
CREATE POLICY "Users can view their own penalty credits" 
ON penalty_credits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create penalty credits" 
ON penalty_credits FOR INSERT 
WITH CHECK (true);

-- RLS policies for verification_attempts  
CREATE POLICY "Users can view their own verification attempts" 
ON verification_attempts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create verification attempts" 
ON verification_attempts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_penalty_credits_updated_at
BEFORE UPDATE ON penalty_credits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_penalty_credits_user_id ON penalty_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_penalty_credits_status ON penalty_credits(status);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_booking_id ON verification_attempts(booking_id);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_user_id ON verification_attempts(user_id);