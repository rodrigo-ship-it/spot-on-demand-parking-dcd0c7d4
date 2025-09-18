-- Remove all audit triggers that might cause INSERT operations during SELECT
DROP TRIGGER IF EXISTS audit_sensitive_table_access ON parking_spots;
DROP TRIGGER IF EXISTS audit_parking_spots_access ON parking_spots;
DROP TRIGGER IF EXISTS log_parking_spot_access ON parking_spots;

-- Also check if there are any other triggers on the parking_spots table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'parking_spots';