/**
 * Data encryption utilities for sensitive information
 */

// Simple encryption for demonstration - in production, use proper encryption libraries
export const encryptData = (data: string, key?: string): string => {
  if (!data) return '';
  
  // Base64 encoding with simple obfuscation
  // In production, use proper encryption like AES-256
  const encoded = btoa(data);
  return `enc_${encoded}`;
};

export const decryptData = (encryptedData: string, key?: string): string => {
  if (!encryptedData || !encryptedData.startsWith('enc_')) return encryptedData;
  
  try {
    const encoded = encryptedData.replace('enc_', '');
    return atob(encoded);
  } catch {
    return '';
  }
};

// Mask sensitive data for display
export const maskCardNumber = (cardNumber: string): string => {
  if (!cardNumber || cardNumber.length < 4) return '****';
  return '****-****-****-' + cardNumber.slice(-4);
};

export const maskBankAccount = (accountNumber: string): string => {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return '****' + accountNumber.slice(-4);
};

export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return '****@****';
  const [local, domain] = email.split('@');
  return `${local.charAt(0)}***@${domain}`;
};

export const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 4) return '***-***-****';
  return '***-***-' + phone.slice(-4);
};

// Validate if data appears to be encrypted
export const isEncrypted = (data: string): boolean => {
  return data && data.startsWith('enc_');
};

// Secure field handling for payment methods
export const securePaymentMethodData = (data: any) => {
  if (!data) return data;
  
  return {
    ...data,
    // Encrypt sensitive fields
    last_four: data.last_four ? encryptData(data.last_four) : null,
    cardholder_name: data.cardholder_name ? encryptData(data.cardholder_name) : null,
    // Keep non-sensitive fields as-is
    type: data.type,
    expiry_month: data.expiry_month,
    expiry_year: data.expiry_year,
    is_default: data.is_default
  };
};

// Decrypt payment method data for authorized viewing
export const decryptPaymentMethodData = (data: any) => {
  if (!data) return data;
  
  return {
    ...data,
    last_four: data.last_four ? decryptData(data.last_four) : null,
    cardholder_name: data.cardholder_name ? decryptData(data.cardholder_name) : null
  };
};

// Secure bank account data
export const secureBankAccountData = (data: any) => {
  if (!data) return data;
  
  return {
    ...data,
    account_number_last_four: data.account_number_last_four ? encryptData(data.account_number_last_four) : null,
    routing_number: data.routing_number ? encryptData(data.routing_number) : null,
    account_holder_name: data.account_holder_name ? encryptData(data.account_holder_name) : null,
    bank_name: data.bank_name
  };
};

// Decrypt bank account data for authorized viewing
export const decryptBankAccountData = (data: any) => {
  if (!data) return data;
  
  return {
    ...data,
    account_number_last_four: data.account_number_last_four ? decryptData(data.account_number_last_four) : null,
    routing_number: data.routing_number ? decryptData(data.routing_number) : null,
    account_holder_name: data.account_holder_name ? decryptData(data.account_holder_name) : null
  };
};
