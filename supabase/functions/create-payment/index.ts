import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { bookingId, baseAmount, currency = "usd", customerEmail, customerName } = await req.json();

    if (!bookingId || !baseAmount) {
      throw new Error("Missing required fields: bookingId and baseAmount");
    }

    // Calculate fees - renter pays 7% fee on top, lister gets 93% of base amount
    const renterFee = Math.round(baseAmount * 0.07 * 100) / 100; // 7% fee
    const totalAmountForRenter = baseAmount + renterFee; // What renter pays
    const amountToLister = Math.round(baseAmount * 0.93 * 100) / 100; // What lister receives (93%)
    const platformFee = baseAmount - amountToLister; // What platform keeps (7%)

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user (if any)
    let user = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
    }

    // Use provided email or user email or default
    const email = customerEmail || user?.email || "guest@example.com";

    // Check if a Stripe customer record exists for this email
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer if doesn't exist
      const customer = await stripe.customers.create({
        email,
        name: customerName || user?.user_metadata?.full_name || undefined,
      });
      customerId = customer.id;
    }

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency,
            product_data: { 
              name: "Parking Spot Rental",
              description: `Booking ID: ${bookingId}`
            },
            unit_amount: Math.round(totalAmountForRenter * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${req.headers.get("origin")}/book-spot/${bookingId.split('-')[0]}?cancelled=true`,
      metadata: {
        bookingId,
        baseAmount: baseAmount.toString(),
        totalAmountForRenter: totalAmountForRenter.toString(),
        amountToLister: amountToLister.toString(),
        platformFee: platformFee.toString(),
        currency,
      },
    });

    // Optional: Update booking with Stripe session ID using service role
    try {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabaseService
        .from("bookings")
        .update({ 
          payment_intent_id: session.id,
          status: 'pending_payment'
        })
        .eq('id', bookingId);
    } catch (error) {
      console.error('Error updating booking:', error);
      // Continue even if this fails
    }

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});