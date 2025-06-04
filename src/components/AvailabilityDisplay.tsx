
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Car, Users } from "lucide-react";

interface AvailabilityDisplayProps {
  spotType: string;
  totalSpots?: number;
  spotId: string;
}

export const AvailabilityDisplay = ({ spotType, totalSpots = 1, spotId }: AvailabilityDisplayProps) => {
  const [availableSpots, setAvailableSpots] = useState(totalSpots);

  // Simulate real-time availability updates
  useEffect(() => {
    if (spotType === "entire-garage" || spotType === "entire-lot") {
      // Simulate random occupancy for demo
      const interval = setInterval(() => {
        const randomOccupied = Math.floor(Math.random() * (totalSpots + 1));
        setAvailableSpots(totalSpots - randomOccupied);
      }, 10000); // Update every 10 seconds for demo

      return () => clearInterval(interval);
    }
  }, [spotType, totalSpots]);

  if (spotType === "entire-garage" || spotType === "entire-lot") {
    const isFullyOccupied = availableSpots === 0;
    const isAlmostFull = availableSpots <= Math.ceil(totalSpots * 0.2);

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Car className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">
            {availableSpots}/{totalSpots} available
          </span>
        </div>
        <Badge 
          variant={isFullyOccupied ? "destructive" : isAlmostFull ? "secondary" : "default"}
          className={
            isFullyOccupied 
              ? "bg-red-100 text-red-800" 
              : isAlmostFull 
              ? "bg-yellow-100 text-yellow-800" 
              : "bg-green-100 text-green-800"
          }
        >
          {isFullyOccupied ? "Full" : isAlmostFull ? "Almost Full" : "Available"}
        </Badge>
      </div>
    );
  }

  return (
    <Badge variant="default" className="bg-green-100 text-green-800">
      <Car className="w-3 h-3 mr-1" />
      Available
    </Badge>
  );
};
