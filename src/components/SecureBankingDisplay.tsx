import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaskedBankingInfo {
  id: string;
  bank_name: string | null;
  account_last_four: string | null;
  account_type: string | null;
  onboarding_completed: boolean;
  payouts_enabled: boolean;
  is_verified: boolean;
}

interface SecureBankingDisplayProps {
  userId?: string;
  showSensitiveData?: boolean;
  adminMode?: boolean;
}

export const SecureBankingDisplay: React.FC<SecureBankingDisplayProps> = ({
  userId,
  showSensitiveData = false,
  adminMode = false
}) => {
  const { user } = useAuth();
  const [bankingInfo, setBankingInfo] = useState<MaskedBankingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchSecureBankingInfo();
    }
  }, [targetUserId, adminMode]);

  const fetchSecureBankingInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the secure masked banking info function
      const { data, error: fetchError } = await supabase
        .rpc('get_masked_banking_info', { 
          p_user_id: targetUserId 
        })
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching banking info:', fetchError);
        setError('Failed to load banking information');
        return;
      }

      setBankingInfo(data);

      // Log the access for security auditing (if viewing own data)
      if (targetUserId === user?.id && !adminMode) {
        await supabase.rpc('log_security_event_enhanced', {
          p_event_type: 'banking_info_view',
          p_event_data: {
            resource_id: data?.id,
            access_type: 'user_self_view',
            timestamp: Date.now()
          },
          p_user_id: user.id,
          p_severity: 'info'
        });
      }
    } catch (err) {
      console.error('Error in fetchSecureBankingInfo:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const logAdminAccess = async (action: string, reason: string = 'Admin dashboard view') => {
    if (adminMode && bankingInfo?.id) {
      try {
        await supabase.rpc('log_admin_banking_access', {
          p_payout_setting_id: bankingInfo.id,
          p_action: action,
          p_reason: reason
        });
      } catch (error) {
        console.error('Error logging admin access:', error);
      }
    }
  };

  const handleViewDetails = () => {
    setShowDetails(!showDetails);
    if (!showDetails && adminMode) {
      logAdminAccess('admin_view_banking_details', 'Admin viewed sensitive banking information');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-4 h-4 animate-pulse" />
            <span>Loading secure banking information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!bankingInfo) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Lock className="w-8 h-8 mx-auto mb-2" />
            <p>No banking information found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-lg">Banking Information</CardTitle>
          </div>
          {showSensitiveData && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDetails}
              className="flex items-center gap-2"
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          )}
        </div>
        <CardDescription>
          Sensitive financial information is encrypted and access is logged for security.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {adminMode && (
          <Alert variant="default" className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Admin Access:</strong> All banking data access is logged for security compliance.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
            <p className="text-sm mt-1">{bankingInfo.bank_name || 'Not provided'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Account Type</label>
            <p className="text-sm mt-1 capitalize">{bankingInfo.account_type || 'Not specified'}</p>
          </div>
          
          {showDetails && showSensitiveData && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account (Last 4)</label>
              <p className="text-sm mt-1 font-mono">
                ****{bankingInfo.account_last_four || 'xxxx'}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
              bankingInfo.is_verified ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <p className="text-xs text-muted-foreground">Verified</p>
          </div>
          
          <div className="text-center">
            <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
              bankingInfo.onboarding_completed ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <p className="text-xs text-muted-foreground">Onboarded</p>
          </div>
          
          <div className="text-center">
            <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
              bankingInfo.payouts_enabled ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <p className="text-xs text-muted-foreground">Payouts</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>All banking information is encrypted and access is monitored for security.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};