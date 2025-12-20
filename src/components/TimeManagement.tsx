
import { useState, useEffect } from "react";
import { ExtensionSystem } from "./ExtensionSystem";
import { EnhancedCheckOutSystem } from "./EnhancedCheckOutSystem";
import { LenientPenaltySystem } from "./LenientPenaltySystem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePenaltySystem } from "@/hooks/usePenaltySystem";
import { toast } from "sonner";

interface TimeManagementProps {
  bookingId: string;
  spotId: string;
  endTime: string; // This will be used as initial end time, component will fetch fresh data
  pricePerHour: number;
  userViolations: any[];
  accountStatus: "good" | "warning" | "suspended";
  isActive: boolean;
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

export const TimeManagement = ({ 
  bookingId, 
  spotId,
  endTime: initialEndTime, 
  pricePerHour, 
  userViolations, 
  accountStatus,
  isActive 
}: TimeManagementProps) => {
  const { user } = useAuth();
  const [isSpotAvailableAfter, setIsSpotAvailableAfter] = useState(true);
  const [checkOutCompleted, setCheckOutCompleted] = useState(false);
  const [currentEndTime, setCurrentEndTime] = useState(initialEndTime);
  const [currentBookingData, setCurrentBookingData] = useState<any>(null);
  
  console.log('🔄 TimeManagement rendered with:', {
    bookingId: bookingId.substring(0, 8),
    initialEndTime,
    currentEndTime
  });

  // Fetch fresh booking data to get the most current end time
  const fetchBookingData = async () => {
    if (!bookingId) return;
    
    try {
      console.log('📡 [FETCH_BOOKING] Fetching fresh booking data for:', bookingId.substring(0, 8));
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();
        
      if (error) {
        console.error('❌ [FETCH_ERROR] Error fetching booking:', error);
        return;
      }
      
      if (booking) {
        console.log('✅ [BOOKING_DATA] Fresh booking data:', {
          id: booking.id.substring(0, 8),
          end_time: booking.end_time,
          display_end_time: booking.display_end_time,
          status: booking.status
        });
        
        setCurrentBookingData(booking);
        // Use the actual end_time from database, not the display field
        setCurrentEndTime(booking.end_time);
        
        // Only set checkOutCompleted if the user explicitly checked out (via checkout_verification_method)
        // Not just based on status, since status may have been set by mass updates
        if (booking.status === 'completed' && booking.checkout_verification_method) {
          setCheckOutCompleted(true);
        }
      }
    } catch (error) {
      console.error('❌ [FETCH_EXCEPTION] Error fetching booking data:', error);
    }
  };

  // Fetch booking data on mount and when bookingId changes
  useEffect(() => {
    fetchBookingData();
  }, [bookingId]);

  const {
    userProfile: penaltyProfile,
    penaltyCredits,
    loading: penaltyLoading,
    calculatePenalty,
    addPenaltyCredit,
    recordSuccessfulCheckout,
    refreshData
  } = usePenaltySystem(user?.id || "");

  // Check booking status on component load - removed since we now fetch in fetchBookingData

  const handleEnhancedCheckOut = async (verificationData: VerificationData) => {
    try {
      // Get booking details and spot information
      const { data: bookingData } = await supabase
        .from('bookings')
        .select(`
          start_time, 
          end_time,
          spot_id,
          parking_spots!inner(price_per_hour, pricing_type)
        `)
        .eq('id', bookingId)
        .single();

      if (!bookingData) {
        toast.error("Failed to verify booking details");
        return;
      }

      // Validate dates before processing
      if (!bookingData?.start_time || !bookingData?.end_time || !verificationData?.timestamp) {
        console.error("Missing required date data:", { bookingData, verificationData });
        toast.error("Invalid booking data - cannot process checkout");
        return;
      }

      const startTime = new Date(bookingData.start_time);
      const endTime = new Date(bookingData.end_time);
      const checkOutTime = new Date(verificationData.timestamp);
      
      // Validate that all dates are valid
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || isNaN(checkOutTime.getTime())) {
        console.error("Invalid dates detected:", {
          start_time: bookingData.start_time,
          end_time: bookingData.end_time,
          timestamp: verificationData.timestamp,
          startValid: !isNaN(startTime.getTime()),
          endValid: !isNaN(endTime.getTime()),
          checkOutValid: !isNaN(checkOutTime.getTime())
        });
        toast.error("Invalid date format - cannot process checkout");
        return;
      }
      
      // Calculate how late the user is checking out
      const minutesOver = Math.floor((checkOutTime.getTime() - endTime.getTime()) / (1000 * 60));
      
      // Update booking with verification details
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'completed',
          checkout_verification_method: verificationData.method,
          checkout_location_verified: verificationData.locationVerified,
          checkout_photo_verified: verificationData.photoVerified,
          checkout_timestamp_verified: verificationData.timestampVerified,
          verification_score: verificationData.verificationScore
        })
        .eq('id', bookingId);

