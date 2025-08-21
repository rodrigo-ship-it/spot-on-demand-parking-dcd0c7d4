import { useMemo } from 'react';
import { sanitizeInput, sanitizeCSVInput, validateEmail, validatePhone, validatePassword } from '@/lib/security';

export const useInputValidation = () => {
  const validation = useMemo(() => ({
    // Text input sanitization
    sanitizeText: (input: string): string => {
      return sanitizeInput(input);
    },

    // CSV-safe sanitization for exports
    sanitizeCSV: (input: string): string => {
      return sanitizeCSVInput(input);
    },

    // Email validation
    validateEmail: (email: string): boolean => {
      return validateEmail(email);
    },

    // Phone validation
    validatePhone: (phone: string): boolean => {
      return validatePhone(phone);
    },

    // Password validation with detailed feedback
    validatePassword: (password: string) => {
      return validatePassword(password);
    },

    // URL validation
    validateURL: (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },

    // Alphanumeric validation
    validateAlphanumeric: (input: string): boolean => {
      return /^[a-zA-Z0-9]+$/.test(input);
    },

    // File upload validation
    validateFileUpload: (file: File, options: {
      maxSize?: number;
      allowedTypes?: string[];
    } = {}): { valid: boolean; error?: string } => {
      const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/gif'] } = options;

      if (file.size > maxSize) {
        return { valid: false, error: `File size must be less than ${maxSize / 1024 / 1024}MB` };
      }

      if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: `File type must be one of: ${allowedTypes.join(', ')}` };
      }

      return { valid: true };
    },

    // License plate validation
    validateLicensePlate: (plate: string): boolean => {
      const sanitized = plate.replace(/[^A-Z0-9]/g, '');
      return sanitized.length >= 2 && sanitized.length <= 8;
    },

    // Credit card number basic validation (Luhn algorithm)
    validateCreditCard: (number: string): boolean => {
      const cleaned = number.replace(/\D/g, '');
      if (cleaned.length < 13 || cleaned.length > 19) return false;

      let sum = 0;
      let isEven = false;

      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i]);

        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }

        sum += digit;
        isEven = !isEven;
      }

      return sum % 10 === 0;
    },

    // General input length validation
    validateLength: (input: string, min: number, max: number): boolean => {
      return input.length >= min && input.length <= max;
    },

    // Numeric validation
    validateNumeric: (input: string): boolean => {
      return /^\d+$/.test(input);
    },

    // Decimal validation
    validateDecimal: (input: string): boolean => {
      return /^\d+(\.\d{1,2})?$/.test(input);
    }
  }), []);

  return validation;
};