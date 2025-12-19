import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔧 [BACKFILL] Starting timezone backfill for existing spots...')

    // Create Supabase client with service role key
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    )

    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    
    if (!googleApiKey) {
      console.error('❌ [BACKFILL] Google API key not found')
      return new Response(
        JSON.stringify({ error: 'Google API key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Get all spots without timezone that have coordinates
    const { data: spots, error: fetchError } = await supabaseService
      .from('parking_spots')
      .select('id, latitude, longitude, address')
      .is('timezone', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (fetchError) {
      console.error('❌ [BACKFILL] Error fetching spots:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch spots', details: fetchError }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log(`📊 [BACKFILL] Found ${spots?.length || 0} spots to update`)

    if (!spots || spots.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No spots need timezone updates',
          updated: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    let updated = 0
    let failed = 0
    const results: Array<{ spotId: string; timezone: string | null; error?: string }> = []

    // Process each spot
    for (const spot of spots) {
      try {
        console.log(`🌍 [BACKFILL] Processing spot ${spot.id}: ${spot.address}`)
        
        // Call Google Timezone API
        const timestamp = Math.floor(Date.now() / 1000)
        const timezoneUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${spot.latitude},${spot.longitude}&timestamp=${timestamp}&key=${googleApiKey}`
        
        const timezoneResponse = await fetch(timezoneUrl)
        const timezoneData = await timezoneResponse.json()
        
        let timezone: string

        if (timezoneData.status === 'OK') {
          timezone = timezoneData.timeZoneId
          console.log(`✅ [BACKFILL] Got timezone for spot ${spot.id}: ${timezone}`)
        } else {
          // Use fallback based on longitude
          timezone = getFallbackTimezone(Number(spot.longitude))
          console.log(`⚠️ [BACKFILL] Using fallback timezone for spot ${spot.id}: ${timezone}`)
        }

        // Update the spot with timezone
        const { error: updateError } = await supabaseService
          .from('parking_spots')
          .update({ timezone })
          .eq('id', spot.id)

        if (updateError) {
          console.error(`❌ [BACKFILL] Error updating spot ${spot.id}:`, updateError)
          failed++
          results.push({ spotId: spot.id, timezone: null, error: updateError.message })
        } else {
          updated++
          results.push({ spotId: spot.id, timezone })
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ [BACKFILL] Error processing spot ${spot.id}:`, error)
        failed++
        results.push({ spotId: spot.id, timezone: null, error: error.message })
      }
    }

    console.log(`🏁 [BACKFILL] Completed: ${updated} updated, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Timezone backfill completed`,
        total: spots.length,
        updated,
        failed,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ [BACKFILL] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Fallback timezone estimation based on longitude
function getFallbackTimezone(longitude: number): string {
  if (longitude >= -67.5 && longitude < -52.5) return 'America/Halifax'
  if (longitude >= -82.5 && longitude < -67.5) return 'America/New_York'
  if (longitude >= -97.5 && longitude < -82.5) return 'America/Chicago'
  if (longitude >= -112.5 && longitude < -97.5) return 'America/Denver'
  if (longitude >= -127.5 && longitude < -112.5) return 'America/Los_Angeles'
  if (longitude >= -142.5 && longitude < -127.5) return 'America/Anchorage'
  if (longitude >= -157.5 && longitude < -142.5) return 'Pacific/Honolulu'
  return 'America/New_York'
}
