import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RateLimitRule {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 },
  payment: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 2 * 60 * 60 * 1000 },
  api: { maxAttempts: 100, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 },
  stripe_access: { maxAttempts: 10, windowMs: 60 * 1000, blockDurationMs: 10 * 60 * 1000 },
  // Enhanced data protection against scraping
  spot_listings: { maxAttempts: 50, windowMs: 60 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 }, // 50 per hour
  place_search: { maxAttempts: 30, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 }, // 30 per hour
  data_export: { maxAttempts: 5, windowMs: 60 * 60 * 1000, blockDurationMs: 4 * 60 * 60 * 1000 }, // 5 per hour
  bulk_access: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 6 * 60 * 60 * 1000 }  // 3 per hour
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { action, key, userId } = await req.json();
    
    if (!action || !key) {
      throw new Error("Missing required parameters: action and key");
    }

    const rule = RATE_LIMIT_RULES[action];
    if (!rule) {
      throw new Error(`Unknown action: ${action}`);
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - rule.windowMs);

    // Check current attempts in the time window
    const { data: recentAttempts, error: fetchError } = await supabaseClient
      .from('security_audit_log')
      .select('created_at')
      .eq('event_type', `rate_limit_${action}`)
      .eq('event_data->key', key)
      .gte('created_at', windowStart.toISOString());

    if (fetchError) {
      console.error('Failed to fetch rate limit data:', fetchError);
      throw new Error('Rate limit check failed');
    }

    const attemptCount = recentAttempts?.length || 0;

    // Check if currently blocked
    const blockUntil = new Date(now.getTime() - rule.blockDurationMs);
    const { data: blockCheck, error: blockError } = await supabaseClient
      .from('security_audit_log')
      .select('created_at')
      .eq('event_type', `rate_limit_blocked_${action}`)
      .eq('event_data->key', key)
      .gte('created_at', blockUntil.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (blockError) {
      console.error('Failed to check block status:', blockError);
    }

    const isCurrentlyBlocked = blockCheck && blockCheck.length > 0;

    if (isCurrentlyBlocked) {
      return new Response(JSON.stringify({
        allowed: false,
        blocked: true,
        reason: `Blocked due to excessive ${action} attempts`,
        retryAfter: rule.blockDurationMs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Check if limit exceeded
    if (attemptCount >= rule.maxAttempts) {
      // Log the block
      await supabaseClient.rpc('log_security_event', {
        p_event_type: `rate_limit_blocked_${action}`,
        p_event_data: { 
          key, 
          attempts: attemptCount,
          limit: rule.maxAttempts,
          ipAddress: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')
        },
        p_user_id: userId || null
      });

      return new Response(JSON.stringify({
        allowed: false,
        blocked: true,
        reason: `Rate limit exceeded for ${action}`,
        attemptsRemaining: 0,
        retryAfter: rule.blockDurationMs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Log the attempt
    await supabaseClient.rpc('log_security_event', {
      p_event_type: `rate_limit_${action}`,
      p_event_data: { 
        key,
        attempt: attemptCount + 1,
        ipAddress: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')
      },
      p_user_id: userId || null
    });

    return new Response(JSON.stringify({
      allowed: true,
      blocked: false,
      attemptsRemaining: rule.maxAttempts - attemptCount - 1
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Rate limit error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      allowed: true // Fail open for service availability
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});