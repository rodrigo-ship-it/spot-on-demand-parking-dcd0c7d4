import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  email: string;
  booking: {
    id: string;
    total_amount: number;
    confirmation_number: string;
    display_date: string;
    display_start_time?: string;
    display_end_time?: string;
    end_date?: string;
    number_of_days: number;
    number_of_months?: number;
    is_daily: boolean;
    is_monthly?: boolean;
  };
  spot: {
    title: string;
    address: string;
    price_per_hour?: number;
    one_time_price?: number;
    daily_price?: number;
    monthly_price?: number;
    pricing_type: string;
  };
  renter: {
    full_name: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, booking, spot, renter }: BookingConfirmationRequest = await req.json();

    console.log("Sending booking confirmation email to:", email);

    // Get spot coordinates to determine timezone
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: spotData, error: spotError } = await supabase
      .from('parking_spots')
      .select('latitude, longitude')
      .eq('title', spot.title)
      .eq('address', spot.address)
      .single();

    if (spotError) {
      console.error('Error fetching spot coordinates:', spotError);
    }

    // Get timezone for the spot location
    let spotTimezone = 'UTC'; // fallback
    if (spotData?.latitude && spotData?.longitude) {
      try {
        // Use Google's Timezone API
        const timezoneResponse = await fetch(
          `https://maps.googleapis.com/maps/api/timezone/json?location=${spotData.latitude},${spotData.longitude}&timestamp=${Math.floor(Date.now() / 1000)}&key=${Deno.env.get('GOOGLE_PLACES_API_KEY')}`
        );
        const timezoneData = await timezoneResponse.json();
        if (timezoneData.status === 'OK') {
          spotTimezone = timezoneData.timeZoneId;
        }
      } catch (error) {
        console.error('Error getting timezone:', error);
      }
    }

    // Use the display values passed from the confirmation page (no conversion needed)
    const startDate = booking.display_date || 'Date not available';
    const startTime = booking.display_start_time || 'Time not available';
    const endTime = booking.display_end_time || 'Time not available';
    const numberOfDays = booking.number_of_days || 1;
    const numberOfMonths = booking.number_of_months || 0;
    const isDaily = booking.is_daily || false;
    const isMonthly = booking.is_monthly || false;

    // Create pricing display based on booking type
    const price = isMonthly ? spot.monthly_price : (isDaily ? (spot.daily_price || spot.one_time_price) : spot.price_per_hour);
    const pricingDisplay = isMonthly
      ? `${numberOfMonths} month${numberOfMonths > 1 ? 's' : ''} × $${price}/month`
      : (isDaily 
        ? `${numberOfDays} day${numberOfDays > 1 ? 's' : ''} × $${price}/day`
        : `Duration × $${price}/hour`);
    
    // Create date/time display for email
    const dateTimeDisplay = isMonthly 
      ? { label: 'Period', value: `${startDate} - ${booking.end_date || 'End date not available'}` }
      : { label: 'Date & Time', value: `${startDate}<br>${startTime} - ${endTime}` };

    const emailResponse = await resend.emails.send({
      from: "Arriv Parking <service@arrivparking.com>",
      to: [email],
      subject: "Booking Confirmed - Your Parking Spot is Reserved!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmed</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0 0 24px; color: #1a1a1a; font-size: 28px; font-weight: 600;">
                        🅿️ Arriv
                      </h1>
                      <div style="margin: 0 0 24px;">
                        <span style="display: inline-block; width: 64px; height: 64px; background-color: #10b981; border-radius: 50%; color: white; font-size: 32px; line-height: 64px;">✓</span>
                      </div>
                      <h2 style="margin: 0 0 16px; color: #333; font-size: 22px; font-weight: 500;">
                        Booking Confirmed!
                      </h2>
                      <p style="margin: 0 0 32px; color: #666; font-size: 16px; line-height: 1.5;">
                        Hi ${renter.full_name}, your parking spot has been successfully reserved.
                      </p>
                      
                      <!-- Booking Details -->
                      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: left;">
                        <h3 style="margin: 0 0 16px; color: #333; font-size: 18px; font-weight: 600;">Booking Details</h3>
                        
                        <div style="margin-bottom: 16px;">
                          <h4 style="margin: 0 0 8px; color: #1a1a1a; font-size: 16px; font-weight: 600;">${spot.title}</h4>
                          <p style="margin: 0; color: #666; font-size: 14px;">📍 ${spot.address}</p>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                          <div style="flex: 1;">
                            <p style="margin: 0 0 4px; color: #666; font-size: 14px; font-weight: 500;">${dateTimeDisplay.label}</p>
                            <p style="margin: 0; color: #333; font-size: 14px;">${dateTimeDisplay.value}</p>
                          </div>
                        </div>
                        
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #666; font-size: 14px;">Total Paid</span>
                            <span style="color: #10b981; font-size: 18px; font-weight: 600;">$${booking.total_amount}</span>
                          </div>
                          <p style="margin: 0; color: #666; font-size: 12px;">${pricingDisplay} (includes fees & tax)</p>
                        </div>
                      </div>
                      
                      <!-- Confirmation Number -->
                      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="margin: 0 0 4px; color: #666; font-size: 14px;">Confirmation Number</p>
                        <p style="margin: 0; color: #1d4ed8; font-size: 18px; font-weight: 600; font-family: monospace;">${booking.confirmation_number}</p>
                      </div>
                      
                      <!-- What's Next -->
                      <div style="text-align: left; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px; color: #333; font-size: 18px; font-weight: 600;">What's Next?</h3>
                        <div style="margin-bottom: 12px;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="width: 24px; height: 24px; background-color: #dbeafe; color: #1d4ed8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">1</div>
                            <div>
                              <p style="margin: 0 0 4px; color: #333; font-size: 14px; font-weight: 500;">Arrive at your spot</p>
                              <p style="margin: 0; color: #666; font-size: 12px;">Use the address above to navigate to your parking spot</p>
                            </div>
                          </div>
                        </div>
                        <div style="margin-bottom: 12px;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="width: 24px; height: 24px; background-color: #dbeafe; color: #1d4ed8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">2</div>
                            <div>
                              <p style="margin: 0 0 4px; color: #333; font-size: 14px; font-weight: 500;">Park your vehicle</p>
                              <p style="margin: 0; color: #666; font-size: 12px;">Follow any specific parking instructions from the owner</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div style="display: flex; align-items: flex-start;">
                            <div style="width: 24px; height: 24px; background-color: #dbeafe; color: #1d4ed8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">3</div>
                            <div>
                              <p style="margin: 0 0 4px; color: #333; font-size: 14px; font-weight: 500;">Relax & enjoy</p>
                              <p style="margin: 0; color: #666; font-size: 12px;">Remember to return by your end time</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Cancellation Policy -->
                      <div style="text-align: left; margin-bottom: 24px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px;">
                        <h3 style="margin: 0 0 12px; color: #92400e; font-size: 16px; font-weight: 600;">Cancellation Policy</h3>
                        <div style="margin-bottom: 8px;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="width: 6px; height: 6px; background-color: #10b981; border-radius: 50%; margin-top: 6px; margin-right: 8px; flex-shrink: 0;"></div>
                            <p style="margin: 0; color: #78350f; font-size: 13px;"><strong>24+ hours before:</strong> 100% refund, no fees</p>
                          </div>
                        </div>
                        <div style="margin-bottom: 8px;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="width: 6px; height: 6px; background-color: #f59e0b; border-radius: 50%; margin-top: 6px; margin-right: 8px; flex-shrink: 0;"></div>
                            <p style="margin: 0; color: #78350f; font-size: 13px;"><strong>3-24 hours before:</strong> 90% refund, 10% fee (max $5)</p>
                          </div>
                        </div>
                        <div>
                          <div style="display: flex; align-items: flex-start;">
                            <div style="width: 6px; height: 6px; background-color: #ef4444; border-radius: 50%; margin-top: 6px; margin-right: 8px; flex-shrink: 0;"></div>
                            <p style="margin: 0; color: #78350f; font-size: 13px;"><strong>Less than 3 hours:</strong> No refund, but you can still cancel</p>
                          </div>
                        </div>
                      </div>
                      
                      <p style="margin: 24px 0 0; color: #999; font-size: 14px; line-height: 1.4;">
                        Need help? Reply to this email or contact our support team.
                        <br><br>
                        Thank you for choosing Arriv!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Booking confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending booking confirmation email:", error);
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