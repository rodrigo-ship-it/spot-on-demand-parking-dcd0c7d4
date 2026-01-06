import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MessageSquare, Send, Phone, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'text' | 'system';
  created_at: string;
  read_at: string | null;
}

interface ChatInterfaceProps {
  bookingId: string;
  recipientId: string;
  recipientName: string;
  onClose?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  bookingId,
  recipientId,
  recipientName,
  onClose
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing messages
  useEffect(() => {
    if (!user || !bookingId) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages((data || []) as Message[]);
      
      // Mark unread messages as read
      const unreadMessages = data?.filter(
        msg => msg.recipient_id === user.id && !msg.read_at
      ) || [];

      for (const msg of unreadMessages) {
        await supabase.rpc('mark_message_as_read', { message_id: msg.id });
      }
    };

    loadMessages();
  }, [user, bookingId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if it's for current user
          if (newMessage.recipient_id === user?.id) {
            setTimeout(() => {
              supabase.rpc('mark_message_as_read', { message_id: newMessage.id });
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, user?.id]);

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          recipient_id: recipientId,
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCallSession = async () => {
    if (!user) return;

    setIsCreatingCall(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-call-session', {
        body: {
          bookingId,
          recipientId
        }
      });

      if (error) throw error;

      toast({
        title: "Call Setup Complete",
        description: `Call ${data.proxyNumber} to connect privately. Both numbers will show "Settld Parking" as caller ID.`,
        duration: 10000,
      });

      // Send system message about call session
      await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          recipient_id: recipientId,
          content: `Call session created. Use ${data.proxyNumber} to connect privately.`,
          message_type: 'system'
        });

    } catch (error) {
      console.error('Error creating call session:', error);
      toast({
        title: "Error",
        description: "Failed to set up call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCall(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat with {recipientName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={createCallSession}
              disabled={isCreatingCall}
              variant="outline"
              size="sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              {isCreatingCall ? 'Setting up...' : 'Call'}
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                const isSystemMessage = message.message_type === 'system';

                if (isSystemMessage) {
                  return (
                    <div key={message.id} className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {message.content}
                      </Badge>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs opacity-70">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                        {message.read_at && isOwnMessage && (
                          <Badge variant="secondary" className="text-xs">
                            Read
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !newMessage.trim()}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};