-- Create notification_subscriptions table
CREATE TABLE public.notification_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  booking_updates BOOLEAN NOT NULL DEFAULT true,
  payment_alerts BOOLEAN NOT NULL DEFAULT true,
  promotions BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security_audit_log table
CREATE TABLE public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_subscriptions
CREATE POLICY "Users can manage their own subscriptions" 
ON public.notification_subscriptions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for notification_preferences
CREATE POLICY "Users can manage their own preferences" 
ON public.notification_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for security_audit_log (admin only read)
CREATE POLICY "Users can view their own security logs" 
ON public.security_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_notification_subscriptions_user_id ON public.notification_subscriptions(user_id);
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log(created_at);

-- Create triggers for updated_at columns
CREATE TRIGGER update_notification_subscriptions_updated_at
  BEFORE UPDATE ON public.notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for logging security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_data,
    inet(current_setting('request.headers', true)::json->>'cf-connecting-ip'),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;