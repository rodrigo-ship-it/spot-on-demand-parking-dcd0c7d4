import { useEffect } from 'react';

interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

export const useSecurityHeaders = () => {
  useEffect(() => {
    // Set security-related meta tags
    const metaTags = [
      {
        name: 'Content-Security-Policy',
        content: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src 'self' https://js.stripe.com; object-src 'none'; base-uri 'self'"
      },
      {
        name: 'X-Frame-Options',
        content: 'DENY'
      },
      {
        name: 'X-Content-Type-Options',
        content: 'nosniff'
      },
      {
        name: 'Referrer-Policy',
        content: 'strict-origin-when-cross-origin'
      },
      {
        name: 'Permissions-Policy',
        content: 'camera=(), microphone=(), geolocation=(self), payment=(self)'
      }
    ];

    metaTags.forEach(({ name, content }) => {
      const existingTag = document.querySelector(`meta[http-equiv="${name}"]`);
      if (existingTag) {
        existingTag.setAttribute('content', content);
      } else {
        const meta = document.createElement('meta');
        meta.httpEquiv = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    });

    // Prevent clickjacking
    if (window.self !== window.top) {
      document.body.style.display = 'none';
      window.top?.location.replace(window.location.href);
    }
  }, []);

  return {
    getCSRFToken: () => {
      const token = sessionStorage.getItem('csrf-token') || 
                   Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('csrf-token', token);
      return token;
    },
    
    validateOrigin: (origin: string) => {
      const allowedOrigins = [
        'https://settldparking.com',
        'https://www.settldparking.com',
        window.location.origin
      ];
      return allowedOrigins.includes(origin);
    }
  };
};