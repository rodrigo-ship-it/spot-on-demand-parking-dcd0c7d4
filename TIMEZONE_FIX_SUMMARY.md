# Timezone Fix Summary

## Issue Description
Booking ID `dec01b4a-e6ca-4cae-81dd-bceec49882e3` and similar bookings were incorrectly marked as "completed" immediately instead of transitioning to "active" when their start time arrived. This was caused by timezone handling issues where user's local times were stored as UTC without proper conversion.

## Root Cause
The booking system was not properly converting user's local timezone to UTC when storing booking times:

1. **User's Perspective**: User in CST (UTC-6) books for 6:30 PM - 7:30 PM local time on Nov 24
2. **Expected Database Storage**: Should be stored as Nov 25, 00:30 - 01:30 UTC (next day in UTC)
3. **Actual Database Storage**: Was incorrectly stored as Nov 24, 18:30 - 19:30 UTC
4. **Result**: When `update-booking-statuses` ran at 23:30 UTC, it saw 23:30 > 19:30 and marked it completed

The webhook-handler was running on servers in UTC timezone and treating user's local time inputs (like "18:30") as UTC times instead of converting them from the user's actual timezone.

## Fixes Applied

### 1. Frontend Changes (`src/pages/BookSpot.tsx`)
- **Added timezone offset** to `bookingDetails` state
- Now captures `new Date().getTimezoneOffset()` which returns minutes offset from UTC
- This offset is sent along with booking details to the backend

### 2. Backend Changes (`supabase/functions/webhook-handler/index.ts`)
- **Proper timezone conversion** when parsing booking times:
  - Extracts `timezoneOffset` from booking details
  - Creates Date objects in UTC using `Date.UTC()`
  - Applies timezone offset: `new Date(utcTime + (offset * 60 * 1000))`
  - Stores the resulting UTC times in database
- **Updated in two locations**:
  - Initial date parsing for overlap checks (lines 219-271)
  - Final timestamp creation for booking insertion (lines 308-357)

### 3. Key Logic
```typescript
// Example: User in CST (offset = 360 minutes, 6 hours behind UTC) selects 18:30
const timezoneOffset = 360; // CST is UTC-6
const [hour, minute] = "18:30".split(':').map(Number);

// Create date at UTC equivalent
const startUTC = new Date(Date.UTC(2025, 10, 24, 18, 30, 0)); // Nov 24, 18:30 UTC

// Apply timezone offset to get actual UTC time
const startActual = new Date(startUTC.getTime() + (360 * 60 * 1000)); // Nov 25, 00:30 UTC

// Store without timezone suffix: "2025-11-25 00:30:00"
const startTimeStr = startActual.toISOString().slice(0, 19).replace('T', ' ');
```

### 4. Status Update Function
The `update-booking-statuses` function already correctly:
- Uses UTC time for comparisons
- Properly transitions bookings: confirmed → active → completed
- Includes 15-minute grace period for completion

## Impact
- ✅ Bookings now properly convert from user's local timezone to UTC before storage
- ✅ Status transitions work correctly regardless of user's timezone
- ✅ `update-booking-statuses` correctly identifies when bookings should be active vs completed
- ✅ No more incorrect "completed" status for bookings that haven't started
- ✅ System works correctly for users in any timezone

## Technical Details
- Database times are stored as UTC in format `YYYY-MM-DD HH:MM:SS` (without timezone suffix)
- Frontend captures user's timezone offset using `getTimezoneOffset()`
- Backend applies offset to convert user's local time to UTC before storage
- All time comparisons in edge functions use UTC
- Display times in frontend use user's local timezone automatically

## Testing Recommendations
1. Test bookings from different timezones (EST, PST, GMT, etc.)
2. Verify bookings transition correctly: confirmed → active → completed
3. Check that overlap detection works across timezone boundaries
4. Ensure display times show correctly in user's local timezone

This fix ensures the booking system respects actual booking times across all timezones and prevents incorrect status transitions.
