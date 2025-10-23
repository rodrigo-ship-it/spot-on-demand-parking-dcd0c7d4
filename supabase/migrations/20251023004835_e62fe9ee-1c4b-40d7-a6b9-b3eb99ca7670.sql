-- Remove the duplicate 10-minute cron job for check-late-checkouts
-- Keep only the hourly cron job as it's sufficient for late checkout detection
SELECT cron.unschedule('check-late-checkouts-every-10-min');