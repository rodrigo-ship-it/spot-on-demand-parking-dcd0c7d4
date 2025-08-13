import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, AlertTriangle, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DisputeCamera } from "./DisputeCamera";

interface SpotReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  spotTitle: string;
  spotAddress: string;
}

export const SpotReportDialog = ({ 
  isOpen, 
  onClose, 
  bookingId, 
  spotTitle, 
  spotAddress 
}: SpotReportDialogProps) => {
  const { user } = useAuth();
  const [showCamera, setShowCamera] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleReportSpot = () => {
    setShowCamera(true);
  };

  const handlePhotoTaken = async (photoData: string, disputeType: string) => {
    try {
      // Upload photo to storage
      const fileName = `dispute-${bookingId}-${Date.now()}.jpg`;
      const base64Data = photoData.split(',')[1];
      const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('parking-images')
        .upload(`disputes/${fileName}`, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('parking-images')
        .getPublicUrl(`disputes/${fileName}`);

      // Update the dispute with the storage URL
      const { error: updateError } = await supabase
        .from('disputes')
        .update({ photo_url: publicUrl })
        .eq('booking_id', bookingId)
        .eq('reporter_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (updateError) throw updateError;

      // Get the dispute ID to send notification
      const { data: disputeData, error: disputeError } = await supabase
        .from('disputes')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('reporter_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (disputeError) throw disputeError;

      // Send email notification to support team
      try {
        await supabase.functions.invoke('send-dispute-notification', {
          body: {
            disputeId: disputeData.id,
            bookingId: bookingId,
            reporterEmail: user?.email,
            disputeType: disputeType,
            photoUrl: publicUrl
          }
        });
        console.log('Dispute notification sent successfully');
      } catch (emailError) {
        console.error('Failed to send dispute notification email:', emailError);
        // Don't fail the whole process if email fails
      }

      setReportSubmitted(true);
      setShowCamera(false);
      toast.success("Spot report submitted successfully! We'll review your case within 24 hours.");
    } catch (error) {
      console.error('Error handling photo:', error);
      toast.error("Failed to submit photo evidence");
    }
  };

  const handleCameraClose = () => {
    setShowCamera(false);
  };

  if (reportSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <FileText className="w-5 h-5" />
              Report Submitted
            </DialogTitle>
            <DialogDescription>
              Your spot availability report has been submitted successfully.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-green-800">What happens next?</h4>
                  <ul className="text-sm text-green-700 mt-2 space-y-1">
                    <li>• Our team will review your photo evidence</li>
                    <li>• We'll verify the spot was indeed occupied</li>
                    <li>• You'll receive an update within 24 hours</li>
                    <li>• If confirmed, a full refund will be processed</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showCamera) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DisputeCamera
            bookingId={bookingId}
            disputeType="occupied"
            onPhotoTaken={handlePhotoTaken}
            onClose={handleCameraClose}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Report Spot Issue
          </DialogTitle>
          <DialogDescription>
            Is someone else occupying your reserved parking spot?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium">{spotTitle}</h4>
            <p className="text-sm text-gray-600">{spotAddress}</p>
            <Badge variant="outline" className="mt-2">
              Booking ID: {bookingId.slice(0, 8)}...
            </Badge>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <Camera className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-blue-800">Photo Evidence Required</h4>
                <p className="text-sm text-blue-700 mt-1">
                  To process your refund request, we need a timestamped photo showing the spot is occupied by another vehicle.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Important:</p>
              <ul className="space-y-1 text-amber-700">
                <li>• Photo must be taken at the spot location</li>
                <li>• Must show clear evidence of occupancy</li>
                <li>• Photo will be timestamped automatically</li>
                <li>• False reports may affect your account</li>
              </ul>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleReportSpot} className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};