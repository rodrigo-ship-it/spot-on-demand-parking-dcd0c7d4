import { supabase } from '@/integrations/supabase/client';
import { securityMonitor } from './securityMonitoring';

/**
 * Data protection and privacy compliance utilities
 * Includes GDPR compliance, data encryption, and privacy controls
 */

interface UserDataExport {
  profile: any;
  bookings: any[];
  vehicles: any[];
  paymentMethods: any[];
  reviews: any[];
  securityLogs: any[];
  exportedAt: string;
}

interface DataRetentionPolicy {
  tableName: string;
  retentionDays: number;
  softDelete: boolean;
}

class DataProtectionService {
  private readonly DATA_RETENTION_POLICIES: DataRetentionPolicy[] = [
    { tableName: 'security_audit_log', retentionDays: 90, softDelete: false },
    { tableName: 'bookings', retentionDays: 1095, softDelete: true }, // 3 years
    { tableName: 'payment_methods', retentionDays: 2555, softDelete: true }, // 7 years (financial records)
    { tableName: 'reviews', retentionDays: 1825, softDelete: true }, // 5 years
  ];

  /**
   * Export all user data for GDPR compliance
   */
  async exportUserData(userId: string): Promise<UserDataExport | null> {
    try {
      await securityMonitor.logSecurityEvent({
        type: 'data_export_requested',
        severity: 'medium',
        data: { requestedBy: userId },
        userId
      });

      // Fetch all user data
      const [profile, bookings, vehicles, paymentMethods, reviews, securityLogs] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserBookings(userId),
        this.getUserVehicles(userId),
        this.getUserPaymentMethods(userId),
        this.getUserReviews(userId),
        this.getUserSecurityLogs(userId)
      ]);

      const exportData: UserDataExport = {
        profile,
        bookings: bookings || [],
        vehicles: vehicles || [],
        paymentMethods: this.sanitizePaymentMethods(paymentMethods || []),
        reviews: reviews || [],
        securityLogs: securityLogs || [],
        exportedAt: new Date().toISOString()
      };

      await securityMonitor.logSecurityEvent({
        type: 'data_export_completed',
        severity: 'medium',
        data: { 
          recordCount: this.getTotalRecordCount(exportData),
          exportSize: JSON.stringify(exportData).length 
        },
        userId
      });

