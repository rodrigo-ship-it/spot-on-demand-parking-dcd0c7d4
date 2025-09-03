/**
 * Security utilities for data validation and protection
 */

// Enhanced input validation and sanitization
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data URIs
    .replace(/vbscript:/gi, '') // Remove VBScript
    .replace(/=\s*("|')?\s*javascript:/gi, '') // Remove JS in attributes
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .slice(0, 1000); // Limit length
};

// Enhanced CSV injection protection
export const sanitizeCSVInput = (input: string): string => {
  if (!input) return '';
  
  const dangerous = /^[=+\-@\t\r]/;
  if (dangerous.test(input)) {
    return `'${input}`; // Prefix with quote to neutralize
  }
  
  return sanitizeInput(input);
};

// SQL injection protection
export const sanitizeSQLInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/[';\\]/g, '') // Remove SQL dangerous characters
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|OR|AND)\b/gi, '') // Remove SQL keywords
    .slice(0, 500);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
  return phoneRegex.test(phone);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rate limiting for client-side protection
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }
    
    const attempts = this.attempts.get(key)!;
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => time > windowStart);
    this.attempts.set(key, recentAttempts);
    
    if (recentAttempts.length >= maxAttempts) {
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// Security headers helper
export const getSecurityHeaders = () => ({
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
});

// Audit logging
export const auditLog = {
  logSecurityEvent: (event: string, details: any = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      sessionId: typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('session-id') || 'anonymous') : 'anonymous'
    };
    
    console.log('🔍 SECURITY AUDIT:', logEntry);
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to your monitoring service (e.g., Sentry, LogRocket)
    }
  }
};

// Secure data handling
export const secureData = {
  // Mask sensitive data for logging
  maskEmail: (email: string): string => {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    return `${local.charAt(0)}***@${domain}`;
  },
  
  maskPhone: (phone: string): string => {
    if (!phone) return '***';
    return phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
  },
  
  maskCreditCard: (card: string): string => {
    if (!card) return '***';
    return card.replace(/\d(?=\d{4})/g, '*');
  }
};