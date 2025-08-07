import { useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle, CreditCard, DollarSign } from "lucide-react";

interface PaymentSuccessNotificationProps {
  amount: number;
  paymentMethod: string;
  bookingId: string;
}

export const PaymentSuccessNotification = ({ amount, paymentMethod, bookingId }: PaymentSuccessNotificationProps) => {
  useEffect(() => {
    const getPaymentMethodIcon = () => {
      switch (paymentMethod) {
        case "paypal": return "💳";
        case "apple_pay": return "🍎";
        default: return "💳";
      }
    };

    const getPaymentMethodName = () => {
      switch (paymentMethod) {
        case "paypal": return "PayPal";
        case "apple_pay": return "Apple Pay";
        default: return "Credit Card";
      }
    };

    // Show success toast with payment method details
    toast.success(
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <div>
          <p className="font-medium">Payment Successful!</p>
          <p className="text-sm text-muted-foreground">
            {getPaymentMethodIcon()} Paid ${amount.toFixed(2)} via {getPaymentMethodName()}
          </p>
          <p className="text-xs text-muted-foreground">
            Booking ID: {bookingId}
          </p>
        </div>
      </div>,
      {
        duration: 5000,
      }
    );
  }, [amount, paymentMethod, bookingId]);

  return null;
};

export default PaymentSuccessNotification;