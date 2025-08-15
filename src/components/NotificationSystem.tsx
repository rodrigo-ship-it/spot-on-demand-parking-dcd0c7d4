import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, AlertTriangle, CheckCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "checkout_reminder" | "overstay_warning" | "extension_request" | "dispute_alert";
  title: string;
  message: string;
  bookingId?: string;
  timestamp: Date;
  read: boolean;
  urgent: boolean;
}

interface NotificationSystemProps {
  bookings?: any[];
}

export const NotificationSystem = ({ bookings = [] }: NotificationSystemProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Generate real notifications based on actual bookings
  useEffect(() => {
    if (!user || !bookings.length) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const now = new Date();
    const realNotifications: Notification[] = [];

    bookings.forEach((booking) => {
      const startTime = new Date(`${booking.date} ${booking.startTime}`);
      const endTime = new Date(`${booking.date} ${booking.endTime}`);
      
      // Check for active bookings ending soon (within 30 minutes)
      if (booking.status === "Active") {
        const timeUntilEnd = endTime.getTime() - now.getTime();
        const minutesLeft = Math.floor(timeUntilEnd / (1000 * 60));
        
        if (minutesLeft > 0 && minutesLeft <= 30) {
          realNotifications.push({
            id: `checkout-${booking.id}`,
            type: "checkout_reminder",
            title: "Check-out Reminder",
            message: `Your parking session at ${booking.spotTitle} ends in ${minutesLeft} minutes. Please prepare to check out.`,
            bookingId: booking.id,
            timestamp: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
            read: false,
            urgent: minutesLeft <= 15
          });
        }
        
        // Check for overstay
        if (timeUntilEnd < 0) {
          const overstayMinutes = Math.abs(minutesLeft);
          realNotifications.push({
            id: `overstay-${booking.id}`,
            type: "overstay_warning",
            title: "Overstay Warning",
            message: `You are ${overstayMinutes} minutes past your reserved time at ${booking.spotTitle}. Additional fees may apply.`,
            bookingId: booking.id,
            timestamp: new Date(endTime.getTime() + 1 * 60 * 1000), // 1 minute after end time
            read: false,
            urgent: true
          });
        }
      }
      
      // Check for upcoming bookings (within 2 hours)
      if (booking.status === "Upcoming") {
        const timeUntilStart = startTime.getTime() - now.getTime();
        const hoursLeft = timeUntilStart / (1000 * 60 * 60);
        
        if (hoursLeft > 0 && hoursLeft <= 2) {
          const minutesLeft = Math.floor(timeUntilStart / (1000 * 60));
          realNotifications.push({
            id: `upcoming-${booking.id}`,
            type: "checkout_reminder",
            title: "Upcoming Reservation",
            message: `Your parking reservation at ${booking.spotTitle} starts in ${minutesLeft} minutes.`,
            bookingId: booking.id,
            timestamp: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
            read: false,
            urgent: hoursLeft <= 0.5
          });
        }
      }
    });

    setNotifications(realNotifications);
    setUnreadCount(realNotifications.filter(n => !n.read).length);
  }, [user, bookings]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "checkout_reminder":
        return <Clock className="w-5 h-5 text-blue-500" />;
      case "overstay_warning":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "extension_request":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "dispute_alert":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleNotificationAction = (notification: Notification) => {
    switch (notification.type) {
      case "checkout_reminder":
        toast.info("Redirecting to check-out...");
        break;
      case "overstay_warning":
        toast.warning("Please check out immediately to avoid additional fees");
        break;
      case "extension_request":
        toast.info("Processing extension request...");
        break;
      default:
        break;
    }
    markAsRead(notification.id);
  };

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No notifications at this time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.read 
                  ? 'bg-gray-50 border-gray-200' 
                  : notification.urgent
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={`font-medium ${
                        notification.read ? 'text-gray-700' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        notification.read ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {notification.urgent && (
                        <Badge variant="destructive" className="text-xs">
                          Urgent
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissNotification(notification.id)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {!notification.read && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleNotificationAction(notification)}
                        className="text-xs"
                      >
                        Take Action
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs"
                      >
                        Mark as Read
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};