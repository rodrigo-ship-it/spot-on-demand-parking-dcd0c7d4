import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  confirmationUrl: string;
  type: 'signup' | 'recovery';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, confirmationUrl, type }: EmailRequest = await req.json();

    console.log(`Sending ${type} email to:`, email);

    const subject = type === 'signup' ? 'Confirm Your Settld Account' : 'Reset Your Password';
    const actionText = type === 'signup' ? 'Confirm Account' : 'Reset Password';
    const messageText = type === 'signup' 
      ? 'Welcome to Settld! Please confirm your email address to complete your registration.'
      : 'You requested to reset your password. Click the button below to create a new password.';

    const emailResponse = await resend.emails.send({
      from: "Settld Parking <support@settldparking.com>",
      to: [email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
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
                      <h2 style="margin: 0 0 16px; color: #333; font-size: 22px; font-weight: 500;">
                        ${subject}
                      </h2>
                      <p style="margin: 0 0 32px; color: #666; font-size: 16px; line-height: 1.5;">
                        ${messageText}
                      </p>
                      <a href="${confirmationUrl}" 
                         style="display: inline-block; padding: 16px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; transition: background-color 0.2s;">
                        ${actionText}
                      </a>
                      <p style="margin: 32px 0 0; color: #999; font-size: 14px; line-height: 1.4;">
                        If you didn't request this email, you can safely ignore it.
                        <br><br>
                        If the button doesn't work, copy and paste this link into your browser:
                        <br>
                        <span style="color: #3b82f6; word-break: break-all;">${confirmationUrl}</span>
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

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
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