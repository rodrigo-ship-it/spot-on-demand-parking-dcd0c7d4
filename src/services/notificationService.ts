import { supabase } from "@/integrations/supabase/client";

export interface NotificationPreferences {
  pushEnabled: boolean;
  bookingUpdates: boolean;
  paymentAlerts: boolean;
  promotions: boolean;
}

class NotificationService {
  private vapidKey = 'YOUR_VAPID_PUBLIC_KEY'; // Replace with actual VAPID key

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidKey)
      });

      // Store subscription in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any).from('notification_subscriptions').upsert({
          user_id: user.id,
          subscription: JSON.stringify(subscription),
          updated_at: new Date().toISOString()
        });
      }

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  async unsubscribeFromPush(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          
          // Remove subscription from Supabase
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await (supabase as any).from('notification_subscriptions')
              .delete()
              .eq('user_id', user.id);
          }
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Notification.permission !== 'granted') {
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(title, {
            icon: '/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png',
            badge: '/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png',
            ...options
          });
          return;
        }
      }
      
      // Fallback to basic notification
      new Notification(title, options);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return (data as NotificationPreferences) || {
        pushEnabled: false,
        bookingUpdates: true,
        paymentAlerts: true,
        promotions: false
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await (supabase as any)
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationService = new NotificationService();