// Apple Pay type declarations
declare global {
  interface Window {
    ApplePaySession?: {
      canMakePayments(): boolean;
      new(version: number, paymentRequest: any): any;
    };
  }
}

export const validatePaymentMethod = (paymentMethod: string, cardDetails?: any) => {
  switch (paymentMethod) {
    case "card":
      if (!cardDetails) {
        throw new Error("Card details are required for card payments");
      }
      if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
        throw new Error("Please fill in all card details");
      }
      // Basic card number validation (simplified)
      const cardNumber = cardDetails.number.replace(/\s/g, '');
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        throw new Error("Please enter a valid card number");
      }
      break;
      
    case "paypal":
      // PayPal validation handled by PayPal
      break;
      
    case "apple_pay":
      // Check if Apple Pay is available
      if (!window.ApplePaySession?.canMakePayments()) {
        throw new Error("Apple Pay is not available on this device");
      }
      break;
      
    default:
      throw new Error("Invalid payment method selected");
  }
};

export const getPaymentMethodDisplayName = (paymentMethod: string): string => {
  switch (paymentMethod) {
    case "paypal": return "PayPal";
    case "apple_pay": return "Apple Pay";
    case "card": return "Credit Card";
    default: return "Unknown";
  }
};

export const getPaymentMethodIcon = (paymentMethod: string): string => {
  switch (paymentMethod) {
    case "paypal": return "💳";
    case "apple_pay": return "🍎";
    case "card": return "💳";
    default: return "💳";
  }
};

export const isApplePayAvailable = (): boolean => {
  return !!(window.ApplePaySession?.canMakePayments());
};