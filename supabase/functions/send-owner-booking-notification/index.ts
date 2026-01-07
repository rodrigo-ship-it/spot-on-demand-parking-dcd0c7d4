import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OwnerNotificationRequest {
  email: string;
  owner: {
    full_name: string;
  };
  booking: {
    id: string;
    total_amount: number;
    owner_payout_amount: number;
    confirmation_number: string;
    display_date: string;
    display_start_time?: string;
    display_end_time?: string;
    display_duration_text?: string;
    is_daily: boolean;
    is_monthly?: boolean;
  };
  spot: {
    title: string;
    address: string;
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
    const { email, owner, booking, spot, renter }: OwnerNotificationRequest = await req.json();

    console.log("📧 [OWNER_EMAIL] Sending owner booking notification to:", email);

    const dateTimeDisplay = booking.is_monthly 
      ? `${booking.display_date} (${booking.display_duration_text})`
      : `${booking.display_date}<br>${booking.display_start_time || ''} - ${booking.display_end_time || ''}`;

    const emailResponse = await resend.emails.send({
      from: "Settld Parking <support@settldparking.com>",
      to: [email],
      subject: `New Booking! Your spot "${spot.title}" has been reserved`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Booking Received</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0 0 24px; color: #1a1a1a; font-size: 28px; font-weight: 600;">
                        🅿️ Settld
                      </h1>
                      <div style="margin: 0 0 24px;">
                        <span style="display: inline-block; width: 64px; height: 64px; background-color: #10b981; border-radius: 50%; color: white; font-size: 32px; line-height: 64px;">💰</span>
                      </div>
                      <h2 style="margin: 0 0 16px; color: #333; font-size: 22px; font-weight: 500;">
                        New Booking Received!
                      </h2>
                      <p style="margin: 0 0 32px; color: #666; font-size: 16px; line-height: 1.5;">
                        Hi ${owner.full_name || 'Spot Owner'}, great news! Someone has booked your parking spot.
                      </p>
                      
                      <!-- Spot Details -->
                      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: left;">
                        <h3 style="margin: 0 0 16px; color: #333; font-size: 18px; font-weight: 600;">Booking Details</h3>
                        
                        <div style="margin-bottom: 16px;">
                          <h4 style="margin: 0 0 8px; color: #1a1a1a; font-size: 16px; font-weight: 600;">${spot.title}</h4>
                          <p style="margin: 0; color: #666; font-size: 14px;">📍 ${spot.address}</p>
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                          <p style="margin: 0 0 4px; color: #666; font-size: 14px; font-weight: 500;">Renter</p>
                          <p style="margin: 0; color: #333; font-size: 14px;">👤 ${renter.full_name}</p>
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                          <p style="margin: 0 0 4px; color: #666; font-size: 14px; font-weight: 500;">When</p>
                          <p style="margin: 0; color: #333; font-size: 14px;">${dateTimeDisplay}</p>
                          ${booking.display_duration_text && !booking.is_monthly ? `<p style="margin: 4px 0 0; color: #666; font-size: 12px;">Duration: ${booking.display_duration_text}</p>` : ''}
                        </div>
                        
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #666; font-size: 14px;">Your Payout</span>
                            <span style="color: #10b981; font-size: 20px; font-weight: 700;">$${booking.owner_payout_amount?.toFixed(2) || booking.total_amount?.toFixed(2)}</span>
                          </div>
                          <p style="margin: 0; color: #666; font-size: 12px;">After platform fees • Transferred after booking completes</p>
                        </div>
                      </div>
                      
                      <!-- Confirmation Number -->
                      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="margin: 0 0 4px; color: #666; font-size: 14px;">Confirmation Number</p>
                        <p style="margin: 0; color: #1d4ed8; font-size: 18px; font-weight: 600; font-family: monospace;">${booking.confirmation_number}</p>
                      </div>
                      
                      <!-- What You Need To Do -->
                      <div style="text-align: left; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px; color: #333; font-size: 18px; font-weight: 600;">What You Need To Do</h3>
                        <div style="margin-bottom: 12px;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="width: 24px; height: 24px; background-color: #dbeafe; color: #1d4ed8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">1</div>
                            <div>
                              <p style="margin: 0 0 4px; color: #333; font-size: 14px; font-weight: 500;">Ensure spot availability</p>
                              <p style="margin: 0; color: #666; font-size: 12px;">Make sure your parking spot is available and accessible during the booked time</p>
                            </div>
                          </div>
                        </div>
                        <div style="margin-bottom: 12px;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="width: 24px; height: 24px; background-color: #dbeafe; color: #1d4ed8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">2</div>
                            <div>
                              <p style="margin: 0 0 4px; color: #333; font-size: 14px; font-weight: 500;">Be available for questions</p>
                              <p style="margin: 0; color: #666; font-size: 12px;">The renter may contact you through the app if they have any questions</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div style="display: flex; align-items: flex-start;">
                            <div style="width: 24px; height: 24px; background-color: #dbeafe; color: #1d4ed8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">3</div>
                            <div>
                              <p style="margin: 0 0 4px; color: #333; font-size: 14px; font-weight: 500;">Get paid after checkout</p>
                              <p style="margin: 0; color: #666; font-size: 12px;">Your payout will be transferred to your bank after the renter checks out (typically within a few business days)</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Important Notice -->
                      <div style="text-align: left; margin-bottom: 24px; background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px;">
                        <h3 style="margin: 0 0 12px; color: #166534; font-size: 16px; font-weight: 600;">💡 Reminder</h3>
                        <p style="margin: 0; color: #166534; font-size: 13px;">
                          Keep your access instructions up to date so renters can easily find and access your spot. 
                          You can update them anytime from your Manage Spots page.
                        </p>
                      </div>
                      
                      <p style="margin: 24px 0 0; color: #999; font-size: 14px; line-height: 1.4;">
                        Need help? Reply to this email or contact our support team.
                        <br><br>
                        Thank you for hosting with Settld!
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

    console.log("✅ [OWNER_EMAIL] Owner notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ [OWNER_EMAIL] Error sending owner notification email:", error);
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
