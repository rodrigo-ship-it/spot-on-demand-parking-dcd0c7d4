
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

interface DisputeCameraProps {
  bookingId: string;
  disputeType: "overstay" | "occupied";
  onPhotoTaken: (photo: string, disputeType: string) => void;
  onClose: () => void;
}

export const DisputeCamera = ({ bookingId, disputeType, onPhotoTaken, onClose }: DisputeCameraProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  const capturePhoto = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Add timestamp to the photo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, canvas.height - 50, 300, 40);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(new Date().toLocaleString(), 20, canvas.height - 25);
        
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        toast.success("Evidence photo captured with timestamp!");
      }

      // Stop the camera
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Unable to access camera. Please check permissions.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = () => {
    if (!photo) {
      toast.error("Please take a photo first");
      return;
    }
    
    onPhotoTaken(photo, disputeType);
    toast.success("Dispute photo submitted successfully!");
    onClose();
  };

  const getDisputeTitle = () => {
    return disputeType === "overstay" 
      ? "Report Overstay - Take Evidence Photo"
      : "Report Occupied Spot - Take Evidence Photo";
  };

  const getDisputeDescription = () => {
    return disputeType === "overstay"
      ? "Take a photo showing the vehicle is still in your spot past the rental time."
      : "Take a photo showing someone else is occupying your reserved spot.";
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{getDisputeTitle()}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600">{getDisputeDescription()}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!photo ? (
          <div className="text-center space-y-4">
            <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No photo taken yet</p>
              </div>
            </div>
            
            <Button
              onClick={capturePhoto}
              disabled={isCapturing}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isCapturing ? "Accessing Camera..." : "Take Photo Now"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={photo} 
                alt="Dispute evidence" 
                className="w-full h-48 object-cover"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setPhoto(null)}
                className="flex-1"
              >
                Retake Photo
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
              >
                Submit Evidence
              </Button>
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500 text-center">
          Photos are automatically timestamped and cannot use existing images.
        </div>
      </CardContent>
    </Card>
  );
};
