import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConnectStatus {
  connected: boolean;
  onboarding_completed: boolean;
  payouts_enabled: boolean;
  account_id?: string;
}

export const StripeConnectOnboarding = () => {
  const [status, setStatus] = useState<ConnectStatus>({
    connected: false,
    onboarding_completed: false,
    payouts_enabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkStatus = async () => {
    try {
      console.log('🔍 Checking Stripe Connect status...');
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      console.log('✅ Status check response:', { data, error });
      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error('❌ Error checking status:', error);
      toast.error('Failed to check payout status');
    } finally {
      setChecking(false);
    }
  };

  const createConnectAccount = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) throw error;
      
      // Redirect to Stripe onboarding
      window.open(data.onboarding_url, '_blank');
      toast.success('Redirecting to Stripe onboarding...');
    } catch (error) {
      console.error('Error creating Connect account:', error);
      toast.error('Failed to create payout account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Check for onboarding completion on page load
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('onboarding') === 'complete') {
      setTimeout(() => {
        checkStatus();
        toast.success('Payout setup completed! You can now receive payments.');
      }, 1000);
    }
  }, []);

  if (checking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Payout Setup
          {status.payouts_enabled ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Setup Required
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Set up your payout account to receive instant payments when your parking spots are booked.
          We take a small percentage as our platform fee.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Account Created</span>
            {status.connected ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span>Onboarding Completed</span>
            {status.onboarding_completed ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span>Payouts Enabled</span>
            {status.payouts_enabled ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
          </div>
        </div>

        <div className="pt-4 space-y-2">
          {!status.connected ? (
            <Button onClick={createConnectAccount} disabled={loading} className="w-full">
              {loading ? 'Creating Account...' : 'Set Up Payouts'}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          ) : !status.payouts_enabled ? (
            <div className="space-y-2">
              <Button onClick={createConnectAccount} disabled={loading} className="w-full">
                Complete Onboarding
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={checkStatus} variant="outline" className="w-full" disabled={checking}>
                {checking ? 'Checking...' : 'Refresh Status'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Complete your Stripe onboarding to start receiving payments
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Button onClick={checkStatus} variant="outline" className="w-full">
                Refresh Status
              </Button>
              <p className="text-sm text-green-600 text-center font-medium">
                ✅ You're all set! You'll receive instant payouts for bookings.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};