// Helper function to create 2 separate charges for penalty + hourly
export async function createSeparatePenaltyCharges(
  stripe: any, 
  user: any, 
  penaltyFeeCents: number, 
  hourlyChargeCents: number, 
  penaltyCreditId: string, 
  connectAccountId: string | null, 
  origin: string | null
) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  
  try {
    const taxRate = 0.085; // 8.5% tax rate
    
    // Charge 1: Penalty fee (100% to platform)
    const penaltyWithTax = Math.round(penaltyFeeCents * (1 + taxRate));
    
    // Charge 2: Hourly charge with platform fee (like regular booking)
    const renterPlatformFee = Math.round(hourlyChargeCents * 0.07);
    const hourlySubtotal = hourlyChargeCents + renterPlatformFee;
    const hourlyWithTax = Math.round(hourlySubtotal * (1 + taxRate));
    const ownerAmount = connectAccountId ? Math.round(hourlyChargeCents * 0.93) : 0; // 93% to owner
    
    // Create combined session with both line items
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Late Parking Penalty",
              description: `Late checkout penalty fee`,
            },
            unit_amount: penaltyWithTax,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Extra Parking Time",
              description: `Additional parking time charges`,
            },
            unit_amount: hourlyWithTax,
          },
          quantity: 1,
        }
      ],
      metadata: {
        type: 'penalty_split',
        penalty_credit_id: penaltyCreditId,
        penalty_fee: penaltyFeeCents.toString(),
        penalty_with_tax: penaltyWithTax.toString(),
        hourly_charge: hourlyChargeCents.toString(),
        hourly_with_fees_tax: hourlyWithTax.toString(),
        renter_platform_fee: renterPlatformFee.toString(),
        owner_amount: ownerAmount.toString(),
      },
      payment_intent_data: connectAccountId && ownerAmount > 0 ? {
        transfer_data: {
          destination: connectAccountId,
          amount: ownerAmount, // Only transfer the owner portion of hourly charge
        },
      } : undefined,
      success_url: `${origin}/profile?penalty_paid=true`,
      cancel_url: `${origin}/profile`,
    });
    
    console.log("📝 Split penalty payment session created successfully");
    
    return new Response(JSON.stringify({ 
      checkout_url: session.url,
      session_id: session.id,
      success: true,
      message: "Split penalty payment session created",
      breakdown: {
        penalty_charge: (penaltyWithTax / 100).toFixed(2),
        hourly_charge: (hourlyWithTax / 100).toFixed(2),
        total_user_pays: ((penaltyWithTax + hourlyWithTax) / 100).toFixed(2),
        platform_gets: ((penaltyFeeCents + renterPlatformFee + Math.round(hourlyChargeCents * 0.07)) / 100).toFixed(2),
        owner_gets: (ownerAmount / 100).toFixed(2)
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("❌ Split penalty payment error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Split penalty payment processing failed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}