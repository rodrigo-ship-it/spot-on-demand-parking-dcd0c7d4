import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactFormRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  type: "general" | "support" | "billing" | "bug";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message, type }: ContactFormRequest = await req.json();

    console.log("Received contact form submission:", { name, email, subject, type });

    // Send email to support team
    const supportEmailResponse = await resend.emails.send({
      from: "Settld Parking <support@settldparking.com>",
      to: ["support@settldparking.com"],
      subject: `[${type.toUpperCase()}] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0066cc; margin-top: 0;">Contact Details</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Message</h3>
            <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              This message was sent from the Settld contact form. Please respond to ${email} directly.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Support email sent successfully:", supportEmailResponse);

    // Send confirmation email to user
    const confirmationEmailResponse = await resend.emails.send({
      from: "Settld Parking <support@settldparking.com>",
      to: [email],
      subject: "We received your message - Settld Support",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
            Thank you for contacting Settld!
          </h2>
          
          <div style="padding: 20px 0;">
            <p>Hi ${name},</p>
            
            <p>We have received your message and our support team will get back to you within 24 hours.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Your Message Summary</h3>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Type:</strong> ${type}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>If you have any urgent issues, you can also reach us at support@settldparking.com.</p>
            
            <p>Best regards,<br>
            The Settld Support Team</p>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #e7f3ff; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              This is an automated confirmation email from Settld.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Confirmation email sent successfully:", confirmationEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Contact form submitted successfully",
        supportEmailId: supportEmailResponse.data?.id,
        confirmationEmailId: confirmationEmailResponse.data?.id
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send email",
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);