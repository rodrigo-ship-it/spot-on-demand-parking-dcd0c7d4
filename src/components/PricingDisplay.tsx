import React from 'react';
import { Badge } from "@/components/ui/badge";

interface PricingDisplayProps {
  pricingType: 'hourly' | 'daily' | 'one_time';
  pricePerHour?: number;
  dailyPrice?: number;
  oneTimePrice?: number;
  className?: string;
  showBadge?: boolean;
}

export const PricingDisplay = ({ 
  pricingType, 
  pricePerHour, 
  dailyPrice,
  oneTimePrice, 
  className = "",
  showBadge = false 
}: PricingDisplayProps) => {
  const price = pricingType === 'hourly' ? pricePerHour : 
                pricingType === 'daily' ? dailyPrice : 
                oneTimePrice;
  const suffix = pricingType === 'hourly' ? '/hr' : 
                 pricingType === 'daily' ? '/day' : 
                 ' flat';
  
  if (!price) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span>${Number(price).toFixed(2)}{suffix}</span>
      {showBadge && (
        <Badge variant={pricingType === "hourly" ? "default" : "secondary"} className="text-xs">
          {pricingType === 'hourly' ? "Hourly" : pricingType === 'daily' ? "Daily" : "Flat Rate"}
        </Badge>
      )}
    </div>
  );
};