import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadMessageCount {
  bookingId: string;
  count: number;
}

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadMessageCount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCounts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get all bookings where user is involved (either as renter or spot owner)
      const { data: renterBookings, error: renterError } = await supabase
        .from('bookings')
        .select('id')
        .eq('renter_id', user.id);

      const { data: ownerBookings, error: ownerError } = await supabase
        .from('bookings')
        .select(`
          id,
          spot_id,
          parking_spots!inner(owner_id)
        `)
        .eq('parking_spots.owner_id', user.id);

      if (renterError) throw renterError;
      if (ownerError) throw ownerError;

      const allBookingIds = [
        ...(renterBookings?.map(b => b.id) || []),
        ...(ownerBookings?.map(b => b.id) || [])
      ];

      if (!allBookingIds.length) {
        setUnreadCounts([]);
        return;
      }

      // Get unread message counts for these bookings
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('booking_id')
        .in('booking_id', allBookingIds)
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (messagesError) throw messagesError;

      // Count messages by booking
      const counts = messages?.reduce((acc, msg) => {
        const existing = acc.find(item => item.bookingId === msg.booking_id);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ bookingId: msg.booking_id, count: 1 });
        }
        return acc;
      }, [] as UnreadMessageCount[]) || [];

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread message counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUnreadCount = (bookingId: string) => {
    return unreadCounts.find(item => item.bookingId === bookingId)?.count || 0;
  };

  const markAsRead = (bookingId: string) => {
    setUnreadCounts(prev => prev.filter(item => item.bookingId !== bookingId));
  };

  useEffect(() => {
    fetchUnreadCounts();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user?.id}`
        },
        (payload) => {
          const newMessage = payload.new as any;
          setUnreadCounts(prev => {
            const existing = prev.find(item => item.bookingId === newMessage.booking_id);
            if (existing) {
              return prev.map(item => 
                item.bookingId === newMessage.booking_id 
                  ? { ...item, count: item.count + 1 }
                  : item
              );
            } else {
              return [...prev, { bookingId: newMessage.booking_id, count: 1 }];
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user?.id}`
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          // If message was marked as read, decrease count
          if (updatedMessage.read_at) {
            setUnreadCounts(prev => {
              return prev.map(item => 
                item.bookingId === updatedMessage.booking_id 
                  ? { ...item, count: Math.max(0, item.count - 1) }
                  : item
              ).filter(item => item.count > 0);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    unreadCounts,
    loading,
    getUnreadCount,
    markAsRead,
    refetch: fetchUnreadCounts
  };
};