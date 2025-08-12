import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { ReactNode } from 'react';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe('pk_test_51QKd9PLgJODPVjyKk7YCgpgzOpv4UgGq3qRCUwJh5k6qr3dq8O8DCxgW2L33L4E8kP4Q0tJG2tGGjwU8QGIEfZLO00dIKcF8FI');

interface StripeProviderProps {
  children: ReactNode;
  clientSecret?: string;
}

export const StripeProvider = ({ children, clientSecret }: StripeProviderProps) => {
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={clientSecret ? options : undefined}>
      {children}
    </Elements>
  );
};