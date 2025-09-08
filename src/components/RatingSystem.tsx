
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star, Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RatingSystemProps {
  bookingId: string;
  userType: "renter" | "lister";
  onSubmitRating: (rating: number, comment: string, photo?: string) => void;
  onClose: () => void;
}

export const RatingSystem = ({ bookingId, userType, onSubmitRating, onClose }: RatingSystemProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

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
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        toast.success("Photo captured successfully!");
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

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      // First get the booking to find the spot owner
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('spot_id, renter_id, parking_spots(owner_id)')
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        throw new Error('Could not find booking information');
      }

      // Store review in database
      const { error } = await supabase
        .from('reviews')
        .insert({
          booking_id: bookingId,
          reviewer_id: user?.id,
          reviewed_id: userType === 'renter' ? booking.parking_spots.owner_id : booking.renter_id,
          user_type: userType,
          rating,
          comment: comment || null,
          photo_url: photo || null
        });

      if (error) throw error;

      onSubmitRating(rating, comment, photo || undefined);
      toast.success("Review submitted successfully!");
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error("Failed to submit rating");
    }
  };

  const getPlaceholderText = () => {
    if (userType === "renter") {
      return "Describe your experience with this parking spot and the owner...";
    } else {
      return "Describe your experience with this renter...";
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Leave a Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium mb-2">Rating</label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-8 h-8 cursor-pointer transition-colors ${
                  star <= rating 
                    ? "text-yellow-400 fill-yellow-400" 
                    : "text-gray-300 hover:text-yellow-200"
                }`}
                onClick={() => handleStarClick(star)}
              />
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium mb-2">Comments</label>
          <Textarea
            placeholder={getPlaceholderText()}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>

        {/* Photo Capture */}
        <div>
          <label className="block text-sm font-medium mb-2">Evidence Photo (Optional)</label>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={capturePhoto}
              disabled={isCapturing}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isCapturing ? "Capturing..." : "Take Photo Now"}
            </Button>
            
            {photo && (
              <div className="border rounded-lg p-2">
                <img 
                  src={photo} 
                  alt="Captured evidence" 
                  className="w-full h-32 object-cover rounded"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setPhoto(null)}
                >
                  Remove Photo
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Submit Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
