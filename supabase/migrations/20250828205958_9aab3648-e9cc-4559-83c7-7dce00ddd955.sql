-- Drop the old 3-parameter version of get_available_time_slots to resolve overloading
DROP FUNCTION IF EXISTS public.get_available_time_slots(uuid, date, integer);

-- Keep only the 4-parameter timezone-aware version
-- (The 4-parameter version already exists and is correct)