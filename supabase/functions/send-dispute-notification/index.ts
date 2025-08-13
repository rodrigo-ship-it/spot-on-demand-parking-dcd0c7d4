import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DisputeNotificationRequest {
  disputeId: string;
  bookingId: string;
  reporterEmail: string;
  disputeType: string;
  photoUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { disputeId, bookingId, reporterEmail, disputeType, photoUrl }: DisputeNotificationRequest = await req.json();

    console.log('Processing dispute notification:', { disputeId, bookingId, disputeType });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get dispute details
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(`
        *,
        bookings:booking_id (
          id,
          start_time,
          end_time,
          parking_spots:spot_id (
            title,
            address
          )
        ),
        profiles:reporter_id (
          full_name,
          email
        )
      `)
      .eq('id', disputeId)
      .single();

    if (disputeError) {
      console.error('Error fetching dispute:', disputeError);
      throw disputeError;
    }

    const booking = dispute.bookings;
    const spot = booking.parking_spots;
    const reporter = dispute.profiles;

    const disputeTypeText = disputeType === 'occupied' ? 'Spot Occupied' : 'Overstay';
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">🚨 New Spot Dispute Report</h2>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Dispute Details</h3>
          <p><strong>Type:</strong> ${disputeTypeText}</p>
          <p><strong>Dispute ID:</strong> ${disputeId}</p>
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Reported by:</strong> ${reporter.full_name} (${reporter.email})</p>
          <p><strong>Date/Time:</strong> ${new Date(dispute.created_at).toLocaleString()}</p>
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1976d2;">Parking Spot Information</h3>
          <p><strong>Spot:</strong> ${spot.title}</p>
          <p><strong>Address:</strong> ${spot.address}</p>
          <p><strong>Booking Period:</strong> ${new Date(booking.start_time).toLocaleString()} - ${new Date(booking.end_time).toLocaleString()}</p>
        </div>

        ${dispute.description ? `
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #f57c00;">Description</h3>
          <p>${dispute.description}</p>
        </div>
        ` : ''}

        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #388e3c;">Photo Evidence</h3>
          <p>A timestamped photo has been submitted as evidence.</p>
          <p><strong>Photo URL:</strong> <a href="${photoUrl}" target="_blank">View Evidence Photo</a></p>
        </div>

        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #d32f2f;">Action Required</h3>
          <ul>
            <li>Review the photo evidence</li>
            <li>Verify the dispute claim</li>
            <li>Contact the customer if needed: ${reporter.email}</li>
            <li>Process refund if claim is valid</li>
            <li>Update dispute status in the system</li>
          </ul>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          This is an automated notification from ArrivParking dispute system.<br>
          Please do not reply to this email. Contact the customer directly using the provided email address.
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "ArrivParking <notifications@resend.dev>",
      to: ["service@arrivparking.com"],
      subject: `🚨 Dispute Report: ${disputeTypeText} - ${spot.title}`,
      html: emailHtml,
    });

    console.log("Dispute notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-dispute-notification function:", error);
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