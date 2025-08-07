import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Edit, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentMethod {
  id: string;
  type: string;
  last_four: string;
  expiry_month: number;
  expiry_year: number;
  cardholder_name: string;
  is_default: boolean;
  stripe_payment_method_id?: string;
}

interface PaymentMethodDialogProps {
  onPaymentMethodSelect?: (method: PaymentMethod) => void;
  selectedMethod?: PaymentMethod | null;
  children: React.ReactNode;
}

export const PaymentMethodDialog = ({ onPaymentMethodSelect, selectedMethod, children }: PaymentMethodDialogProps) => {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  
  const [formData, setFormData] = useState({
    type: "visa",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cardholderName: "",
    cvv: "",
    isDefault: false
  });

  useEffect(() => {
    if (open && user) {
      loadPaymentMethods();
    }
  }, [open, user]);

  const loadPaymentMethods = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setMethods(data || []);
    } catch (error: any) {
      toast.error('Failed to load payment methods');
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMethod = async () => {
    if (!user) return;

    if (!formData.cardNumber || !formData.expiryMonth || !formData.expiryYear || !formData.cardholderName) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Basic validation
    if (formData.cardNumber.replace(/\s/g, '').length < 13) {
      toast.error('Please enter a valid card number');
      return;
    }

    setLoading(true);
    try {
      const lastFour = formData.cardNumber.replace(/\s/g, '').slice(-4);
      
      const methodData = {
        user_id: user.id,
        type: formData.type,
        last_four: lastFour,
        expiry_month: parseInt(formData.expiryMonth),
        expiry_year: parseInt(formData.expiryYear),
        cardholder_name: formData.cardholderName,
        is_default: formData.isDefault
      };

      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update(methodData)
          .eq('id', editingMethod.id);
        
        if (error) throw error;
        toast.success('Payment method updated successfully');
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert([methodData]);
        
        if (error) throw error;
        toast.success('Payment method added successfully');
      }

      await loadPaymentMethods();
      resetForm();
    } catch (error: any) {
      toast.error(editingMethod ? 'Failed to update payment method' : 'Failed to add payment method');
      console.error('Error saving payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) throw error;
      
      toast.success('Payment method deleted successfully');
      await loadPaymentMethods();
    } catch (error: any) {
      toast.error('Failed to delete payment method');
      console.error('Error deleting payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // First, unset all defaults
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (error) throw error;
      
      toast.success('Default payment method updated');
      await loadPaymentMethods();
    } catch (error: any) {
      toast.error('Failed to set default payment method');
      console.error('Error setting default payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "visa",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cardholderName: "",
      cvv: "",
      isDefault: false
    });
    setEditingMethod(null);
  };

  const startEdit = (method: PaymentMethod) => {
    setFormData({
      type: method.type,
      cardNumber: `**** **** **** ${method.last_four}`,
      expiryMonth: method.expiry_month.toString(),
      expiryYear: method.expiry_year.toString(),
      cardholderName: method.cardholder_name,
      cvv: "",
      isDefault: method.is_default
    });
    setEditingMethod(method);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const getCardIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'amex': return '💳';
      default: return '💳';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Methods
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods List */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Your Payment Methods</h3>
            <div className="space-y-3">
              {methods.map((method) => (
                <Card key={method.id} className={`cursor-pointer transition-all ${selectedMethod?.id === method.id ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1"
                        onClick={() => onPaymentMethodSelect?.(method)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span>{getCardIcon(method.type)}</span>
                          <h4 className="font-medium">
                            {method.type.charAt(0).toUpperCase() + method.type.slice(1)} •••• {method.last_four}
                          </h4>
                          {method.is_default && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                          {selectedMethod?.id === method.id && (
                            <Badge variant="secondary" className="text-xs">Selected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {method.cardholder_name} • Expires {String(method.expiry_month).padStart(2, '0')}/{method.expiry_year}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!method.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(method.id)}
                            disabled={loading}
                            title="Set as default"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(method)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMethod(method.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {methods.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payment methods added yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Add/Edit Payment Method Form */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {editingMethod ? 'Edit Payment Method' : 'Add New Payment Method'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Card Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({...formData, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                    <SelectItem value="amex">American Express</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cardNumber">Card Number *</Label>
                <Input
                  id="cardNumber"
                  value={formData.cardNumber}
                  onChange={(e) => setFormData({...formData, cardNumber: formatCardNumber(e.target.value)})}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="expiryMonth">Month *</Label>
                  <Select 
                    value={formData.expiryMonth} 
                    onValueChange={(value) => setFormData({...formData, expiryMonth: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                        <SelectItem key={month} value={month.toString()}>
                          {String(month).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="expiryYear">Year *</Label>
                  <Select 
                    value={formData.expiryYear} 
                    onValueChange={(value) => setFormData({...formData, expiryYear: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="YYYY" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 10}, (_, i) => new Date().getFullYear() + i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="cvv">CVV *</Label>
                  <Input
                    id="cvv"
                    value={formData.cvv}
                    onChange={(e) => setFormData({...formData, cvv: e.target.value.replace(/[^0-9]/g, '')})}
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cardholderName">Cardholder Name *</Label>
                <Input
                  id="cardholderName"
                  value={formData.cardholderName}
                  onChange={(e) => setFormData({...formData, cardholderName: e.target.value})}
                  placeholder="John Doe"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="isDefault">Set as default payment method</Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveMethod} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Saving...' : editingMethod ? 'Update Method' : 'Add Method'}
                </Button>
                
                {editingMethod && (
                  <Button 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};