/**
 * Secure data access functions for sensitive information
 */

import { supabase } from "@/integrations/supabase/client";
import { decryptPaymentMethodData, decryptBankAccountData, maskCardNumber, maskBankAccount } from "./dataEncryption";

// Rate limiting for sensitive data access
const accessAttempts = new Map<string, number[]>();

export const checkAccessRate = (userId: string, maxAttempts: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!accessAttempts.has(userId)) {
    accessAttempts.set(userId, []);
  }
  
  const attempts = accessAttempts.get(userId)!;
  const recentAttempts = attempts.filter(time => time > windowStart);
  
  if (recentAttempts.length >= maxAttempts) {
    return false;
  }
  
  recentAttempts.push(now);
  accessAttempts.set(userId, recentAttempts);
  return true;
};

// Secure payment method access with masking
export const getSecurePaymentMethods = async (userId: string, fullAccess: boolean = false) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user || user.user.id !== userId) {
    throw new Error('Unauthorized access to payment methods');
  }
  
  if (!checkAccessRate(userId)) {
    throw new Error('Rate limit exceeded for sensitive data access');
  }
  
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;
  
  return data?.map(method => {
    if (fullAccess) {
      return decryptPaymentMethodData(method);
    } else {
      // Return masked data for display
      return {
        ...method,
        last_four: method.last_four ? maskCardNumber(method.last_four) : null,
        cardholder_name: method.cardholder_name ? '****' : null
      };
    }
  }) || [];
};

// Secure bank account access with masking
export const getSecureBankAccounts = async (userId: string, fullAccess: boolean = false) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user || user.user.id !== userId) {
    throw new Error('Unauthorized access to bank account data');
  }
  
  if (!checkAccessRate(userId)) {
    throw new Error('Rate limit exceeded for sensitive data access');
  }
  
  const { data, error } = await supabase
    .from('payout_settings')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;
  
  return data?.map(account => {
    if (fullAccess) {
      return decryptBankAccountData(account);
    } else {
      // Return masked data for display
      return {
        ...account,
        account_number_last_four: account.account_number_last_four ? maskBankAccount(account.account_number_last_four) : null,
        routing_number: '****',
        account_holder_name: '****'
      };
    }
  }) || [];
};

// Secure license plate access with masking
export const maskLicensePlate = (plate: string): string => {
  if (!plate || plate.length < 3) return '***';
  return plate.substring(0, 2) + '***' + plate.slice(-1);
};

// Audit sensitive data access
export const auditDataAccess = async (userId: string, dataType: string, action: string) => {
  try {
    await supabase.rpc('log_security_event_enhanced', {
      p_event_type: 'data_access',
      p_event_data: {
        user_id: userId,
        data_type: dataType,
        action: action,
        timestamp: new Date().toISOString()
      },
      p_user_id: userId,
      p_severity: 'info'
    });
  } catch (error) {
    console.error('Failed to audit data access:', error);
  }
};

// Validate user permissions for data access
export const validateDataAccess = async (userId: string, resourceId: string, resourceType: string): Promise<boolean> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user || user.user.id !== userId) {
    return false;
  }
  
  // Additional validation based on resource type
  switch (resourceType) {
    case 'payment_method':
      const { data: paymentMethod } = await supabase
        .from('payment_methods')
        .select('user_id')
        .eq('id', resourceId)
        .single();
      return paymentMethod?.user_id === userId;
      
    case 'booking':
      const { data: booking } = await supabase
        .from('bookings')
        .select('renter_id, parking_spots!inner(owner_id)')
        .eq('id', resourceId)
        .single();
      return booking?.renter_id === userId || booking?.parking_spots?.owner_id === userId;
      
    case 'vehicle':
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('user_id')
        .eq('id', resourceId)
        .single();
      return vehicle?.user_id === userId;
      
    default:
      return false;
  }
};