-- Create messages table for in-app chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create call sessions table for phone masking
CREATE TABLE public.call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  caller_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  twilio_session_id TEXT,
  proxy_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'ended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  ended_at TIMESTAMPTZ
);

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on call_sessions table  
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view messages for their bookings" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id OR
  auth.uid() IN (
    SELECT bookings.renter_id FROM bookings WHERE bookings.id = messages.booking_id
    UNION
    SELECT parking_spots.owner_id FROM parking_spots 
    JOIN bookings ON bookings.spot_id = parking_spots.id 
    WHERE bookings.id = messages.booking_id
  )
);

CREATE POLICY "Users can create messages for their bookings" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IN (
    SELECT bookings.renter_id FROM bookings WHERE bookings.id = messages.booking_id
    UNION
    SELECT parking_spots.owner_id FROM parking_spots 
    JOIN bookings ON bookings.spot_id = parking_spots.id 
    WHERE bookings.id = messages.booking_id
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- RLS policies for call_sessions
CREATE POLICY "Users can view call sessions for their bookings" 
ON public.call_sessions 
FOR SELECT 
USING (
  auth.uid() = caller_id OR 
  auth.uid() = recipient_id OR
  auth.uid() IN (
    SELECT bookings.renter_id FROM bookings WHERE bookings.id = call_sessions.booking_id
    UNION
    SELECT parking_spots.owner_id FROM parking_spots 
    JOIN bookings ON bookings.spot_id = parking_spots.id 
    WHERE bookings.id = call_sessions.booking_id
  )
);

CREATE POLICY "Users can create call sessions for their bookings" 
ON public.call_sessions 
FOR INSERT 
WITH CHECK (
  auth.uid() = caller_id AND
  auth.uid() IN (
    SELECT bookings.renter_id FROM bookings WHERE bookings.id = call_sessions.booking_id
    UNION
    SELECT parking_spots.owner_id FROM parking_spots 
    JOIN bookings ON bookings.spot_id = parking_spots.id 
    WHERE bookings.id = call_sessions.booking_id
  )
);

-- Add foreign key references
ALTER TABLE public.messages ADD CONSTRAINT fk_messages_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.call_sessions ADD CONSTRAINT fk_call_sessions_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_call_sessions_booking_id ON public.call_sessions(booking_id);
CREATE INDEX idx_call_sessions_status ON public.call_sessions(status);

-- Enable realtime for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create function to update message read status
CREATE OR REPLACE FUNCTION public.mark_message_as_read(message_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE messages 
  SET read_at = now() 
  WHERE id = message_id 
    AND recipient_id = auth.uid()
    AND read_at IS NULL;
END;
$$;

-- Create function to get unread message count
CREATE OR REPLACE FUNCTION public.get_unread_message_count(booking_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM messages
  WHERE booking_id = booking_id_param
    AND recipient_id = auth.uid()
    AND read_at IS NULL;
    
  RETURN COALESCE(unread_count, 0);
END;
$$;