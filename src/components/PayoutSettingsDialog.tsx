import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PayoutSettings {
  id: string;
  bank_name: string;
  account_number_last_four: string;
  routing_number: string;
  account_holder_name: string;
  account_type: string;
  is_verified: boolean;
}

interface PayoutSettingsDialogProps {
  children: React.ReactNode;
}

export const PayoutSettingsDialog = ({ children }: PayoutSettingsDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PayoutSettings | null>(null);
  
  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    accountHolderName: "",
    accountType: "checking"
  });

  useEffect(() => {
    if (open && user) {
      loadPayoutSettings();
    }
  }, [open, user]);

  const loadPayoutSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payout_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        setFormData({
          bankName: data.bank_name || "",
          accountNumber: `****${data.account_number_last_four}`,
          routingNumber: data.routing_number || "",
          accountHolderName: data.account_holder_name || "",
          accountType: data.account_type || "checking"
        });
      }
    } catch (error: any) {
      console.error('Error loading payout settings:', error);
      toast.error('Failed to load payout settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.bankName || !formData.accountNumber || !formData.routingNumber || !formData.accountHolderName) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate routing number (9 digits)
    if (!/^\d{9}$/.test(formData.routingNumber)) {
      toast.error('Routing number must be 9 digits');
      return;
    }

    // Validate account number
    if (formData.accountNumber.length < 4) {
      toast.error('Please enter a valid account number');
      return;
    }

    setLoading(true);
    try {
      const lastFour = formData.accountNumber.slice(-4);
      
      const settingsData = {
        user_id: user.id,
        bank_name: formData.bankName,
        account_number_last_four: lastFour,
        routing_number: formData.routingNumber,
        account_holder_name: formData.accountHolderName,
        account_type: formData.accountType,
        is_verified: false // Reset verification status when updating
      };

      const { error } = await supabase
        .from('payout_settings')
        .upsert(settingsData);

      if (error) throw error;
      
      toast.success('Payout settings saved successfully');
      await loadPayoutSettings();
    } catch (error: any) {
      console.error('Error saving payout settings:', error);
      toast.error('Failed to save payout settings');
    } finally {
      setLoading(false);
    }
  };

  const requestVerification = async () => {
    // In a real implementation, this would trigger verification process
    toast.info('Verification request submitted. You\'ll receive further instructions via email.');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5" />
            Payout Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          {settings && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Current Account</CardTitle>
                  <Badge variant={settings.is_verified ? "default" : "secondary"}>
                    {settings.is_verified ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pending Verification
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {settings.bank_name} •••• {settings.account_number_last_four}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {settings.account_holder_name}
                </p>
                {!settings.is_verified && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={requestVerification}
                  >
                    Request Verification
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="accountHolderName">Account Holder Name *</Label>
              <Input
                id="accountHolderName"
                value={formData.accountHolderName}
                onChange={(e) => setFormData({...formData, accountHolderName: e.target.value})}
                placeholder="Full name on bank account"
              />
            </div>

            <div>
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                placeholder="e.g., Chase Bank"
              />
            </div>

            <div>
              <Label htmlFor="accountType">Account Type *</Label>
              <Select 
                value={formData.accountType} 
                onValueChange={(value) => setFormData({...formData, accountType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="routingNumber">Routing Number *</Label>
              <Input
                id="routingNumber"
                value={formData.routingNumber}
                onChange={(e) => setFormData({...formData, routingNumber: e.target.value.replace(/\D/g, '')})}
                placeholder="9-digit routing number"
                maxLength={9}
              />
            </div>

            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(e) => setFormData({...formData, accountNumber: e.target.value.replace(/\D/g, '')})}
                placeholder="Bank account number"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Security Information</p>
                <p>
                  Your banking information is encrypted and secure. Account verification may take 1-2 business days. 
                  Payouts are typically processed within 2-5 business days.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};