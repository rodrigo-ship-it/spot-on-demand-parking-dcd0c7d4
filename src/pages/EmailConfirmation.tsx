import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react';

const EmailConfirmation = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-4">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
              <img 
                src="/lovable-uploads/settld-logo-with-text.png" 
                alt="Settld Logo" 
                className="h-14 w-auto hover:drop-shadow-lg transition-all duration-200"
              />
            </Link>
          </div>
        </div>
      </nav>

      {/* Confirmation Message */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <Card className="w-full max-w-md shadow-xl border-0 text-center">
          <CardHeader className="space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-base">
              We've sent a confirmation link to your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 text-muted-foreground">
              <p>Please click the link in the email to verify your account.</p>
              <p className="text-sm">Once confirmed, refresh this page to continue.</p>
            </div>
            
            <div className="space-y-3">
              <Button onClick={handleRefresh} className="w-full" variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                I've Confirmed - Refresh Page
              </Button>
              
              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground">
              Didn't receive the email? Check your spam folder or try signing up again.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailConfirmation;
