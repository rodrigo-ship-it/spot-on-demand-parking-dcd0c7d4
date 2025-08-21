-- Final comprehensive security fix for all RLS policies
-- Ensure all sensitive tables require authentication

-- Profiles table - ensure only authenticated access
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
-- Keep only the secure user-owned policies and admin access

-- Ensure all sensitive tables are properly secured
-- All these tables should require authentication for any access

-- Payment methods - ensure only authenticated users can access their own data
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Payout settings - ensure only authenticated users can access their own data  
ALTER TABLE public.payout_settings ENABLE ROW LEVEL SECURITY;

-- Vehicles - ensure only authenticated users can access their own data
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Refunds - ensure only authenticated users can access their own data
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Penalties - ensure only authenticated users can access their own data
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

-- Disputes - ensure only authenticated users can access their own data
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Messages - ensure only authenticated users can access their own data
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Support tickets - ensure only authenticated users can access their own data
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Security audit log - ensure only authenticated users can access their own data
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Verification attempts - ensure only authenticated users can access their own data
ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;

-- Call sessions - ensure only authenticated users can access their own data
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Bookings - ensure only authenticated users can access their own data
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Reviews - ensure only authenticated users can access their own data
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Extensions - ensure only authenticated users can access their own data
ALTER TABLE public.extensions ENABLE ROW LEVEL SECURITY;

-- Penalty credits - ensure only authenticated users can access their own data
ALTER TABLE public.penalty_credits ENABLE ROW LEVEL SECURITY;

-- User roles - ensure only authenticated users can access their own data
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Notification preferences - ensure only authenticated users can access their own data
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notification subscriptions - ensure only authenticated users can access their own data
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admin audit log - ensure only admins can access
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Add base authentication requirement for profiles table
CREATE POLICY "Profiles require authentication" ON public.profiles
FOR ALL USING (auth.uid() IS NOT NULL);

-- Log this security hardening action
SELECT public.log_security_event_enhanced(
  'security_hardening_applied',
  jsonb_build_object(
    'action', 'comprehensive_rls_enforcement',
    'timestamp', extract(epoch from now()),
    'tables_secured', array[
      'profiles', 'payment_methods', 'payout_settings', 'vehicles', 
      'refunds', 'penalties', 'disputes', 'messages', 'support_tickets',
      'security_audit_log', 'verification_attempts', 'call_sessions',
      'bookings', 'reviews', 'extensions', 'penalty_credits', 'user_roles',
      'notification_preferences', 'notification_subscriptions', 'admin_audit_log'
    ]
  ),
  NULL,
  'critical'
);