import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, DollarSign, Shield, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CancellationPolicyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    start_time: string;
    total_amount: number;
    payment_intent_id?: string;
    parking_spots: {
      title: string;
    };
  };
  onCancellationSuccess: () => void;
}

export const CancellationPolicyDialog = ({ 
  isOpen, 
  onClose, 
  booking, 
  onCancellationSuccess 
}: CancellationPolicyDialogProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Early return if no booking data
  if (!booking) {
    return null;
  }

  // Calculate time until booking starts
  const now = new Date();
  
  // Validate booking start_time before parsing
  if (!booking?.start_time) {
    console.error("No start_time in booking data for cancellation policy");
    return null;
  }
  
  const bookingStart = new Date(booking.start_time);
  
  // Validate the parsed date
  if (isNaN(bookingStart.getTime())) {
    console.error("Invalid start_time format in booking:", booking.start_time);
    return null;
  }
  const hoursUntilBooking = Math.max(0, (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60));
  const canCancel = hoursUntilBooking >= 3;

  // Calculate refund amount based on cancellation policy
  const getRefundInfo = () => {
    const totalAmount = parseFloat(booking.total_amount.toString());
    
    if (hoursUntilBooking >= 24) {
      return {
        refundPercentage: 100,
        refundAmount: totalAmount,
        cancellationFee: 0,
        description: "Full refund - cancelled 24+ hours in advance"
      };
    } else if (hoursUntilBooking >= 3) {
      const cancellationFee = Math.min(totalAmount * 0.1, 5); // 10% fee, max $5
      return {
        refundPercentage: 90,
        refundAmount: totalAmount - cancellationFee,
        cancellationFee,
        description: "90% refund - cancelled 3-24 hours in advance"
      };
    } else {
      return {
        refundPercentage: 0,
        refundAmount: 0,
        cancellationFee: totalAmount,
        description: "No refund - cancelled less than 3 hours in advance"
      };
    }
  };

  const refundInfo = getRefundInfo();

  const handleCancellation = async () => {
    if (!canCancel) {
      toast.error("Cannot cancel bookings less than 3 hours before start time");
      return;
    }

    setIsProcessing(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required to cancel booking");
        return;
      }
      // Update booking status to cancelled
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // If there's a refund due, create a refund request
      if (refundInfo.refundAmount > 0) {
        // Check if booking has payment intent for refund processing
        if (!booking.payment_intent_id) {
          console.warn('No payment intent found for booking:', booking.id);
          toast.warning('Booking cancelled successfully. Refund will be processed manually as no payment record was found.');
        } else {
          const { error: refundError } = await supabase.functions.invoke('process-refund', {
            body: {
              booking_id: booking.id,
              refund_amount: refundInfo.refundAmount,
              reason: `Cancellation - ${refundInfo.description}`,
              cancellation_fee: refundInfo.cancellationFee
            }
          });

          if (refundError) {
            console.error('Refund processing failed:', refundError);
            toast.warning('Booking cancelled successfully. Refund will be processed manually - please contact support if you don\'t receive it within 5 business days.');
            
            // Still log the refund request for manual processing
            await supabase.from('refunds').insert({
              booking_id: booking.id,
              user_id: user.id,
              amount: refundInfo.refundAmount,
              reason: `Manual processing required - ${refundInfo.description}`,
              status: 'pending',
              admin_notes: `Automatic refund failed: ${refundError.message}`
            });
          } else {
            toast.success(`Booking cancelled! $${refundInfo.refundAmount.toFixed(2)} refund will be processed within 3-5 business days.`);
          }
        }
      } else {
        toast.success('Booking cancelled successfully.');
      }

      onCancellationSuccess();
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking. Please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Cancellation Policy
          </DialogTitle>
          <DialogDescription>
            Review our cancellation policy for {booking.parking_spots.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5" />
                Booking Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Current time:</span>
                <span className="font-medium">{now.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Booking starts:</span>
                <span className="font-medium">{bookingStart.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Time until booking:</span>
                <Badge variant={canCancel ? "default" : "destructive"}>
                  {hoursUntilBooking >= 1 
                    ? `${Math.floor(hoursUntilBooking)} hours ${Math.floor((hoursUntilBooking % 1) * 60)} minutes`
                    : `${Math.floor(hoursUntilBooking * 60)} minutes`
                  }
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Policy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5" />
                Cancellation Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">24+ hours in advance</div>
                    <div className="text-sm text-green-600">100% refund - No cancellation fee</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <div className="font-medium text-yellow-800">3-24 hours in advance</div>
                    <div className="text-sm text-yellow-600">90% refund - 10% cancellation fee (max $5)</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-800">Less than 3 hours</div>
                    <div className="text-sm text-red-600">No refund - Full cancellation fee</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refund Calculation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5" />
                Refund Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Original booking amount:</span>
                <span className="font-medium">${booking.total_amount}</span>
              </div>
              {refundInfo.cancellationFee > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Cancellation fee:</span>
                  <span className="font-medium">-${refundInfo.cancellationFee.toFixed(2)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Refund amount:</span>
                <span className={refundInfo.refundAmount > 0 ? "text-green-600" : "text-red-600"}>
                  ${refundInfo.refundAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-gray-600">{refundInfo.description}</p>
            </CardContent>
          </Card>

          {!canCancel && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    Cancellation not allowed - booking starts in less than 3 hours
                  </span>
                </div>
                <p className="text-sm text-red-600 mt-2">
                  You can only cancel bookings at least 3 hours before the start time. 
                  Please contact the spot owner if you have an emergency.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep Booking
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancellation}
            disabled={!canCancel || isProcessing}
          >
            {isProcessing ? "Processing..." : "Cancel Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};