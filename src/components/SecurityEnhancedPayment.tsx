import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SecurityEnhancedPaymentProps {
  stripeAccountId: string;
  operation: string;
  children: React.ReactNode;
}

export const SecurityEnhancedPayment: React.FC<SecurityEnhancedPaymentProps> = ({
  stripeAccountId,
  operation,
  children
}) => {
  const { user } = useAuth();
  
  const validateAndProceed = async () => {
    if (!user) {
      toast.error('Authentication required');
      return false;
    }

    try {
      // Validate Stripe account ownership before proceeding
      const { data, error } = await supabase.functions.invoke('validate-stripe-access', {
        body: { 
          stripeAccountId,
          operation 
        }
      });

      if (error) {
        console.error('Stripe validation error:', error);
        toast.error('Payment validation failed');
        return false;
      }

      if (!data?.valid) {
        toast.error(data?.reason || 'Unauthorized payment access');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Payment validation error:', error);
      toast.error('Payment validation failed');
      return false;
    }
  };

  return (
    <div className="secure-payment-wrapper">
      {React.cloneElement(children as React.ReactElement, {
        onClick: async (e: React.MouseEvent) => {
          e.preventDefault();
          const isValid = await validateAndProceed();
          if (isValid) {
            // Proceed with original action
            const originalOnClick = (children as React.ReactElement).props.onClick;
            if (originalOnClick) {
              originalOnClick(e);
            }
          }
        }
      })}
    </div>
  );
};