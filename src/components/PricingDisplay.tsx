import React from 'react';
import { Badge } from "@/components/ui/badge";

interface PricingDisplayProps {
  pricingType: 'hourly' | 'one_time';
  pricePerHour?: number;
  oneTimePrice?: number;
  className?: string;
  showBadge?: boolean;
}

export const PricingDisplay = ({ 
  pricingType, 
  pricePerHour, 
  oneTimePrice, 
  className = "",
  showBadge = false 
}: PricingDisplayProps) => {
  const isHourly = pricingType === 'hourly';
  const price = isHourly ? pricePerHour : oneTimePrice;
  const suffix = isHourly ? '/hr' : ' flat';
  
  if (!price) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span>${Number(price).toFixed(2)}{suffix}</span>
      {showBadge && (
        <Badge variant={isHourly ? "default" : "secondary"} className="text-xs">
          {isHourly ? "Hourly" : "Flat Rate"}
        </Badge>
      )}
    </div>
  );
};