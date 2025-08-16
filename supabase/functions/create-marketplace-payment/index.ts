import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🔥 SIMPLE TEST - Function called");
  
  if (req.method === "OPTIONS") {
    console.log("📝 SIMPLE TEST - Handling OPTIONS");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📝 SIMPLE TEST - Handling POST");
    
    const body = await req.text();
    console.log("📝 SIMPLE TEST - Body received:", body);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: "Simple test successful",
      received_body: body
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ SIMPLE TEST - Error:", error);
    return new Response(JSON.stringify({ 
      error: "Simple test failed",
      message: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});