
import { useState, useEffect } from "react";
import { CheckOutSystem } from "./CheckOutSystem";
import { ExtensionSystem } from "./ExtensionSystem";
import { PenaltySystem } from "./PenaltySystem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Shield, AlertTriangle } from "lucide-react";

interface TimeManagementProps {
  bookingId: string;
  endTime: string;
  pricePerHour: number;
  userViolations: any[];
  accountStatus: "good" | "warning" | "suspended";
  isActive: boolean;
}

export const TimeManagement = ({ 
  bookingId, 
  endTime, 
  pricePerHour, 
  userViolations, 
  accountStatus,
  isActive 
}: TimeManagementProps) => {
  const [isSpotAvailableAfter, setIsSpotAvailableAfter] = useState(true);
  const [checkOutCompleted, setCheckOutCompleted] = useState(false);

  const handleCheckOut = (photo: string, timestamp: string) => {
    console.log("Check-out completed:", { bookingId, photo, timestamp });
    setCheckOutCompleted(true);
    
    // Calculate if user was late and apply penalties
    const endTimeDate = new Date(endTime);
    const checkOutTime = new Date(timestamp);
    const minutesOver = Math.floor((checkOutTime.getTime() - endTimeDate.getTime()) / (1000 * 60));
    
    if (minutesOver > 15) {
      // Apply penalty based on how late they were
      const penalty = minutesOver > 60 ? 50 : 25;
      console.log("Late check-out penalty applied:", penalty);
    }
  };

  const handleExtensionRequested = (hours: number, cost: number) => {
    console.log("Extension requested:", { bookingId, hours, cost });
    // Process extension payment and update booking
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
                endTime={endTime}
                pricePerHour={pricePerHour}
                isSpotAvailableAfter={isSpotAvailableAfter}
                onExtensionRequested={handleExtensionRequested}
              />
              
              <CheckOutSystem
                bookingId={bookingId}
                endTime={endTime}
                onCheckOut={handleCheckOut}
                isOvertime={new Date() > new Date(endTime)}
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

        <TabsContent value="violations">
          <PenaltySystem
            violations={userViolations}
            accountStatus={accountStatus}
            totalPenalties={totalPenalties}
          />
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
                <h4 className="font-medium mb-2">Rating Impact Policy:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Late check-out (16-30 min): -0.1 rating points</li>
                  <li>• Late check-out (31-60 min): -0.2 rating points</li>
                  <li>• Late check-out (60+ min): -0.5 rating points</li>
                  <li>• No check-out: -1.0 rating points + suspension review</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
