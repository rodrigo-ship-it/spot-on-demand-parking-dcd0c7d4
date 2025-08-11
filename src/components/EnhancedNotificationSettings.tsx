import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, Shield, Smartphone, Mail, CreditCard, Gift, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { securityMonitor } from '@/lib/securityMonitoring';

interface NotificationPreferences {
  push_enabled: boolean;
  booking_updates: boolean;
  payment_alerts: boolean;
  promotions: boolean;
}

export const EnhancedNotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: true,
    booking_updates: true,
    payment_alerts: true,
    promotions: false
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadNotificationPreferences();
      checkPushSubscription();
    }
  }, [user]);

  const loadNotificationPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          push_enabled: data.push_enabled,
          booking_updates: data.booking_updates,
          payment_alerts: data.payment_alerts,
          promotions: data.promotions
        });
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPushSubscription = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error('Failed to check push subscription:', error);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    setSaving(true);
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user?.id,
          ...updatedPreferences
        });

      if (error) throw error;

      setPreferences(updatedPreferences);
      
      // Log security event for preference changes
      await securityMonitor.logSecurityEvent({
        type: 'notification_preferences_updated',
        severity: 'low',
        data: {
          changes: newPreferences,
          userId: user?.id
        },
        userId: user?.id
      });

      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && !isSubscribed) {
      await enablePushNotifications();
    } else if (!enabled && isSubscribed) {
      await disablePushNotifications();
    }
    
    await updatePreferences({ push_enabled: enabled });
  };

  const enablePushNotifications = async () => {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Subscribe to push notifications
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        
        // You would need to get VAPID keys from your environment
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' // Your VAPID public key
        });

        // Save subscription to database
        const { error } = await supabase
          .from('notification_subscriptions')
          .upsert({
            user_id: user?.id,
            endpoint: subscription.endpoint,
            keys: subscription.toJSON() as any
          });

        if (error) throw error;

        setIsSubscribed(true);
        
        await securityMonitor.logSecurityEvent({
          type: 'push_notifications_enabled',
          severity: 'low',
          data: { userId: user?.id },
          userId: user?.id
        });

        toast({
          title: "Push Notifications Enabled",
          description: "You'll now receive push notifications for important updates.",
        });
      }
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      toast({
        title: "Error",
        description: "Failed to enable push notifications. Please check your browser settings.",
        variant: "destructive",
      });
    }
  };

  const disablePushNotifications = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
        }

        // Remove subscription from database
        const { error } = await supabase
          .from('notification_subscriptions')
          .delete()
          .eq('user_id', user?.id);

        if (error) throw error;

        setIsSubscribed(false);
        
        await securityMonitor.logSecurityEvent({
          type: 'push_notifications_disabled',
          severity: 'low',
          data: { userId: user?.id },
          userId: user?.id
        });

        toast({
          title: "Push Notifications Disabled",
          description: "You'll no longer receive push notifications.",
        });
      }
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
      toast({
        title: "Error",
        description: "Failed to disable push notifications.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please sign in to manage notification settings.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading notification settings...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how you receive notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive instant notifications on your device
                </p>
              </div>
              <Switch
                checked={preferences.push_enabled}
                onCheckedChange={handlePushToggle}
                disabled={saving}
              />
            </div>
            
            {preferences.push_enabled && !isSubscribed && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Push notifications are enabled but not subscribed. 
                  Toggle the switch to complete setup.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Booking Updates */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Booking Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Notifications about your parking reservations
              </p>
            </div>
            <Switch
              checked={preferences.booking_updates}
              onCheckedChange={(checked) => updatePreferences({ booking_updates: checked })}
              disabled={saving}
            />
          </div>

          {/* Payment Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Important payment and billing notifications
              </p>
            </div>
            <Switch
              checked={preferences.payment_alerts}
              onCheckedChange={(checked) => updatePreferences({ payment_alerts: checked })}
              disabled={saving}
            />
          </div>

          {/* Promotions */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Promotions & Offers
              </Label>
              <p className="text-sm text-muted-foreground">
                Special deals and promotional content
              </p>
            </div>
            <Switch
              checked={preferences.promotions}
              onCheckedChange={(checked) => updatePreferences({ promotions: checked })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <Shield className="h-5 w-5" />
            Security & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              • We never send notifications with sensitive information like passwords or payment details
            </p>
            <p>
              • You can disable notifications at any time from your device settings
            </p>
            <p>
              • Payment alerts are strongly recommended for security purposes
            </p>
            <p>
              • All notification preferences are encrypted and stored securely
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};