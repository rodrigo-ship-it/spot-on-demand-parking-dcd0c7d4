import { supabase } from '@/integrations/supabase/client';
import { auditLog } from './security';

/**
 * Real-time security monitoring and event tracking
 */

interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  userId?: string;
}

interface SuspiciousActivity {
  userId?: string;
  ipAddress?: string;
  activityType: string;
  count: number;
  timeWindow: number;
  threshold: number;
}

class SecurityMonitor {
  private suspiciousActivities: Map<string, SuspiciousActivity[]> = new Map();
  private readonly RATE_LIMITS = {
    LOGIN_ATTEMPTS: { count: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    API_CALLS: { count: 100, window: 60 * 1000 }, // 100 calls per minute
    FAILED_PAYMENTS: { count: 3, window: 60 * 60 * 1000 }, // 3 failed payments per hour
  };

  /**
   * Log security event to database and monitoring systems
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log to Supabase
      const { error } = await supabase.rpc('log_security_event', {
        p_event_type: event.type,
        p_event_data: event.data,
        p_user_id: event.userId || null
      });

      if (error) {
        console.error('Failed to log security event to database:', error);
      }

      // Log locally for immediate analysis
      auditLog.logSecurityEvent(event.type, {
        ...event.data,
        severity: event.severity,
        timestamp: new Date().toISOString()
      });

      // Check for suspicious patterns
      await this.analyzeSuspiciousActivity(event);

    } catch (error) {
      console.error('Security monitoring error:', error);
    }
  }

  /**
   * Analyze and detect suspicious activity patterns
   */
  private async analyzeSuspiciousActivity(event: SecurityEvent): Promise<void> {
    const key = event.userId || event.data.ipAddress || 'anonymous';
    
    if (!this.suspiciousActivities.has(key)) {
      this.suspiciousActivities.set(key, []);
    }

    const activities = this.suspiciousActivities.get(key)!;
    const now = Date.now();

    // Add current activity
    activities.push({
      userId: event.userId,
      ipAddress: event.data.ipAddress,
      activityType: event.type,
      count: 1,
      timeWindow: now,
      threshold: this.getThresholdForEvent(event.type)
    });

    // Clean old activities outside time window
    const relevantWindow = this.getTimeWindowForEvent(event.type);
    const recentActivities = activities.filter(
      activity => now - activity.timeWindow < relevantWindow
    );
    
    this.suspiciousActivities.set(key, recentActivities);

    // Check if thresholds are exceeded
    const eventCount = recentActivities.filter(
      activity => activity.activityType === event.type
    ).length;

    const threshold = this.getThresholdForEvent(event.type);
    
    if (eventCount >= threshold) {
      await this.handleSuspiciousActivity(key, event.type, eventCount, threshold);
    }
  }

  /**
   * Handle detected suspicious activity
   */
  private async handleSuspiciousActivity(
    key: string, 
    eventType: string, 
    count: number, 
    threshold: number
  ): Promise<void> {
    const alertEvent: SecurityEvent = {
      type: 'suspicious_activity_detected',
      severity: 'high',
      data: {
        key,
        eventType,
        count,
        threshold,
        message: `Suspicious activity detected: ${count} ${eventType} events exceed threshold of ${threshold}`
      }
    };

    await this.logSecurityEvent(alertEvent);

    // In production, you might want to:
    // - Send alerts to security team
    // - Temporarily block IP/user
    // - Require additional verification
  }

  /**
   * Get rate limit threshold for event type
   */
  private getThresholdForEvent(eventType: string): number {
    switch (eventType) {
      case 'login_failed':
      case 'password_reset_requested':
        return this.RATE_LIMITS.LOGIN_ATTEMPTS.count;
      case 'payment_failed':
        return this.RATE_LIMITS.FAILED_PAYMENTS.count;
      case 'api_request':
        return this.RATE_LIMITS.API_CALLS.count;
      default:
        return 10; // Default threshold
    }
  }

  /**
   * Get time window for event type
   */
  private getTimeWindowForEvent(eventType: string): number {
    switch (eventType) {
      case 'login_failed':
      case 'password_reset_requested':
        return this.RATE_LIMITS.LOGIN_ATTEMPTS.window;
      case 'payment_failed':
        return this.RATE_LIMITS.FAILED_PAYMENTS.window;
      case 'api_request':
        return this.RATE_LIMITS.API_CALLS.window;
      default:
        return 60 * 60 * 1000; // 1 hour default
    }
  }

  /**
   * Check if user/IP is currently blocked
   */
  isBlocked(key: string, eventType: string): boolean {
    const activities = this.suspiciousActivities.get(key) || [];
    const now = Date.now();
    const relevantWindow = this.getTimeWindowForEvent(eventType);
    
    const recentActivities = activities.filter(
      activity => 
        activity.activityType === eventType && 
        now - activity.timeWindow < relevantWindow
    );

    return recentActivities.length >= this.getThresholdForEvent(eventType);
  }

  /**
   * Get security analytics data
   */
  async getSecurityAnalytics(timeRange: string = '24h'): Promise<any> {
    try {
      let fromTime: string;
      const now = new Date();
      
      switch (timeRange) {
        case '1h':
          fromTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
          break;
        case '24h':
          fromTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case '7d':
          fromTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          fromTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      }

      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .gte('created_at', fromTime)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch security analytics:', error);
        return null;
      }

      return this.processSecurityAnalytics(data);
    } catch (error) {
      console.error('Error fetching security analytics:', error);
      return null;
    }
  }

