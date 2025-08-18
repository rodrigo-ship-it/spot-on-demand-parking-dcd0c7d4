-- Add columns to store the exact display values the user sees
ALTER TABLE public.bookings 
ADD COLUMN display_date TEXT,
ADD COLUMN display_start_time TEXT, 
ADD COLUMN display_end_time TEXT,
ADD COLUMN display_duration_text TEXT;