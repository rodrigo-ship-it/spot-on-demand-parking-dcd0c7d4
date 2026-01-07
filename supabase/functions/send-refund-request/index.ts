import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundRequestBody {
  booking_id: string;
  user_email: string;
  refund_amount: number;
  reason: string;
  description: string;
  cancellation_fee: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== MANUAL REFUND REQUEST EMAIL ===");

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    // Create Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    console.log("User authenticated:", user.id, user.email);

    const {
      booking_id,
      user_email,
      refund_amount,
      reason,
      description,
      cancellation_fee
    }: RefundRequestBody = await req.json();

    console.log("Refund request data:", {
      booking_id,
      user_email,
      refund_amount,
      reason,
      description,
      cancellation_fee
    });

    // Create Supabase client with service role for data fetching
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .select(`
        *,
        parking_spots (
          title,
          address
        ),
        profiles (
          full_name,
          email
        )
      `)
      .eq('id', booking_id)
      .eq('renter_id', user.id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found or not authorized");
    }

    console.log("Booking found:", booking.id);

    // Format booking dates
    const startDate = new Date(booking.start_time).toLocaleString();
    const endDate = new Date(booking.end_time).toLocaleString();

    // Send email to support
    const emailResponse = await resend.emails.send({
      from: "Settld Parking <support@settldparking.com>",
      to: ["support@settldparking.com"],
      subject: `Manual Refund Request - Booking ${booking_id.slice(0, 8)}`,
      html: `
        <h2>Manual Refund Request</h2>
        
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> ${booking.profiles?.full_name || 'N/A'}</p>
        <p><strong>Email:</strong> ${user_email}</p>
        <p><strong>User ID:</strong> ${user.id}</p>
        
        <h3>Booking Details</h3>
        <p><strong>Booking ID:</strong> ${booking_id}</p>
        <p><strong>Spot:</strong> ${booking.parking_spots?.title || 'N/A'}</p>
        <p><strong>Address:</strong> ${booking.parking_spots?.address || 'N/A'}</p>
        <p><strong>Start Time:</strong> ${startDate}</p>
        <p><strong>End Time:</strong> ${endDate}</p>
        <p><strong>Original Amount:</strong> $${booking.total_amount.toFixed(2)}</p>
        <p><strong>Payment Intent ID:</strong> ${booking.payment_intent_id || 'N/A'}</p>
        
        <h3>Refund Request Details</h3>
        <p><strong>Requested Refund Amount:</strong> $${refund_amount.toFixed(2)}</p>
        <p><strong>Cancellation Fee:</strong> $${cancellation_fee.toFixed(2)}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Description:</strong> ${description}</p>
        
        <h3>Next Steps</h3>
        <p>Please review this refund request and process it manually in the Stripe dashboard.</p>
        <p>Once processed, please update the booking status and notify the customer.</p>
        
        <hr>
        <p><em>This is an automated message from the Settld Parking refund system.</em></p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the manual refund request in the refunds table
    const { error: logError } = await supabaseService
      .from('refunds')
      .insert({
        booking_id: booking_id,
        user_id: user.id,
        amount: refund_amount,
        reason: `${reason}: ${description}`,
        status: 'pending_manual_review'
      });

    if (logError) {
      console.error("Error logging refund request:", logError);
      // Don't fail the request if logging fails
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Refund request sent to support team"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-refund-request function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);