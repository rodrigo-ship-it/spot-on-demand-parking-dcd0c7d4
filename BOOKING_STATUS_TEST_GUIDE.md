# Booking Status Transition Testing Guide

## Current Server Time
The Supabase server is running in **UTC timezone**.

Current time: `2025-11-24 23:39 UTC`

## How Status Transitions Work

The `update-booking-statuses` function runs periodically and:

1. **Confirmed → Active**: When `start_time <= NOW()` AND `end_time > NOW()`
2. **Active → Completed**: When `end_time + 15 minutes < NOW()` (15-minute grace period)

## Testing Instructions

### Test 1: Quick Transition Test (Recommended)

**Goal**: See a booking go from confirmed → active → completed in ~17 minutes

1. **Create a booking** with these times:
   - **Current server time**: 23:39 UTC
   - **Start time**: Set to current time + 2 minutes (e.g., `23:41`)
   - **End time**: Set to start + 1 hour (e.g., `00:41`)
   
2. **Expected behavior**:
   - **Immediately**: Booking status = `confirmed`
   - **At 23:41**: Status changes to `active` (when update-booking-statuses runs)
   - **At 00:56** (00:41 + 15 min grace): Status changes to `completed`

### Test 2: Verify Stored Times

After creating a booking, check the database:

```sql
SELECT 
  id,
  start_time,
  end_time,
  status,
  created_at,
  completed_by_system
FROM bookings
WHERE id = 'your-booking-id'
```

**Expected**: Times should be stored exactly as you entered them, no UTC conversion:
- If you selected "11:30 PM", database shows `23:30:00`
- If you selected "6:30 AM", database shows `06:30:00`

### Test 3: Manual Status Update Trigger

You can manually trigger the status update function to test immediately:

```bash
curl -X POST 'https://qwqgywmjwkuhwfnjoqgv.supabase.co/functions/v1/update-booking-statuses' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

### Test 4: Check Logs

View the update-booking-statuses logs to see what's happening:
1. Go to Supabase Dashboard → Edge Functions → update-booking-statuses → Logs
2. Look for log entries showing:
   - "Found confirmed bookings to activate"
   - "Booking activated"
   - "Found active bookings to complete"
   - "Booking completed naturally"

## Common Issues to Watch For

### ❌ Booking Immediately Completed
**Symptom**: Booking goes straight to `completed` status
**Cause**: Start/end times are in the past
**Solution**: Ensure you're selecting a future time

### ❌ Booking Never Becomes Active
**Symptom**: Stays in `confirmed` even after start time
**Cause**: `update-booking-statuses` function not running
**Solution**: Manually trigger it or wait for next scheduled run

### ❌ Times Look Wrong in Database
**Symptom**: Database shows different times than you selected
**Cause**: Old code with UTC conversion still deployed
**Solution**: Ensure latest code is deployed

## Example Test Scenario

**Scenario**: Book a spot for 1 hour starting 5 minutes from now

1. Note current time: `23:39`
2. Create booking:
   - Date: Today
   - Start time: `23:44` (5 minutes from now)
   - End time: `00:44` (1 hour duration)
3. Check immediately:
   ```sql
   SELECT * FROM bookings ORDER BY created_at DESC LIMIT 1
   ```
   Should show:
   - `status: 'confirmed'`
   - `start_time: '2025-11-24 23:44:00'`
   - `end_time: '2025-11-25 00:44:00'`

4. Wait 5 minutes, then check again:
   ```sql
   SELECT * FROM bookings WHERE id = 'booking-id'
   ```
   Should now show:
   - `status: 'active'`

5. Wait until 00:59 (end_time + 15 min), check final status:
   Should show:
   - `status: 'completed'`
   - `completed_by_system: false` (natural completion)

## Automated Status Updates

The `update-booking-statuses` function should be scheduled to run every 5-10 minutes. If it's not running automatically, you'll need to:

1. Set up a cron job trigger
2. Or manually invoke it during testing
3. Or use Supabase scheduled functions

## Success Criteria

✅ Times stored exactly as entered (no timezone offset)
✅ Booking becomes `active` when start time arrives
✅ Booking becomes `completed` 15 minutes after end time
✅ `completed_by_system: false` for normal completions
✅ Status transitions visible in logs
