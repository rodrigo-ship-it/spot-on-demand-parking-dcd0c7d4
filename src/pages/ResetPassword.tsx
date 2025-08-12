import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validTokens, setValidTokens] = useState<{access_token: string, refresh_token: string} | null>(null);
  const [passwords, setPasswords] = useState({
    password: '',
    confirmPassword: ''
  });

  // Get the tokens from URL parameters - check both query params and hash
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  
  // Also check URL hash for tokens (Supabase sometimes uses hash)
  const urlHash = window.location.hash;
  console.log('URL search params:', window.location.search);
  console.log('URL hash:', urlHash);
  console.log('Access token from params:', accessToken);
  console.log('Refresh token from params:', refreshToken);

  useEffect(() => {
    // Check for error in hash first
    if (urlHash && urlHash.includes('error=')) {
      const hashParams = new URLSearchParams(urlHash.substring(1));
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');
      
      console.log('Password reset error:', { error, errorCode, errorDescription });
      
      if (errorCode === 'otp_expired') {
        toast.error('Password reset link has expired. Please request a new one.');
      } else {
        toast.error('Invalid password reset link. Please request a new one.');
      }
      
      // Redirect to auth page after showing error
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
      return;
    }
    
    // Parse tokens from hash if not in search params
    let finalAccessToken = accessToken;
    let finalRefreshToken = refreshToken;
    
    if (!finalAccessToken && urlHash) {
      const hashParams = new URLSearchParams(urlHash.substring(1));
      finalAccessToken = hashParams.get('access_token');
      finalRefreshToken = hashParams.get('refresh_token');
      console.log('Tokens from hash - access:', finalAccessToken, 'refresh:', finalRefreshToken);
    }
    
    // If no tokens anywhere, redirect to auth page
    if (!finalAccessToken || !finalRefreshToken) {
      console.log('No tokens found, redirecting to auth');
      toast.error('Invalid password reset link. Please request a new one.');
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
      return;
    }

    // If we have valid tokens, store them for later use
    if (finalAccessToken && finalRefreshToken) {
      console.log('Valid tokens found, storing for password reset');
      setValidTokens({
        access_token: finalAccessToken,
        refresh_token: finalRefreshToken
      });
    }
  }, [accessToken, refreshToken, navigate, urlHash]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validTokens) {
      toast.error('Invalid reset session. Please request a new password reset.');
      navigate('/auth');
      return;
    }
    
    setIsLoading(true);

    // Validate passwords
    if (passwords.password !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (passwords.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // First, set the session with the reset tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: validTokens.access_token,
        refresh_token: validTokens.refresh_token
      });

      if (sessionError) {
        throw sessionError;
      }

      // Now update the password
      const { error } = await supabase.auth.updateUser({
        password: passwords.password
      });

      if (error) {
        throw error;
      }

      toast.success('Password updated successfully! You can now sign in with your new password.');
      
      // Sign out the user and redirect to auth page
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Sign In</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <img 
                src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
                alt="Arriv Logo" 
                className="w-16 h-16"
              />
              <h1 className="text-xl font-bold text-gray-900">Arriv</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Reset Password Form */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={passwords.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={passwords.confirmPassword}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;