-- Analytics optimization views and tables
CREATE MATERIALIZED VIEW daily_analytics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_bookings,
  SUM(total_amount) as total_revenue,
  COUNT(DISTINCT renter_id) as unique_renters,
  COUNT(DISTINCT spot_id) as spots_used,
  AVG(total_amount) as avg_booking_value
FROM bookings 
WHERE status IN ('confirmed', 'completed')
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Owner performance view
CREATE MATERIALIZED VIEW owner_analytics AS
SELECT 
  ps.owner_id,
  ps.id as spot_id,
  ps.title,
  ps.address,
  COUNT(b.id) as total_bookings,
  SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_amount ELSE 0 END) as total_earnings,
  AVG(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_amount ELSE NULL END) as avg_booking_value,
  COUNT(CASE WHEN b.created_at >= date_trunc('month', now()) THEN 1 END) as current_month_bookings,
  SUM(CASE WHEN b.created_at >= date_trunc('month', now()) AND b.status IN ('confirmed', 'completed') THEN b.total_amount ELSE 0 END) as current_month_earnings,
  COUNT(CASE WHEN b.created_at >= date_trunc('month', now() - interval '1 month') AND b.created_at < date_trunc('month', now()) THEN 1 END) as last_month_bookings,
  SUM(CASE WHEN b.created_at >= date_trunc('month', now() - interval '1 month') AND b.created_at < date_trunc('month', now()) AND b.status IN ('confirmed', 'completed') THEN b.total_amount ELSE 0 END) as last_month_earnings
FROM parking_spots ps
LEFT JOIN bookings b ON ps.id = b.spot_id
GROUP BY ps.owner_id, ps.id, ps.title, ps.address;

-- Help desk tickets table
CREATE TABLE support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  ticket_number TEXT UNIQUE NOT NULL DEFAULT 'TKT-' || extract(epoch from now())::bigint,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assignee_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- FAQ table for dynamic help center
CREATE TABLE help_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  keywords TEXT[],
  views INTEGER DEFAULT 0,
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dispute resolution workflow enhancement
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS assignee_id UUID;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS auto_resolved BOOLEAN DEFAULT false;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Analytics indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_created_at_status ON bookings(created_at, status);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_analytics ON bookings(spot_id, created_at, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category, is_published);

-- RLS Policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- Support tickets policies
CREATE POLICY "Users can create their own support tickets" 
ON support_tickets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own support tickets" 
ON support_tickets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own support tickets" 
ON support_tickets FOR UPDATE 
USING (auth.uid() = user_id);

-- Help articles policies
CREATE POLICY "Anyone can view published help articles" 
ON help_articles FOR SELECT 
USING (is_published = true);

-- Functions for refresh analytics
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW daily_analytics;
  REFRESH MATERIALIZED VIEW owner_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-resolve simple disputes
CREATE OR REPLACE FUNCTION auto_resolve_disputes()
RETURNS void AS $$
BEGIN
  -- Auto-approve photo disputes with clear evidence after 48 hours
  UPDATE disputes 
  SET status = 'resolved',
      resolution = 'Auto-resolved: Photo evidence reviewed',
      auto_resolved = true,
      updated_at = now()
  WHERE status = 'pending' 
    AND dispute_type = 'damage_claim'
    AND photo_url IS NOT NULL
    AND created_at < now() - interval '48 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for support ticket updates
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_timestamp();

-- Insert sample help articles
INSERT INTO help_articles (title, content, category, keywords) VALUES
('How to Book a Parking Spot', 'To book a parking spot: 1. Browse available spots on the homepage 2. Select your preferred time 3. Complete payment 4. Receive QR code for access', 'booking', ARRAY['book', 'reserve', 'payment', 'spot']),
('Cancellation Policy', 'Our cancellation policy: 24+ hours: 100% refund, 3-24 hours: 90% refund (10% fee, max $5), Less than 3 hours: No refund', 'booking', ARRAY['cancel', 'refund', 'policy']),
('How to List Your Parking Spot', 'To list your parking spot: 1. Click "List Your Spot" 2. Fill out details 3. Upload photos 4. Set pricing 5. Activate listing', 'listing', ARRAY['list', 'owner', 'spot', 'create']),
('Payment Issues', 'If you experience payment issues: 1. Check your payment method 2. Ensure sufficient funds 3. Contact support if problems persist', 'payment', ARRAY['payment', 'issue', 'card', 'billing']),
('Using QR Codes', 'QR codes provide instant access to your parking spot. Show the code to renters or print it for physical posting.', 'owner', ARRAY['qr', 'code', 'access', 'owner']);