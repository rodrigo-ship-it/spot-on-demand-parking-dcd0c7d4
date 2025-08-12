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
  };
}

export default function RefundRequestDialog({ isOpen, onClose, booking }: RefundRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

      const { error } = await supabase
        .from("refunds" as any)
        .insert({
          booking_id: booking.id,
          user_id: user.id,
          amount: booking.total_amount,
          reason: `${reason}: ${description}`
        });

      if (error) throw error;

      toast({
        title: "Refund Request Submitted",
        description: "Your refund request has been submitted and will be reviewed within 24 hours."
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to Submit Request",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              ${Number(booking.total_amount).toFixed(2)}
            </div>
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