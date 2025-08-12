import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Phone } from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ContactButtonsProps {
  bookingId: string;
  recipientId: string;
  recipientName: string;
  showCallButton?: boolean;
  showChatButton?: boolean;
}

export const ContactButtons: React.FC<ContactButtonsProps> = ({
  bookingId,
  recipientId,
  recipientName,
  showCallButton = true,
  showChatButton = true
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreatingCall, setIsCreatingCall] = useState(false);

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

      // Show call instructions
      toast({
        title: "Private Call Setup",
        description: `Call ${data.proxyNumber} to connect securely. Your numbers stay private!`,
        duration: 15000,
      });

    } catch (error) {
      console.error('Error creating call session:', error);
      toast({
        title: "Call Setup Failed",
        description: "Unable to set up private calling. Please try again or use chat.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCall(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex gap-2">
      {showChatButton && (
        <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-0">
            <ChatInterface
              bookingId={bookingId}
              recipientId={recipientId}
              recipientName={recipientName}
              onClose={() => setIsChatOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {showCallButton && (
        <Button
          onClick={createCallSession}
          disabled={isCreatingCall}
          variant="outline"
          size="sm"
        >
          <Phone className="w-4 h-4 mr-2" />
          {isCreatingCall ? 'Setting up...' : 'Call'}
        </Button>
      )}
    </div>
  );
};