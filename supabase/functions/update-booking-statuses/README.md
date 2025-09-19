# Update Booking Statuses Function

## Purpose
This function handles proper booking status transitions to fix timezone-related issues where bookings were incorrectly marked as completed instead of becoming active.

## Status Transitions
1. **confirmed → active**: When booking start time arrives
2. **active → completed**: When booking end time passes (with 15-minute grace period)

## Key Fixes
- Uses consistent timezone handling without complex offset calculations
- Prevents bookings from being marked as completed before they've even started
- Adds proper grace period for natural completion
- Separates normal completion from penalty-based auto-closure

## Usage
This function should be called regularly (every 5-10 minutes) to ensure timely status updates.

```bash
# Manual invocation
curl -X POST https://your-project.supabase.co/functions/v1/update-booking-statuses
```

## Related Functions
- `check-late-checkouts`: Handles penalty charges for bookings 3+ hours overdue
- `process-auto-extension`: Handles automatic booking extensions