  /**
   * Process raw security data into analytics
   */
  private processSecurityAnalytics(data: any[]): any {
    const analytics = {
      totalEvents: data.length,
      eventsByType: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      topUsers: {} as Record<string, number>,
      timeline: [] as any[]
    };

    data.forEach(event => {
      // Count by type
      analytics.eventsByType[event.event_type] = 
        (analytics.eventsByType[event.event_type] || 0) + 1;

      // Count by severity (if available in event_data)
      const severity = event.event_data?.severity || 'medium';
      analytics.eventsBySeverity[severity] = 
        (analytics.eventsBySeverity[severity] || 0) + 1;

      // Count by user
      if (event.user_id) {
        analytics.topUsers[event.user_id] = 
          (analytics.topUsers[event.user_id] || 0) + 1;
      }

      // Timeline data
      analytics.timeline.push({
        timestamp: event.created_at,
        type: event.event_type,
        severity: severity
      });
    });

    return analytics;
  }
}

export const securityMonitor = new SecurityMonitor();

// Helper functions for common security events
export const logLoginAttempt = (success: boolean, email: string, ipAddress?: string) => {
  securityMonitor.logSecurityEvent({
    type: success ? 'login_success' : 'login_failed',
    severity: success ? 'low' : 'medium',
    data: {
      email: success ? email : email.substring(0, 3) + '***', // Mask on failure
      ipAddress,
      userAgent: navigator.userAgent
    }
  });
};

export const logPaymentAttempt = (success: boolean, amount: number, userId?: string) => {
  securityMonitor.logSecurityEvent({
    type: success ? 'payment_success' : 'payment_failed',
    severity: success ? 'low' : 'medium',
    data: {
      amount,
      currency: 'USD'
    },
    userId
  });
};

export const logDataAccess = (resource: string, userId?: string) => {
  securityMonitor.logSecurityEvent({
    type: 'data_access',
    severity: 'low',
    data: {
      resource,
      action: 'read'
    },
    userId
  });
};

export const logSuspiciousActivity = (activity: string, details: any, userId?: string) => {
  securityMonitor.logSecurityEvent({
    type: 'suspicious_activity',
    severity: 'high',
    data: {
      activity,
      details
    },
    userId
  });
};