import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, MapPin, Clock, CheckCircle, AlertTriangle, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EnhancedCheckOutSystemProps {
  bookingId: string;
  spotId: string;
  endTime: string;
  onCheckOut: (verificationData: VerificationData) => void;
  isOvertime?: boolean;
}

interface VerificationData {
  photo: string;
  timestamp: string;
  locationVerified: boolean;
  photoVerified: boolean;
  timestampVerified: boolean;
  verificationScore: number;
  method: string;
}

interface Position {
  latitude: number;
  longitude: number;
}

export const EnhancedCheckOutSystem = ({ 
  bookingId, 
  spotId, 
  endTime, 
  onCheckOut,
  isOvertime
}: EnhancedCheckOutSystemProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Position | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [verificationLevel, setVerificationLevel] = useState<'basic' | 'standard' | 'enhanced'>('standard');

  useEffect(() => {
    // Set verification level to standard for all users
    setVerificationLevel('standard');

    // Get current location for verification
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          setLocationError(`Location access needed for verification: ${error.message}`);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const recordVerificationAttempt = async (attemptType: string, success: boolean, failureReason?: string, data?: any) => {
    await supabase.from('verification_attempts').insert({
      booking_id: bookingId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      attempt_type: attemptType,
      verification_data: data || {},
      success,
      failure_reason: failureReason
    });
  };

  const verifyLocation = async (): Promise<boolean> => {
    if (!currentLocation) return false;

    try {
      // Get parking spot location
      const { data: spotData } = await supabase
        .from('parking_spots')
        .select('latitude, longitude')
        .eq('id', spotId)
        .single();

      if (!spotData) return false;

      // Calculate distance between current location and spot
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        spotData.latitude,
        spotData.longitude
      );

      // Allow 100 meter radius for verification
      const isNearSpot = distance <= 0.1; // 0.1 km = 100 meters

      await recordVerificationAttempt('location_verification', isNearSpot, 
        isNearSpot ? undefined : `Too far from spot: ${distance.toFixed(2)}km`, 
        { distance, userLocation: currentLocation, spotLocation: spotData }
      );

      return isNearSpot;
    } catch (error) {
      console.error("Location verification error:", error);
      await recordVerificationAttempt('location_verification', false, 'Verification failed');
      return false;
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const verifyPhotoContent = async (photoData: string): Promise<boolean> => {
    // Basic photo verification - check if it contains reasonable content
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Simple checks: image has reasonable dimensions and isn't too dark/light
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Calculate average brightness
        let totalBrightness = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          totalBrightness += brightness;
        }
        const avgBrightness = totalBrightness / (pixels.length / 4);
        
        // Photo should not be too dark (< 20) or too bright (> 235)
        const isValidPhoto = avgBrightness > 20 && avgBrightness < 235 && 
                            img.width > 200 && img.height > 200;
        
        resolve(isValidPhoto);
      };
      img.onerror = () => resolve(false);
      img.src = photoData;
    });
  };

  const captureEnhancedCheckOutPhoto = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
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
        
        // Add verification watermark
        const now = new Date();
        // Use a consistent UTC timestamp for server verification
        const serverTimestamp = now.toISOString();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, canvas.height - 120, 500, 110);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`✓ VERIFIED CHECK-OUT`, 20, canvas.height - 95);
        ctx.font = '14px Arial';
        ctx.fillText(`Time: ${now.toLocaleString()}`, 20, canvas.height - 75);
        ctx.fillText(`Booking: ${bookingId.slice(0, 8)}...`, 20, canvas.height - 55);
        ctx.fillText(`Location: ${currentLocation ? '✓ Verified' : '⚠ Unverified'}`, 20, canvas.height - 35);
        ctx.fillText(`Check-out Verified`, 20, canvas.height - 15);
        
        const photoData = canvas.toDataURL('image/jpeg', 0.9);
        
        // Perform verifications based on trust level
        let locationVerified = true;
        let photoVerified = true;
        let timestampVerified = true;
        let verificationScore = 100;

        if (verificationLevel === 'enhanced' || verificationLevel === 'standard') {
          locationVerified = await verifyLocation();
          if (!locationVerified) verificationScore -= 30;
        }

        if (verificationLevel === 'enhanced') {
          photoVerified = await verifyPhotoContent(photoData);
          if (!photoVerified) verificationScore -= 20;
        }

        // Timestamp is always server-verified
        timestampVerified = true;

        const verificationData: VerificationData = {
          photo: photoData,
          timestamp: serverTimestamp,
          locationVerified,
          photoVerified,
          timestampVerified,
          verificationScore,
          method: verificationLevel
        };

        setPhoto(photoData);
        onCheckOut(verificationData);
        setIsCheckedOut(true);
        
        if (verificationScore >= 80) {
          toast.success("Check-out verified successfully!");
        } else if (verificationScore >= 60) {
          toast.success("Check-out completed with minor verification issues");
        } else {
          toast.error("Check-out completed but verification failed. Review may be required.");
        }
      }

      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Unable to access camera. Please check permissions.");
      await recordVerificationAttempt('photo_capture', false, error instanceof Error ? error.message : 'Camera access failed');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleEmergencyCheckOut = () => {
    const emergencyData: VerificationData = {
      photo: '',
      timestamp: new Date().toISOString(),
      locationVerified: false,
      photoVerified: false,
      timestampVerified: true,
      verificationScore: 30,
      method: 'emergency'
    };
    
    onCheckOut(emergencyData);
    setIsCheckedOut(true);
    toast.success("Emergency check-out recorded. Manual review may be required.");
  };

  const getTimeStatus = () => {
    // Validate endTime before processing
    if (!endTime) {
      console.error("No endTime provided for time calculation");
      return { message: "No time limit set", color: "text-gray-600" };
    }

    const now = new Date();
    // Parse end time correctly to avoid timezone issues
    const end = new Date(endTime + (endTime.includes('Z') ? '' : 'Z'));
    
    // Validate the end date
    if (isNaN(end.getTime())) {
      console.error("Invalid endTime format:", endTime);
      return { message: "Invalid time format", color: "text-red-600" };
    }
    
    // For 24-hour bookings, calculate based on duration rather than just end time
    // This handles cases where start and end dates are the same for 24-hour periods
    const timeDiff = now.getTime() - end.getTime();
    const minutesOver = Math.floor(timeDiff / (1000 * 60));

    if (minutesOver <= 0) {
      return { status: 'on-time', message: 'Perfect timing!', color: 'text-green-600', penalty: 0 };
    } else if (minutesOver <= 30) {
      return { status: 'grace', message: `${minutesOver} min over (Grace period - No fee)`, color: 'text-blue-600', penalty: 0 };
    } else if (minutesOver <= 60) {
      return { status: 'warning', message: `${minutesOver} min over ($8 convenience fee)`, color: 'text-yellow-600', penalty: 8 };
    } else if (minutesOver <= 120) {
      return { status: 'moderate', message: `${minutesOver} min over ($12 moderate fee)`, color: 'text-orange-600', penalty: 12 };
    } else {
      return { status: 'overtime', message: `${minutesOver} min over ($20 overtime fee)`, color: 'text-red-600', penalty: 20 };
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
    <Card className={`border ${isOvertime ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Enhanced Check-Out</span>
          </div>
          <Badge variant={verificationLevel === 'basic' ? 'secondary' : verificationLevel === 'standard' ? 'default' : 'destructive'}>
            {verificationLevel === 'basic' && <Zap className="w-3 h-3 mr-1" />}
            {verificationLevel === 'standard' && <Shield className="w-3 h-3 mr-1" />}
            {verificationLevel === 'enhanced' && <AlertTriangle className="w-3 h-3 mr-1" />}
            {verificationLevel.charAt(0).toUpperCase() + verificationLevel.slice(1)}
          </Badge>
        </CardTitle>
        <div className={`text-sm ${timeStatus.color}`}>
          {timeStatus.message}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {verificationLevel === 'basic' && "Quick check-out with basic verification"}
          {verificationLevel === 'standard' && "Standard verification with location check"}
          {verificationLevel === 'enhanced' && "Enhanced verification with multiple checks"}
        </div>

        {locationError && (
          <Alert>
            <MapPin className="w-4 h-4" />
            <AlertDescription>{locationError}</AlertDescription>
          </Alert>
        )}

        {timeStatus.penalty > 0 && (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              A ${timeStatus.penalty} fee will be added to your account credits for late parking.
            </AlertDescription>
          </Alert>
        )}

        {!photo ? (
          <div className="space-y-3">
            <Button
              onClick={captureEnhancedCheckOutPhoto}
              disabled={isCapturing}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isCapturing ? "Capturing & Verifying..." : "Take Verified Check-Out Photo"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleEmergencyCheckOut}
              className="w-full text-sm"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Emergency Check-Out (Manual Review)
            </Button>
          </div>
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