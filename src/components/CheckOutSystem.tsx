
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface CheckOutSystemProps {
  bookingId: string;
  endTime: string;
  onCheckOut: (photo: string, timestamp: string) => void;
  isOvertime?: boolean;
}

export const CheckOutSystem = ({ bookingId, endTime, onCheckOut, isOvertime }: CheckOutSystemProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCheckedOut, setIsCheckedOut] = useState(false);

  const captureCheckOutPhoto = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Add timestamp and check-out verification
        const now = new Date();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, canvas.height - 80, 400, 70);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`CHECK-OUT VERIFICATION`, 20, canvas.height - 55);
        ctx.font = '14px Arial';
        ctx.fillText(`Time: ${now.toLocaleString()}`, 20, canvas.height - 35);
        ctx.fillText(`Booking: ${bookingId}`, 20, canvas.height - 15);
        
        const photoData = canvas.toDataURL('image/jpeg', 0.9);
        setPhoto(photoData);
        onCheckOut(photoData, now.toISOString());
        setIsCheckedOut(true);
        toast.success("Check-out photo captured successfully!");
      }

      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Unable to access camera. Please check permissions.");
    } finally {
      setIsCapturing(false);
    }
  };

  const getTimeStatus = () => {
    // Validate endTime before processing
    if (!endTime) {
      return { message: "No time limit", color: "text-gray-600" };
    }
    
    const now = new Date();
    const end = new Date(endTime);
    
    // Validate the parsed date
    if (isNaN(end.getTime())) {
      console.error("Invalid endTime in CheckOutSystem:", endTime);
      return { message: "Invalid time format", color: "text-red-600" };
    }
    
    // For 24-hour bookings, calculate based on duration rather than just end time
    // This handles cases where start and end dates are the same for 24-hour periods
    const timeDiff = now.getTime() - end.getTime();
    const minutesOver = Math.floor(timeDiff / (1000 * 60));

    if (minutesOver <= 0) {
      return { status: 'on-time', message: 'Perfect timing!', color: 'text-green-600' };
    } else if (minutesOver <= 30) {
      return { status: 'grace', message: `${minutesOver} min over (Grace period - No fee)`, color: 'text-blue-600' };
    } else if (minutesOver <= 60) {
      return { status: 'warning', message: `${minutesOver} min over ($8 convenience fee)`, color: 'text-yellow-600' };
    } else if (minutesOver <= 120) {
      return { status: 'moderate', message: `${minutesOver} min over ($12 moderate fee)`, color: 'text-orange-600' };
    } else {
      return { status: 'overtime', message: `${minutesOver} min over ($20 overtime fee)`, color: 'text-red-600' };
    }
  };

  const timeStatus = getTimeStatus();

  if (isCheckedOut) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Successfully checked out</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border ${isOvertime ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Check-Out Required</span>
        </CardTitle>
        <div className={`text-sm ${timeStatus.color}`}>
          {timeStatus.message}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Take a photo of the empty parking spot to complete your check-out.
        </p>
        
        {(timeStatus.status === 'warning' || timeStatus.status === 'moderate') && (
          <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 p-2 rounded">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{timeStatus.status === 'warning' ? '$8 convenience fee' : '$12 moderate fee'} will be applied</span>
          </div>
        )}
        
        {timeStatus.status === 'overtime' && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-2 rounded">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">$20 overtime fee is being applied</span>
          </div>
        )}

        {!photo ? (
          <Button
            onClick={captureCheckOutPhoto}
            disabled={isCapturing}
            className="w-full"
          >
            <Camera className="w-4 h-4 mr-2" />
            {isCapturing ? "Capturing..." : "Take Check-Out Photo"}
          </Button>
        ) : (
          <div className="space-y-2">
            <img 
              src={photo} 
              alt="Check-out verification" 
              className="w-full h-32 object-cover rounded border"
            />
            <Button variant="outline" onClick={() => setPhoto(null)} className="w-full">
              Retake Photo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