      if (bookingError) {
        console.error("Error updating booking:", bookingError);
        toast.error("Failed to complete check-out");
        return;
      }

      const isFirstOffense = penaltyProfile?.failed_checkouts === 0;
      const spotPricePerHour = bookingData?.parking_spots?.pricing_type === 'hourly' ? Number(bookingData.parking_spots.price_per_hour) : undefined;
      const penaltyCalculation = calculatePenalty(minutesOver, isFirstOffense, spotPricePerHour);
      
      let penaltyDescription = '';
      if (penaltyCalculation.penaltyFee > 0 && penaltyCalculation.hourlyCharge > 0) {
        penaltyDescription = `Late checkout penalty: $${penaltyCalculation.penaltyFee} fine + $${penaltyCalculation.hourlyCharge} for ${Math.floor(minutesOver / 60)}h ${minutesOver % 60}m extra time`;
      } else if (penaltyCalculation.penaltyFee > 0) {
        penaltyDescription = `Late checkout penalty: $${penaltyCalculation.penaltyFee}`;
      } else if (penaltyCalculation.hourlyCharge > 0) {
        penaltyDescription = `Extra time charge: $${penaltyCalculation.hourlyCharge} for ${Math.floor(minutesOver / 60)}h ${minutesOver % 60}m`;
      }

      // Apply penalty if user was late
      if (minutesOver > 30 && penaltyCalculation.totalAmount > 0) {
        await addPenaltyCredit(
          bookingId,
          penaltyCalculation.totalAmount,
          'late_checkout',
          penaltyDescription,
          true, // autoCharge
          true  // splitPayment - penalty fee to platform, hourly charge split like regular booking
        );
      } else {
        await recordSuccessfulCheckout();
        if (minutesOver > 0 && minutesOver <= 30) {
          toast.success("No penalty applied - you're in the grace period!");
        } else {
          toast.success("Perfect timing! Check-out completed successfully!");
        }
      }

      setCheckOutCompleted(true);
    } catch (error) {
      console.error("Check-out error:", error);
      toast.error("Failed to complete check-out");
    }
  };

  const handleExtensionRequested = (hours: number, cost: number) => {
    // Extension processing is now handled entirely in ExtensionSystem component
    console.log("Extension processing initiated:", { bookingId, hours, cost });
    
    // Refresh booking data after extension to get the updated end time
    setTimeout(() => {
      console.log('🔄 [EXTENSION_REFRESH] Refreshing booking data after extension...');
      fetchBookingData();
    }, 2000); // Wait 2 seconds for the extension to be processed
  };

  const totalPenalties = userViolations.reduce((sum, v) => sum + v.penalty, 0);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Active Session</span>
          </TabsTrigger>
          <TabsTrigger value="violations" className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Violations</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Account Status</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {isActive && !checkOutCompleted && (
            <>
              <ExtensionSystem
                bookingId={bookingId}
                endTime={currentEndTime} // Use the current end time from database
                pricePerHour={pricePerHour}
                isSpotAvailableAfter={isSpotAvailableAfter}
                onExtensionRequested={handleExtensionRequested}
              />
              
              <EnhancedCheckOutSystem
                bookingId={bookingId}
                spotId={spotId}
                endTime={currentEndTime} // Use the current end time from database
                onCheckOut={handleEnhancedCheckOut}
                isOvertime={false} // Will be calculated dynamically based on start time + duration
              />
            </>
          )}
          
          {!isActive && (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No active parking session
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          {penaltyLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                Loading penalty information...
              </CardContent>
            </Card>
          ) : (
            <LenientPenaltySystem 
              userId={user?.id || ""}
              totalCredits={penaltyProfile?.total_penalty_credits || 0}
              recentCredits={penaltyCredits}
              onCreditsUpdate={refreshData}
            />
          )}
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-green-600">4.2</div>
                  <div className="text-sm text-gray-600">Current Rating</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Late check-outs impact your rating
                  </div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-blue-600">12</div>
                  <div className="text-sm text-gray-600">Total Bookings</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Reliability score: 85%
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded">
                <h4 className="font-medium mb-2">Fair Usage Policy:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Grace period: First 30 minutes free</li>
                  <li>• Late check-out (31-60 min): $8 convenience fee</li>
                  <li>• Extended late (61-120 min): $12 moderate fee</li>
                  <li>• Excessive late (120+ min): $20 overtime fee + rating impact</li>
                  <li>• Next person arrives & spot occupied: $30 penalty</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
