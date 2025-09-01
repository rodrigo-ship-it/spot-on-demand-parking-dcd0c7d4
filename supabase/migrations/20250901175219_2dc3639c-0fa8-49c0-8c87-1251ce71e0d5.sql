-- Create premium subscriptions table
CREATE TABLE public.premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own subscription" 
ON public.premium_subscriptions
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription" 
ON public.premium_subscriptions
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update subscriptions" 
ON public.premium_subscriptions
FOR UPDATE 
USING (true);

-- Add premium status helper function
CREATE OR REPLACE FUNCTION public.is_premium_lister(lister_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM premium_subscriptions 
    WHERE user_id = lister_user_id 
    AND status = 'active' 
    AND current_period_end > now()
  );
$$;

-- Add updated_at trigger
CREATE TRIGGER update_premium_subscriptions_updated_at
  BEFORE UPDATE ON public.premium_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();