      return exportData;
    } catch (error) {
      console.error('Failed to export user data:', error);
      await securityMonitor.logSecurityEvent({
        type: 'data_export_failed',
        severity: 'high',
        data: { error: error.message },
        userId
      });
      return null;
    }
  }

  /**
   * Delete all user data (GDPR right to be forgotten)
   */
  async deleteUserData(userId: string): Promise<boolean> {
    try {
      await securityMonitor.logSecurityEvent({
        type: 'data_deletion_requested',
        severity: 'high',
        data: { requestedBy: userId },
        userId
      });

      // Delete user data in the correct order (respecting foreign keys)
      let deletedRecords = 0;
      
      // Delete reviews
      const { count: reviewsCount } = await supabase
        .from('reviews')
        .delete()
        .or(`reviewer_id.eq.${userId},reviewed_id.eq.${userId}`);
      deletedRecords += reviewsCount || 0;

      // Delete disputes
      const { count: disputesCount } = await supabase
        .from('disputes')
        .delete()
        .eq('reporter_id', userId);
      deletedRecords += disputesCount || 0;

      // Delete bookings
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .delete()
        .eq('renter_id', userId);
      deletedRecords += bookingsCount || 0;

      // Delete penalties
      const { count: penaltiesCount } = await supabase
        .from('penalties')
        .delete()
        .eq('user_id', userId);
      deletedRecords += penaltiesCount || 0;

      // Delete payment methods
      const { count: paymentCount } = await supabase
        .from('payment_methods')
        .delete()
        .eq('user_id', userId);
      deletedRecords += paymentCount || 0;

      // Delete payout settings
      const { count: payoutCount } = await supabase
        .from('payout_settings')
        .delete()
        .eq('user_id', userId);
      deletedRecords += payoutCount || 0;

      // Delete notification subscriptions
      const { count: subscriptionsCount } = await supabase
        .from('notification_subscriptions')
        .delete()
        .eq('user_id', userId);
      deletedRecords += subscriptionsCount || 0;

      // Delete notification preferences
      const { count: preferencesCount } = await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', userId);
      deletedRecords += preferencesCount || 0;

      // Delete vehicles
      const { count: vehiclesCount } = await supabase
        .from('vehicles')
        .delete()
        .eq('user_id', userId);
      deletedRecords += vehiclesCount || 0;

      // Delete parking spots
      const { count: spotsCount } = await supabase
        .from('parking_spots')
        .delete()
        .eq('owner_id', userId);
      deletedRecords += spotsCount || 0;

      // Delete profile
      const { count: profileCount } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      deletedRecords += profileCount || 0;

      // Delete security logs
      const { count: logsCount } = await supabase
        .from('security_audit_log')
        .delete()
        .eq('user_id', userId);
      deletedRecords += logsCount || 0;

      await securityMonitor.logSecurityEvent({
        type: 'data_deletion_completed',
        severity: 'high',
        data: { 
          deletedRecords,
          deletedBy: userId 
        },
        userId
      });

      return true;
    } catch (error) {
      console.error('Failed to delete user data:', error);
      await securityMonitor.logSecurityEvent({
        type: 'data_deletion_failed',
        severity: 'critical',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        userId
      });
      return false;
    }
  }

  /**
   * Encrypt sensitive data fields
   */
  encryptSensitiveData(data: any, fields: string[]): any {
    const encrypted = { ...data };
    
    fields.forEach(field => {
      if (encrypted[field]) {
        // Simple base64 encoding for demo - use proper encryption in production
        encrypted[field] = btoa(encrypted[field]);
        encrypted[`${field}_encrypted`] = true;
      }
    });
    
    return encrypted;
  }

  /**
   * Decrypt sensitive data fields
   */
  decryptSensitiveData(data: any, fields: string[]): any {
    const decrypted = { ...data };
    
    fields.forEach(field => {
      if (decrypted[field] && decrypted[`${field}_encrypted`]) {
        try {
          decrypted[field] = atob(decrypted[field]);
          delete decrypted[`${field}_encrypted`];
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
        }
      }
    });
    
    return decrypted;
  }

  /**
   * Apply data retention policies
   */
  async applyDataRetentionPolicies(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days for security logs

      // Only apply to security_audit_log for now (hard delete)
      await supabase
        .from('security_audit_log')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      await securityMonitor.logSecurityEvent({
        type: 'data_retention_applied',
        severity: 'low',
        data: { appliedTo: 'security_audit_log' }
      });
    } catch (error) {
      console.error('Failed to apply data retention policies:', error);
      await securityMonitor.logSecurityEvent({
        type: 'data_retention_failed',
        severity: 'medium',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  // Private helper methods
  private async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }

  private async getUserBookings(userId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('renter_id', userId);
    
    if (error) throw error;
    return data;
  }

  private async getUserVehicles(userId: string) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  }

  private async getUserPaymentMethods(userId: string) {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  }

  private async getUserReviews(userId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .or(`reviewer_id.eq.${userId},reviewed_id.eq.${userId}`);
    
    if (error) throw error;
    return data;
  }

  private async getUserSecurityLogs(userId: string) {
    const { data, error } = await supabase
      .from('security_audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to last 100 entries
    
    if (error) throw error;
    return data;
  }

  private sanitizePaymentMethods(paymentMethods: any[]): any[] {
    return paymentMethods.map(pm => ({
      ...pm,
      stripe_payment_method_id: '***redacted***'
    }));
  }

  private getTotalRecordCount(exportData: UserDataExport): number {
    return (
      (exportData.profile ? 1 : 0) +
      exportData.bookings.length +
      exportData.vehicles.length +
      exportData.paymentMethods.length +
      exportData.reviews.length +
      exportData.securityLogs.length
    );
  }
}

export const dataProtectionService = new DataProtectionService();

// Utility functions for common data protection tasks
export const maskSensitiveInfo = (info: string, visibleChars: number = 4): string => {
  if (!info || info.length <= visibleChars) return '***';
  return info.substring(0, visibleChars) + '*'.repeat(info.length - visibleChars);
};

export const validateDataRetention = (createdAt: string, retentionDays: number): boolean => {
  const createdDate = new Date(createdAt);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  return createdDate > cutoffDate;
};

export const sanitizeForLogging = (data: any): any => {
  const sanitized = { ...data };
  
  // Remove or mask sensitive fields
  const sensitiveFields = ['password', 'token', 'key', 'secret', 'card_number', 'cvv'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***masked***';
    }
  });
  
  return sanitized;
};