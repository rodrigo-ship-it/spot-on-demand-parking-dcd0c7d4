import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting checkout photo cleanup...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    console.log(`📅 Looking for bookings that ended before: ${twentyFourHoursAgo.toISOString()}`);

    // Find bookings with checkout photos that ended more than 24 hours ago
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, checkout_photo_url, end_time')
      .not('checkout_photo_url', 'is', null)
      .lt('end_time', twentyFourHoursAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching expired bookings:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Found ${expiredBookings?.length || 0} bookings with photos to clean up`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const booking of expiredBookings || []) {
      try {
        // Extract the file path from the URL
        const photoUrl = booking.checkout_photo_url;
        
        // The path should be like: checkout-photos/{bookingId}.jpg
        // Extract just the path part we need
        let filePath = photoUrl;
        
        // If it's a full URL, extract the path
        if (photoUrl.includes('/parking-images/')) {
          filePath = photoUrl.split('/parking-images/')[1];
        }

        console.log(`🗑️ Deleting photo for booking ${booking.id}: ${filePath}`);

        // Delete the file from storage
        const { error: deleteStorageError } = await supabase.storage
          .from('parking-images')
          .remove([filePath]);

        if (deleteStorageError) {
          console.error(`Failed to delete storage file for booking ${booking.id}:`, deleteStorageError);
          // Continue anyway to clear the URL
        }

        // Clear the checkout_photo_url in the booking
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ checkout_photo_url: null })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`Failed to update booking ${booking.id}:`, updateError);
          errorCount++;
        } else {
          deletedCount++;
          console.log(`✅ Cleaned up photo for booking ${booking.id}`);
        }

      } catch (bookingError) {
        console.error(`Error processing booking ${booking.id}:`, bookingError);
        errorCount++;
      }
    }

    const summary = {
      success: true,
      totalProcessed: expiredBookings?.length || 0,
      deleted: deletedCount,
      errors: errorCount,
      timestamp: new Date().toISOString()
    };

    console.log('🏁 Cleanup complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Cleanup function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Cleanup failed',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
