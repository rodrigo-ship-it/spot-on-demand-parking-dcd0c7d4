-- Update start_time and end_time columns to be timestamp without time zone
ALTER TABLE bookings 
  ALTER COLUMN start_time TYPE timestamp without time zone,
  ALTER COLUMN end_time TYPE timestamp without time zone;

-- Update existing data to remove timezone info
UPDATE bookings 
SET 
  start_time = (start_time AT TIME ZONE 'UTC')::timestamp without time zone,
  end_time = (end_time AT TIME ZONE 'UTC')::timestamp without time zone
WHERE start_time IS NOT NULL AND end_time IS NOT NULL;