import React, { useEffect, ReactNode } from 'react';
import { getSecurityHeaders, auditLog } from '@/lib/security';

interface SecurityWrapperProps {
  children: ReactNode;
}

export const SecurityWrapper: React.FC<SecurityWrapperProps> = ({ children }) => {
  useEffect(() => {
    // Set security headers (where possible in client-side)
    const headers = getSecurityHeaders();
    
    // Log security initialization
    auditLog.logSecurityEvent('security_wrapper_initialized', {
      headers: Object.keys(headers),
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    });

    // Prevent right-click in production (optional)
    const handleContextMenu = (e: MouseEvent) => {
      if (process.env.NODE_ENV === 'production') {
        e.preventDefault();
        auditLog.logSecurityEvent('context_menu_blocked');
      }
    };

    // Prevent common developer tools shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (process.env.NODE_ENV === 'production') {
        // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
          (e.ctrlKey && e.key === 'U')
        ) {
          e.preventDefault();
          auditLog.logSecurityEvent('dev_tools_blocked', { key: e.key });
          return false;
        }
      }
    };

    // Monitor for potential XSS attempts
    const handleError = (e: ErrorEvent) => {
      auditLog.logSecurityEvent('javascript_error', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
      });
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return <>{children}</>;
};