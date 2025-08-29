
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
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      // Validate endTime before processing
      if (!endTime) {
        return { message: "No end time set", color: "text-gray-600" };
      }
      
      const now = new Date();
      const end = new Date(endTime);
      
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

  const checkAvailability = async (hours: number): Promise<boolean> => {
    try {
      console.log('🔍 Checking availability:', { bookingId, hours });
      // Get current booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('end_time_utc, spot_id')
        .eq('id', bookingId)
        .maybeSingle();

      if (bookingError || !booking) {
        console.error('❌ Booking fetch error:', bookingError);
        throw new Error('Could not fetch booking details');
      }

      console.log('📅 Current booking:', booking);

      // Calculate new end time
      const newEndTime = new Date(booking.end_time_utc);
      newEndTime.setHours(newEndTime.getHours() + hours);

      console.log('📅 New end time would be:', newEndTime.toISOString());

      // Check for conflicts
      const { data: conflicts, error: conflictError } = await supabase
        .from('bookings')
        .select('id, start_time_utc, end_time_utc')
        .eq('spot_id', booking.spot_id)
        .in('status', ['confirmed', 'active'])
        .neq('id', bookingId)
        .gte('start_time_utc', booking.end_time_utc)
        .lt('start_time_utc', newEndTime.toISOString());

      if (conflictError) {
        console.error('❌ Conflict check error:', conflictError);
        throw new Error('Could not check availability');
      }

      console.log('🔍 Conflicts found:', conflicts);

      const isAvailable = !conflicts || conflicts.length === 0;
      console.log('✅ Availability result:', isAvailable);
      
      return isAvailable;
    } catch (error) {
      console.error('❌ Availability check error:', error);
      setAvailabilityError(error.message);
      return false;
    }
  };

  const handleExtension = async (hours: number) => {
    console.log('🔄 Extension button clicked:', { hours, bookingId });
    setCheckingAvailability(true);
    setAvailabilityError(null);
    
    // First check availability
    console.log('🔍 Checking availability for extension...');
    const isAvailable = await checkAvailability(hours);
    setCheckingAvailability(false);
    
    if (!isAvailable) {
      console.log('❌ Extension unavailable due to conflicts');
      toast.error("Extension unavailable - another booking conflicts with this time");
      return;
    }

    console.log('✅ Extension availability confirmed');
    const cost = Math.round(pricePerHour * hours * 1.5); // 50% premium for extensions
    
    try {
      console.log('💾 Storing extension request in database...');
      // Store extension request in database
      const { error } = await supabase
        .from('extensions')
        .insert({
          booking_id: bookingId,
          requested_hours: hours,
          rate_per_hour: pricePerHour * 1.5,
          total_amount: cost,
          status: 'pending'
        });

      if (error) {
        console.error('❌ Database insert error:', error);
        throw error;
      }

      console.log('💳 Calling process-extension function...');
      // Process extension payment
      const { data, error: functionError } = await supabase.functions.invoke('process-extension', {
        body: {
          bookingId,
          extensionHours: hours,
          totalAmount: cost
        }
      });

      console.log('📊 Function response:', { data, functionError });
      console.log('📊 Full response object:', JSON.stringify({ data, functionError }, null, 2));

      if (functionError) {
        console.error('❌ Function error:', functionError);
        console.error('❌ Function error details:', JSON.stringify(functionError, null, 2));
        throw new Error(`Extension function failed: ${functionError.message || JSON.stringify(functionError)}`);
      }

      if (data?.checkout_url) {
        console.log('🚀 Redirecting to payment:', data.checkout_url);
        toast.success(`Redirecting to payment for ${hours} hour extension - $${cost}`);
        window.location.href = data.checkout_url;
      } else {
        console.error('❌ No checkout URL received:', data);
        throw new Error('No checkout URL received');
      }

      setShowExtensionOptions(false);
    } catch (error) {
      console.error('❌ Extension error:', error);
      toast.error("Failed to request extension: " + (error.message || 'Unknown error'));
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
            {availabilityError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {availabilityError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleExtension(1)}
                disabled={checkingAvailability}
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
                disabled={checkingAvailability}
                className="flex flex-col h-auto p-3"
              >
                <span className="font-medium">+2 Hours</span>
                <span className="text-sm flex items-center">
                  <DollarSign className="w-3 h-3" />
                  {Math.round(pricePerHour * 2 * 1.5)}
                </span>
              </Button>
            </div>
            {checkingAvailability && (
              <p className="text-sm text-gray-500">Checking availability...</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
