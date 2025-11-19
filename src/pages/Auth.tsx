import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { validatePassword } from '@/lib/security';
import { SecurityEnhancedForm } from '@/components/SecurityEnhancedForm';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading, resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [activeTab, setActiveTab] = useState("signin"); // Control active tab
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    confirmPassword: ''
  });
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    errors: [] as string[]
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate password in real-time for signup
    if (name === 'password' && activeTab === 'signup') {
      const validation = validatePassword(value);
      setPasswordValidation(validation);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please check your credentials.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please check your email and click the confirmation link.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Welcome back!');
        // Check if user has accepted terms before redirecting
        const termsAccepted = localStorage.getItem('termsAccepted');
        if (termsAccepted === 'true') {
          navigate('/');
        } else {
          navigate('/terms');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await resetPassword(formData.email);
      
      if (error) {
        toast.error(error.message);
      } else {
        setIsResetMode(false);
        setFormData(prev => ({ ...prev, email: '', password: '' }));
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (formData: FormData, csrfToken: string) => {
    setIsLoading(true);

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!phone || phone.trim() === '') {
      toast.error('Phone number is required');
      setIsLoading(false);
      return;
    }

    // Enhanced password validation
    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast.error(`Password requirements not met: ${validation.errors.join(', ')}`);
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password, fullName, phone);
      
      if (error) {
        if (error.message.includes('User already registered')) {
          // Clear password fields and switch to sign-in tab
          setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
          setActiveTab("signin");
          toast.error('An account with this email already exists. Please sign in instead.', {
            duration: 5000,
            action: {
              label: 'Sign In',
              onClick: () => setActiveTab("signin")
            }
          });
        } else if (error.message.includes('Password should be at least 6 characters')) {
          toast.error('Password must be at least 6 characters long');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Account created! Please check your email for confirmation. After verifying your email, you\'ll need to accept our terms and conditions.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-4">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
              <img 
                src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
                alt="Arriv Logo" 
                className="w-16 h-16 hover:drop-shadow-lg transition-all duration-200"
              />
              <h1 className="text-xl font-bold text-gray-900">Arriv</h1>
            </Link>
          </div>
        </div>
      </nav>

      {/* Auth Form */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Welcome to Arriv</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                {isResetMode ? (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Sending reset email...' : 'Send Reset Email'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setIsResetMode(false)}
                    >
                      Back to Sign In
                    </Button>
                  </form>
                 ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-muted-foreground hover:text-primary"
                        onClick={() => setIsResetMode(true)}
                      >
                        Forgot your password?
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
              
              <TabsContent value="signup">
                <SecurityEnhancedForm onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number *</Label>
                    <Input
                      id="signup-phone"
                      name="phone"
                      type="tel"
                      placeholder="(555) 555-5555"
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-sm text-muted-foreground">Required for booking notifications and contact</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
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
                    {/* Password strength indicator */}
                    {formData.password && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Password Requirements:</div>
                        <div className="space-y-1">
                          {[
                            { check: formData.password.length >= 8, text: 'At least 8 characters' },
                            { check: /[A-Z]/.test(formData.password), text: 'One uppercase letter' },
                            { check: /[a-z]/.test(formData.password), text: 'One lowercase letter' },
                            { check: /\d/.test(formData.password), text: 'One number' },
                            
                          ].map((req, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              {req.check ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span className={req.check ? 'text-green-700' : 'text-red-700'}>{req.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || !passwordValidation.isValid || formData.password !== formData.confirmPassword}
                    >
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </SecurityEnhancedForm>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;