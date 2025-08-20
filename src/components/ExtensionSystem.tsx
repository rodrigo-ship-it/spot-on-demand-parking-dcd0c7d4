
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExtensionSystemProps {
  bookingId: string;
  endTime: string;
  pricePerHour: number;
  isSpotAvailableAfter: boolean;
  onExtensionRequested: (hours: number, cost: number) => void;
}

export const ExtensionSystem = ({ 
  bookingId, 
  endTime, 
  pricePerHour, 
  isSpotAvailableAfter, 
  onExtensionRequested 
}: ExtensionSystemProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showExtensionOptions, setShowExtensionOptions] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      // Validate endTime before processing
      if (!endTime) {
        return { message: "No end time set", color: "text-gray-600" };
      }
      
      const now = new Date();
      // Parse end time correctly to avoid timezone issues
      const end = new Date(endTime + (endTime.includes('Z') ? '' : 'Z'));
      
      // Validate the parsed date
      if (isNaN(end.getTime())) {
        console.error("Invalid endTime in ExtensionSystem:", endTime);
        return { message: "Invalid time format", color: "text-red-600" };
      }
      const diff = end.getTime() - now.getTime();
      const minutesLeft = Math.floor(diff / (1000 * 60));
      
      setTimeLeft(minutesLeft);
      
      // Show extension options 30 minutes before end time
      if (minutesLeft <= 30 && minutesLeft > 0 && isSpotAvailableAfter) {
        setShowExtensionOptions(true);
      }
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [endTime, isSpotAvailableAfter]);

  const handleExtension = async (hours: number) => {
    const cost = Math.round(pricePerHour * hours * 1.5); // 50% premium for extensions
    
    try {
      // Store extension request in database
      const { error } = await supabase
        .from('extensions')
        .insert({
          booking_id: bookingId,
          requested_hours: hours,
          rate_per_hour: pricePerHour * 1.5,
          total_amount: cost
        });

      if (error) throw error;

      onExtensionRequested(hours, cost);
      setShowExtensionOptions(false);
      toast.success(`Extension requested for ${hours} hour(s) - $${cost}`);
    } catch (error) {
      console.error('Error requesting extension:', error);
      toast.error("Failed to request extension");
    }
  };

  if (!showExtensionOptions || timeLeft <= 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-orange-700">
          <Clock className="w-5 h-5" />
          <span>Extend Your Parking</span>
        </CardTitle>
        <p className="text-sm text-orange-600">
          {timeLeft} minutes remaining. Extend now to avoid overtime fees.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isSpotAvailableAfter ? (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-2 rounded">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Spot is reserved after your time - extension not available</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Available extensions (50% premium):</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleExtension(1)}
                className="flex flex-col h-auto p-3"
              >
                <span className="font-medium">+1 Hour</span>
                <span className="text-sm flex items-center">
                  <DollarSign className="w-3 h-3" />
                  {Math.round(pricePerHour * 1.5)}
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExtension(2)}
                className="flex flex-col h-auto p-3"
              >
                <span className="font-medium">+2 Hours</span>
                <span className="text-sm flex items-center">
                  <DollarSign className="w-3 h-3" />
                  {Math.round(pricePerHour * 2 * 1.5)}
                </span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
