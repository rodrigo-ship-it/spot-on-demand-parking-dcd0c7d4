import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const EmailVerification = () => {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user?.email_confirmed_at) {
      setIsVerified(true);
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      });

      if (error) throw error;

      toast.success("Verification email sent! Check your inbox.");
      setCooldown(60); // 1 minute cooldown
    } catch (error: any) {
      console.error('Error resending verification:', error);
      toast.error(error.message || "Failed to send verification email");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Your email has been verified successfully!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg text-orange-800">Email Verification Required</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-orange-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-orange-800">
              Please verify your email address to access all features. Check your inbox for the verification link.
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Email: {user?.email}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendVerification}
            disabled={isLoading || cooldown > 0}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
          </Button>
        </div>

        <Alert className="bg-orange-100 border-orange-200">
          <AlertDescription className="text-xs text-orange-700">
            <strong>Note:</strong> Some features may be limited until your email is verified. 
            Check your spam folder if you don't see the email.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};