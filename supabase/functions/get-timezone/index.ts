import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { latitude, longitude } = await req.json()

    if (latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log(`📍 [GET-TIMEZONE] Getting timezone for coordinates: ${latitude}, ${longitude}`)

    // Get Google API key (reuse the Places API key since Timezone API uses the same key)
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    
    if (!googleApiKey) {
      console.error('❌ [GET-TIMEZONE] Google API key not found')
      return new Response(
        JSON.stringify({ error: 'Google API key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Use Google Timezone API
    // timestamp is required - use current time
    const timestamp = Math.floor(Date.now() / 1000)
    const timezoneUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${latitude},${longitude}&timestamp=${timestamp}&key=${googleApiKey}`
    
    console.log(`🌍 [GET-TIMEZONE] Calling Google Timezone API...`)
    
    const timezoneResponse = await fetch(timezoneUrl)
    const timezoneData = await timezoneResponse.json()
    
    console.log(`📊 [GET-TIMEZONE] API Response:`, timezoneData)

    if (timezoneData.status !== 'OK') {
      console.error('❌ [GET-TIMEZONE] Google Timezone API error:', timezoneData)
      return new Response(
        JSON.stringify({ 
          error: 'Timezone API error', 
          details: timezoneData,
          // Provide a reasonable fallback based on longitude
          fallbackTimezone: getFallbackTimezone(longitude)
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Return 200 with fallback
        }
      )
    }

    console.log(`✅ [GET-TIMEZONE] Timezone detected: ${timezoneData.timeZoneId}`)

    return new Response(
      JSON.stringify({
        timezone: timezoneData.timeZoneId,
        timezoneName: timezoneData.timeZoneName,
        rawOffset: timezoneData.rawOffset,
        dstOffset: timezoneData.dstOffset
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ [GET-TIMEZONE] Error:', error)
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
  // Rough timezone estimation based on longitude
  // Each 15 degrees of longitude = 1 hour
  if (longitude >= -67.5 && longitude < -52.5) return 'America/Halifax' // AST
  if (longitude >= -82.5 && longitude < -67.5) return 'America/New_York' // EST
  if (longitude >= -97.5 && longitude < -82.5) return 'America/Chicago' // CST
  if (longitude >= -112.5 && longitude < -97.5) return 'America/Denver' // MST
  if (longitude >= -127.5 && longitude < -112.5) return 'America/Los_Angeles' // PST
  if (longitude >= -142.5 && longitude < -127.5) return 'America/Anchorage' // AKST
  if (longitude >= -157.5 && longitude < -142.5) return 'Pacific/Honolulu' // HST
  
  // For other regions, default to America/New_York
  return 'America/New_York'
}
