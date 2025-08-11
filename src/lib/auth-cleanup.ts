/**
 * Comprehensive authentication state cleanup utility
 * Prevents authentication limbo states and security issues
 */

export const cleanupAuthState = () => {
  console.log('🧹 Cleaning up authentication state...');
  
  // Remove standard auth tokens
  const keysToRemove = [
    'supabase.auth.token',
    'sb-access-token',
    'sb-refresh-token',
  ];

  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (
      key.startsWith('supabase.auth.') || 
      key.includes('sb-') ||
      key.startsWith('supabase-auth-token') ||
      key.includes('auth-token')
    ) {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed localStorage key: ${key}`);
    }
  });

  // Remove from sessionStorage if available
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (
        key.startsWith('supabase.auth.') || 
        key.includes('sb-') ||
        key.startsWith('supabase-auth-token') ||
        key.includes('auth-token')
      ) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Removed sessionStorage key: ${key}`);
      }
    });
  }

  // Clear any user-specific cached data
  const userCacheKeys = [
    'user-profile',
    'user-preferences', 
    'booking-cache',
    'spot-cache'
  ];
  
  userCacheKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage?.removeItem(key);
  });

  console.log('✅ Authentication cleanup completed');
};

export const secureSignOut = async (supabase: any) => {
  try {
    console.log('🔐 Starting secure sign out process...');
    
    // Step 1: Clean up local state first
    cleanupAuthState();
    
    // Step 2: Attempt global sign out (continue even if it fails)
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('✅ Global sign out successful');
    } catch (signOutError) {
      console.warn('⚠️ Global sign out failed, continuing with cleanup:', signOutError);
    }
    
    // Step 3: Force page reload for complete state reset
    window.location.href = '/auth';
    
  } catch (error) {
    console.error('❌ Error during secure sign out:', error);
    // Force cleanup and redirect even if there's an error
    cleanupAuthState();
    window.location.href = '/auth';
  }
};

export const secureSignIn = async (
  supabase: any, 
  email: string, 
  password: string
) => {
  try {
    console.log('🔐 Starting secure sign in process...');
    
    // Step 1: Clean up any existing state
    cleanupAuthState();
    
    // Step 2: Attempt global sign out (to clear any ghost sessions)
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
      console.warn('⚠️ Pre-signin cleanup failed, continuing:', err);
    }
    
    // Step 3: Sign in with credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    
    if (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
    
    if (data.user) {
      console.log('✅ Sign in successful, redirecting...');
      // Force page reload for clean state
      window.location.href = '/';
      return { data, error: null };
    }
    
    return { data, error };
    
  } catch (error) {
    console.error('❌ Secure sign in failed:', error);
    return { data: null, error };
  }
};