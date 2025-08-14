import { supabase } from '@/integrations/supabase/client';

/**
 * Server-side rate limiting with Supabase edge functions
 */

interface RateLimitOptions {
  action: string;
  key: string;
  userId?: string;
}

interface RateLimitResponse {
  allowed: boolean;
  blocked: boolean;
  attemptsRemaining?: number;
  retryAfter?: number;
  reason?: string;
}

export class ServerSideRateLimit {
  /**
   * Check if an action is allowed for a given key
   */
  static async checkRateLimit(options: RateLimitOptions): Promise<RateLimitResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('security-rate-limit', {
        body: {
          action: options.action,
          key: options.key,
          userId: options.userId
        }
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        // Fail open - allow the action if rate limit service is down
        return { allowed: true, blocked: false };
      }

      return data as RateLimitResponse;
    } catch (error) {
      console.error('Rate limit service error:', error);
      // Fail open for service availability
      return { allowed: true, blocked: false };
    }
  }

  /**
   * Check login rate limit
   */
  static async checkLoginLimit(email: string, userId?: string): Promise<RateLimitResponse> {
    return this.checkRateLimit({
      action: 'login',
      key: email,
      userId
    });
  }

  /**
   * Check payment rate limit
   */
  static async checkPaymentLimit(userId: string): Promise<RateLimitResponse> {
    return this.checkRateLimit({
      action: 'payment',
      key: userId,
      userId
    });
  }

  /**
   * Check API rate limit
   */
  static async checkAPILimit(ipAddress: string, userId?: string): Promise<RateLimitResponse> {
    return this.checkRateLimit({
      action: 'api',
      key: ipAddress,
      userId
    });
  }

  /**
   * Check Stripe access rate limit
   */
  static async checkStripeAccessLimit(userId: string): Promise<RateLimitResponse> {
    return this.checkRateLimit({
      action: 'stripe_access',
      key: userId,
      userId
    });
  }
}

/**
 * Higher-order function to wrap API calls with rate limiting
 */
export function withRateLimit<T extends any[], R>(
  action: string,
  keyExtractor: (...args: T) => string,
  userIdExtractor?: (...args: T) => string | undefined
) {
  return function(fn: (...args: T) => Promise<R>) {
    return async (...args: T): Promise<R> => {
      const key = keyExtractor(...args);
      const userId = userIdExtractor?.(...args);

      const rateLimitResult = await ServerSideRateLimit.checkRateLimit({
        action,
        key,
        userId
      });

      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitResult.reason}`);
      }

      return fn(...args);
    };
  };
}

/**
 * Validate Stripe account access
 */
export async function validateStripeAccess(
  stripeAccountId: string, 
  operation: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-stripe-access', {
      body: {
        stripeAccountId,
        operation
      }
    });

    if (error) {
      console.error('Stripe validation failed:', error);
      return { valid: false, reason: 'Validation service error' };
    }

    return data;
  } catch (error) {
    console.error('Stripe validation error:', error);
    return { valid: false, reason: 'Validation failed' };
  }
}