import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/lib/auth-cleanup';
import { toast } from 'sonner';
import { logLoginAttempt } from '@/lib/securityMonitoring';
import { auditLog } from '@/lib/security';

// Authentication context for managing user sessions

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, session?.user?.email);
        
        // If we're on reset password page, don't auto sign-in from URL tokens
        if (window.location.pathname === '/reset-password' && event === 'SIGNED_IN') {
          console.log('Preventing auto sign-in on reset password page');
          // Sign out immediately to prevent auto sign-in
          supabase.auth.signOut();
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle auth events
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Only redirect if user just confirmed email and we're not already on home page
          if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at && window.location.pathname !== '/') {
            setTimeout(() => {
              window.location.href = '/';
            }, 500);
          }
        } else if (event === 'SIGNED_OUT') {
          cleanupAuthState();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Clean up existing state first
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log('Global signout failed, continuing...');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Log security event with enhanced monitoring
      const ipAddress = (navigator as any).connection?.effectiveType || 'unknown';
      logLoginAttempt(!error, email, ipAddress);
      auditLog.logSecurityEvent('user_signin_attempt', { 
        email, 
        success: !error,
        ipAddress,
        userAgent: navigator.userAgent
      });

      if (error) throw error;

      if (data.user) {
        toast.success('Signed in successfully!');
        // Force page reload for clean state
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      logLoginAttempt(false, email);
      auditLog.logSecurityEvent('user_signin_error', { 
        email, 
        error: error.message,
        userAgent: navigator.userAgent
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      // Clean up existing state first
      cleanupAuthState();

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || ''
          }
        }
      });

      auditLog.logSecurityEvent('user_signup_attempt', { 
        email, 
        success: !error,
        userAgent: navigator.userAgent
      });

      if (error) {
        // Handle case where user already exists but is unconfirmed
        if (error.message.includes('User already registered')) {
          toast.error('An account with this email already exists. Please check your email for confirmation or try signing in.');
          return { error };
        }
        throw error;
      }

      if (data.user) {
        toast.success('Account created! Please check your email to confirm.');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      auditLog.logSecurityEvent('user_signup_error', { 
        email, 
        error: error.message,
        userAgent: navigator.userAgent
      });
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Use a direct URL without going through Supabase's auth flow
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      auditLog.logSecurityEvent('user_password_reset_request', { 
        email, 
        success: !error,
        userAgent: navigator.userAgent
      });

      if (error) throw error;

      toast.success('Password reset email sent! Please check your inbox.');
      return { error: null };
    } catch (error: any) {
      console.error('Password reset error:', error);
      auditLog.logSecurityEvent('user_password_reset_error', { 
        email, 
        error: error.message,
        userAgent: navigator.userAgent
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout failed, continuing...');
      }
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      // Force reload even if signout fails
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      loading, 
      signIn, 
      signUp, 
      signOut,
      resetPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
};