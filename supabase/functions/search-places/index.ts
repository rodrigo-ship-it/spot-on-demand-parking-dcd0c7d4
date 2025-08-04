import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, userLocation } = await req.json()
    
    if (!query || query.length < 1) {
      return new Response(
        JSON.stringify({ places: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Get Google Places API key from secrets
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    
    if (!googleApiKey) {
      console.error('Google Places API key not found in secrets')
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Use Google Places Autocomplete API
    const location = userLocation ? `${userLocation.lat},${userLocation.lng}` : '40.7128,-74.0060'
    const radius = 50000 // 50km radius
    
    const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&location=${location}&radius=${radius}&key=${googleApiKey}`
    
    const placesResponse = await fetch(placesUrl)
    const placesData = await placesResponse.json()
    
    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', placesData)
      return new Response(
        JSON.stringify({ error: 'Places API error', details: placesData }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Get detailed information for each place
    const detailedPlaces = await Promise.all(
      (placesData.predictions || []).slice(0, 8).map(async (prediction: any) => {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=name,formatted_address,geometry,types,rating,user_ratings_total&key=${googleApiKey}`
          
          const detailsResponse = await fetch(detailsUrl)
          const detailsData = await detailsResponse.json()
          
          if (detailsData.status === 'OK' && detailsData.result) {
            const place = detailsData.result
            
            // Calculate distance if user location is provided
            let distance = ''
            if (userLocation && place.geometry?.location) {
              const distanceInMiles = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                place.geometry.location.lat,
                place.geometry.location.lng
              )
              distance = `${distanceInMiles} mi`
            }
            
            return {
              id: prediction.place_id,
              name: place.name || prediction.structured_formatting?.main_text || '',
              description: place.formatted_address || prediction.description || '',
              latitude: place.geometry?.location?.lat || 0,
              longitude: place.geometry?.location?.lng || 0,
              distance: distance,
              rating: place.rating || null,
              types: place.types || [],
              user_ratings_total: place.user_ratings_total || null
            }
          }
          
          return null
        } catch (error) {
          console.error('Error fetching place details:', error)
          return null
        }
      })
    )

    // Filter out null results
    const validPlaces = detailedPlaces.filter(place => place !== null)

    return new Response(
      JSON.stringify({ places: validPlaces }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 3959 // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const d = R * c // Distance in miles
  return d.toFixed(1)
}