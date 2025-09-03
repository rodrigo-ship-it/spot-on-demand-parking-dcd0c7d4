import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RefundRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    total_amount: number;
    spot_id: string;
  } | null;
}

export default function RefundRequestDialog({ isOpen, onClose, booking }: RefundRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refundType, setRefundType] = useState<"automatic" | "manual">("automatic");
  const { toast } = useToast();

  const refundReasons = [
    "Spot not as described",
    "Spot unavailable/blocked",
    "No access provided",
    "Safety concerns",
    "Technical issues",
    "Other"
  ];

  const handleSubmit = async () => {
    if (!booking) {
      toast({
        title: "Error",
        description: "No booking data available.",
        variant: "destructive"
      });
      return;
    }

    if (!reason || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a reason and provide a description.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Calculate refund amount (full amount for now, could be partial in the future)
      const refundAmount = booking.total_amount;
      const cancellationFee = 0; // No cancellation fee for now

      if (refundType === "automatic") {
        // Call the process-refund edge function for automatic processing
        const { data, error } = await supabase.functions.invoke('process-refund', {
          body: {
            booking_id: booking.id,
            refund_amount: refundAmount,
            reason: `${reason}: ${description}`,
            cancellation_fee: cancellationFee
          }
        });

        if (error) throw error;

        if (data?.success) {
          toast({
            title: "Refund Processed",
            description: `Your refund of $${refundAmount.toFixed(2)} has been processed successfully.`
          });
        } else {
          toast({
            title: "Refund Request Submitted",
            description: "Your refund request has been submitted and will be processed manually."
          });
        }
      } else {
        // Send email to support for manual processing
        const { error } = await supabase.functions.invoke('send-refund-request', {
          body: {
            booking_id: booking.id,
            user_email: user.email,
            refund_amount: refundAmount,
            reason: reason,
            description: description,
            cancellation_fee: cancellationFee
          }
        });

        if (error) throw error;

        toast({
          title: "Refund Request Sent",
          description: "Your refund request has been sent to our support team at service@arrivparking.com. We'll review it within 24-48 hours."
        });
      }
      
      onClose();
    } catch (error: any) {
      console.error('Refund error:', error);
      toast({
        title: "Failed to Submit Request",
        description: error.message || "There was an error submitting your refund request. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="refund-amount">Refund Amount</Label>
            <div className="text-2xl font-bold text-primary">
              ${Number(booking.total_amount || 0).toFixed(2)}
            </div>
          </div>

          <div>
            <Label htmlFor="refund-type">Refund Type</Label>
            <Select value={refundType} onValueChange={(value: "automatic" | "manual") => setRefundType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select refund type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic Refund (Immediate)</SelectItem>
                <SelectItem value="manual">Manual Review (Email to Support)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Refund</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {refundReasons.map((reasonOption) => (
                  <SelectItem key={reasonOption} value={reasonOption}>
                    {reasonOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about the issue..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}