import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, BellOff, Settings, Smartphone } from "lucide-react";
import { notificationService, NotificationPreferences } from "@/services/notificationService";
import { toast } from "sonner";

export const NotificationSettings = () => {
  const [open, setOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: false,
    bookingUpdates: true,
    paymentAlerts: true,
    promotions: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotificationPreferences();
    checkNotificationStatus();
  }, []);

  const loadNotificationPreferences = async () => {
    const prefs = await notificationService.getNotificationPreferences();
    if (prefs) {
      setPreferences(prefs);
    }
  };

  const checkNotificationStatus = () => {
    if ('Notification' in window) {
      setIsEnabled(Notification.permission === 'granted');
    } else {
      setIsEnabled(false);
    }
  };

  const handleToggleNotifications = async () => {
    setLoading(true);
    
    try {
      if (!isEnabled) {
        const permission = await notificationService.requestPermission();
        if (permission) {
          await notificationService.subscribeToPush();
          setIsEnabled(true);
          toast.success('Push notifications enabled');
          
          // Update preferences
          const newPrefs = { ...preferences, pushEnabled: true };
          setPreferences(newPrefs);
          await notificationService.updateNotificationPreferences(newPrefs);
        } else {
          toast.error('Please allow notifications in your browser settings');
        }
      } else {
        await notificationService.unsubscribeFromPush();
        setIsEnabled(false);
        toast.success('Push notifications disabled');
        
        // Update preferences
        const newPrefs = { ...preferences, pushEnabled: false };
        setPreferences(newPrefs);
        await notificationService.updateNotificationPreferences(newPrefs);
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast.error('Push notifications are not supported in this browser');
    }
    
    setLoading(false);
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    await notificationService.updateNotificationPreferences(newPrefs);
  };

  const testNotification = async () => {
    await notificationService.showNotification(
      'Settld Test Notification',
      {
        body: 'This is a test notification to verify your settings.',
        icon: '/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png'
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {isEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          <span className="hidden sm:inline">Notifications</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Main Toggle */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Push Notifications
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {isEnabled 
                      ? 'Receive instant updates about your bookings and payments'
                      : 'Enable to receive important updates about your account'
                    }
                  </CardDescription>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleToggleNotifications}
                  disabled={loading}
                />
              </div>
            </CardHeader>
            
            {isEnabled && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Booking Updates</p>
                      <p className="text-xs text-muted-foreground">Get notified about booking confirmations and changes</p>
                    </div>
                    <Switch
                      checked={preferences.bookingUpdates}
                      onCheckedChange={(checked) => handlePreferenceChange('bookingUpdates', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Payment Alerts</p>
                      <p className="text-xs text-muted-foreground">Receive notifications about payments and earnings</p>
                    </div>
                    <Switch
                      checked={preferences.paymentAlerts}
                      onCheckedChange={(checked) => handlePreferenceChange('paymentAlerts', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Promotions</p>
                      <p className="text-xs text-muted-foreground">Get notified about special offers and promotions</p>
                    </div>
                    <Switch
                      checked={preferences.promotions}
                      onCheckedChange={(checked) => handlePreferenceChange('promotions', checked)}
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={testNotification}
                    className="w-full"
                  >
                    Send Test Notification
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
          
          {!('Notification' in window) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                Push notifications are not supported in this browser
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};