-- Remove UTC columns from bookings table since we're using local timezone only
-- These columns are no longer needed and are causing timezone confusion

ALTER TABLE bookings DROP COLUMN IF EXISTS start_time_utc;
ALTER TABLE bookings DROP COLUMN IF EXISTS end_time_utc;

-- Add comment to document that times are stored in local timezone
COMMENT ON COLUMN bookings.start_time IS 'Start time in local timezone (America/New_York) - format: YYYY-MM-DD HH:MM:SS';
COMMENT ON COLUMN bookings.end_time IS 'End time in local timezone (America/New_York) - format: YYYY-MM-DD HH:MM:SS';