-- Create reviews table for rating system
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('renter', 'lister')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create disputes table for dispute resolution
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('overstay', 'occupied', 'damage', 'other')),
  photo_url TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create penalties table for penalty system
CREATE TABLE public.penalties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  penalty_type TEXT NOT NULL CHECK (penalty_type IN ('late_checkout', 'no_show', 'overstay', 'violation')),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create extensions table for booking extensions
CREATE TABLE public.extensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  requested_hours INTEGER NOT NULL CHECK (requested_hours > 0),
  rate_per_hour NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extensions ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
CREATE POLICY "Users can view reviews they're involved in" 
ON public.reviews 
FOR SELECT 
USING (auth.uid() = reviewer_id OR auth.uid() = reviewed_id);

CREATE POLICY "Users can create reviews for their bookings" 
ON public.reviews 
FOR INSERT 
WITH CHECK (auth.uid() = reviewer_id);

-- RLS policies for disputes
CREATE POLICY "Users can view their own disputes" 
ON public.disputes 
FOR SELECT 
USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create disputes for their bookings" 
ON public.disputes 
FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

-- RLS policies for penalties
CREATE POLICY "Users can view their own penalties" 
ON public.penalties 
FOR SELECT 
USING (auth.uid() = user_id);

-- RLS policies for extensions
CREATE POLICY "Users can view extensions for their bookings" 
ON public.extensions 
FOR SELECT 
USING (auth.uid() IN (
  SELECT renter_id FROM bookings WHERE id = booking_id
  UNION
  SELECT owner_id FROM parking_spots WHERE id = (
    SELECT spot_id FROM bookings WHERE id = booking_id
  )
));

CREATE POLICY "Users can create extensions for their bookings" 
ON public.extensions 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT renter_id FROM bookings WHERE id = booking_id
));

-- Create triggers for updated_at columns
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_penalties_updated_at
BEFORE UPDATE ON public.penalties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extensions_updated_at
BEFORE UPDATE ON public.extensions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();