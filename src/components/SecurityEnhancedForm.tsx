import React, { useEffect, useState } from 'react';
import { useSecurityHeaders } from '@/hooks/useSecurityHeaders';
import { useInputValidation } from '@/hooks/useInputValidation';

interface SecurityEnhancedFormProps {
  children: React.ReactNode;
  onSubmit: (data: FormData, csrfToken: string) => void;
  className?: string;
}

export const SecurityEnhancedForm: React.FC<SecurityEnhancedFormProps> = ({
  children,
  onSubmit,
  className = ''
}) => {
  const { getCSRFToken, validateOrigin } = useSecurityHeaders();
  const { sanitizeText } = useInputValidation();
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    setCsrfToken(getCSRFToken());
  }, [getCSRFToken]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate origin
    if (!validateOrigin(window.location.origin)) {
      console.error('Invalid origin detected');
      return;
    }

    const formData = new FormData(e.currentTarget);
    
    // Sanitize all text inputs
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        formData.set(key, sanitizeText(value));
      }
    }

    onSubmit(formData, csrfToken);
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      {children}
    </form>
  );
};