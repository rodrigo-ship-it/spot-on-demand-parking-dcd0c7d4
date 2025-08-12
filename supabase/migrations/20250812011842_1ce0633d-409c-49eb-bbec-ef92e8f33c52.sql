-- Add Stripe Connect fields to payout_settings table
ALTER TABLE public.payout_settings 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN DEFAULT false;

-- Add marketplace fee fields to bookings table  
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_payout_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;