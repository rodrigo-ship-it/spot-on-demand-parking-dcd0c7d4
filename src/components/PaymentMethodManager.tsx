import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentMethod {
  id: string;
  type: string;
  lastFour: string;
  expiry: string;
  isDefault: boolean;
}

interface PaymentMethodManagerProps {
  paymentMethods: PaymentMethod[];
  onPaymentMethodChange: (methodId: string) => void;
  selectedMethodId?: string;
}

export const PaymentMethodManager = ({ paymentMethods: initialMethods, onPaymentMethodChange, selectedMethodId }: PaymentMethodManagerProps) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialMethods);
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newMethod, setNewMethod] = useState({
    type: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    name: ""
  });

  const addPaymentMethod = () => {
    if (!newMethod.type || !newMethod.cardNumber || !newMethod.expiry || !newMethod.cvv) {
      toast.error("Please fill in all required fields");
      return;
    }

    const method: PaymentMethod = {
      id: Date.now().toString(),
      type: newMethod.type,
      lastFour: newMethod.cardNumber.slice(-4),
      expiry: newMethod.expiry,
      isDefault: paymentMethods.length === 0
    };

    setPaymentMethods([...paymentMethods, method]);
    setNewMethod({ type: "", cardNumber: "", expiry: "", cvv: "", name: "" });
    setIsAddingMethod(false);
    toast.success("Payment method added successfully");
  };

  const removePaymentMethod = (methodId: string) => {
    const methodToRemove = paymentMethods.find(m => m.id === methodId);
    if (methodToRemove?.isDefault && paymentMethods.length > 1) {
      toast.error("Cannot remove default payment method. Set another method as default first.");
      return;
    }
    
    setPaymentMethods(paymentMethods.filter(m => m.id !== methodId));
    toast.success("Payment method removed successfully");
  };

  const setAsDefault = (methodId: string) => {
    setPaymentMethods(paymentMethods.map(m => ({ ...m, isDefault: m.id === methodId })));
    toast.success("Default payment method updated");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Methods
          </span>
          <Dialog open={isAddingMethod} onOpenChange={setIsAddingMethod}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>
                  Add a new payment method for booking parking spots.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Card Type</Label>
                  <Select value={newMethod.type} onValueChange={(value) => setNewMethod({ ...newMethod, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select card type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Visa">Visa</SelectItem>
                      <SelectItem value="Mastercard">Mastercard</SelectItem>
                      <SelectItem value="American Express">American Express</SelectItem>
                      <SelectItem value="Discover">Discover</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    value={newMethod.cardNumber}
                    onChange={(e) => setNewMethod({ ...newMethod, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                    placeholder="1234 5678 9012 3456"
                    maxLength={16}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      value={newMethod.expiry}
                      onChange={(e) => setNewMethod({ ...newMethod, expiry: e.target.value })}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      type="text"
                      value={newMethod.cvv}
                      onChange={(e) => setNewMethod({ ...newMethod, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="name">Cardholder Name</Label>
                  <Input
                    id="name"
                    value={newMethod.name}
                    onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddingMethod(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addPaymentMethod}>Add Payment Method</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`p-3 rounded border cursor-pointer transition-colors ${
              selectedMethodId === method.id
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onPaymentMethodChange(method.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <div className="font-medium">
                    {method.type} ****{method.lastFour}
                    {method.isDefault && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Expires {method.expiry}</div>
                </div>
              </div>
              <div className="flex space-x-1">
                {!method.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAsDefault(method.id);
                    }}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePaymentMethod(method.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {paymentMethods.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No payment methods added yet. Add your first payment method to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};