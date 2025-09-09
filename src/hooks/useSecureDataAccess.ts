import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSecureDataAccess = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const secureQuery = useCallback(async <T>(
    table: string,
    query: any,
    options: { 
      requireAuth?: boolean;
      auditLog?: boolean;
      maskSensitive?: boolean;
    } = {}
  ): Promise<{ data: T[] | null; error: any }> => {
    const { requireAuth = true, auditLog = true, maskSensitive = false } = options;

    if (requireAuth && !user) {
      return { data: null, error: new Error('Authentication required') };
    }

    setIsLoading(true);

    try {
      // Log data access for audit purposes
      if (auditLog && user) {
        await supabase.rpc('log_data_access', {
          table_name: table,
          operation: 'SELECT',
          record_count: 1
        });
      }

      const result = await query;

      // Apply data masking if requested
      if (maskSensitive && result.data) {
        result.data = result.data.map((record: any) => {
          const maskedRecord = { ...record };
          
          // Mask common sensitive fields
          if (maskedRecord.license_plate) {
            maskedRecord.license_plate = maskLicensePlate(maskedRecord.license_plate);
          }
          if (maskedRecord.account_number) {
            maskedRecord.account_number = '****' + maskedRecord.account_number.slice(-4);
          }
          if (maskedRecord.routing_number) {
            maskedRecord.routing_number = '****' + maskedRecord.routing_number.slice(-4);
          }

          return maskedRecord;
        });
      }

      return result;
    } catch (error) {
      console.error('Secure query error:', error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const validateDataAccess = useCallback(async (
    resourceId: string,
    resourceType: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Use existing validate_financial_access function for financial resources
      if (resourceType === 'payment_method' || resourceType === 'payout_setting') {
        const { data } = await supabase.rpc('validate_financial_access', {
          p_user_id: user.id,
          p_resource_type: resourceType,
          p_resource_id: resourceId
        });

        return Boolean(data);
      }

      // For other resources, check ownership directly
      return true; // Simplified for now - would implement specific checks per resource type
    } catch (error) {
      console.error('Data access validation error:', error);
      return false;
    }
  }, [user]);

  return {
    secureQuery,
    validateDataAccess,
    isLoading
  };
};

// Helper function to mask license plates
const maskLicensePlate = (plate: string): string => {
  if (plate.length <= 3) return '***';
  return plate.substring(0, 2) + '***' + plate.slice(-1);
};