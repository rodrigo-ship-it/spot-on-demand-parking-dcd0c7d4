import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, ExternalLink, Settings } from "lucide-react";
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

  const openConnectPortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-portal');
      if (error) {
        console.error('Connect portal error:', error);
        throw new Error(error.message || 'Failed to create portal link');
      }
      
      if (!data?.url) {
        throw new Error('No portal URL received from server');
      }
      
      window.open(data.url, '_blank');
      toast.success('Opening payout settings...');
    } catch (error) {
      console.error('Error opening Connect portal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to open payout settings: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Check for onboarding completion or updates on page load
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('onboarding') === 'complete') {
      setTimeout(() => {
        checkStatus();
        toast.success('Payout setup completed! You can now receive payments.');
      }, 1000);
    } else if (urlParams.get('updated') === 'true') {
      setTimeout(() => {
        checkStatus();
        toast.success('Payout settings updated successfully!');
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
          {status.connected && status.payouts_enabled ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              {!status.connected ? "Account Required" : "Setup Required"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {!status.connected 
            ? "Create a Stripe Connect account to receive instant payments when your parking spots are booked."
            : "Complete your payout setup to receive instant payments when your parking spots are booked."
          } We take a small percentage of the payment as our platform fee.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Stripe Account Created</span>
            {status.connected ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span>Onboarding Completed</span>
            {status.connected && status.onboarding_completed ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span>Payouts Enabled</span>
            {status.connected && status.payouts_enabled ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
          </div>
        </div>

        <div className="pt-4 space-y-2">
          {!status.connected ? (
            <div className="space-y-2">
              <Button onClick={createConnectAccount} disabled={loading} className="w-full">
                {loading ? 'Creating Account...' : 'Create Stripe Account'}
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                You need to create a Stripe Connect account first to receive payments
              </p>
            </div>
          ) : !status.payouts_enabled ? (
            <div className="space-y-2">
              <Button onClick={openConnectPortal} disabled={loading} className="w-full">
                {loading ? 'Opening...' : 'Complete Account Setup'}
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={checkStatus} variant="outline" className="w-full" disabled={checking}>
                {checking ? 'Checking...' : 'Refresh Status'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {status.onboarding_completed 
                  ? "Account setup complete - waiting for Stripe verification"
                  : "Complete your Stripe onboarding to start receiving payments"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={openConnectPortal} disabled={loading} className="flex-1">
                  {loading ? 'Opening...' : 'Manage Payout Settings'}
                  <Settings className="w-4 h-4 ml-2" />
                </Button>
                <Button onClick={checkStatus} variant="outline" disabled={checking}>
                  {checking ? 'Checking...' : 'Refresh'}
                </Button>
              </div>
              <p className="text-sm text-green-600 text-center font-medium">
                ✅ Ready to receive payouts! Payments will be automatically transferred to your account.
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Use "Manage Payout Settings" to update your bank account, tax info, or payout schedule.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};