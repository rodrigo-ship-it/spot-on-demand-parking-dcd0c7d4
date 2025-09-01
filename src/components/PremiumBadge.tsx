import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

interface PremiumBadgeProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export const PremiumBadge = ({ 
  className = "", 
  showText = true, 
  size = "md" 
}: PremiumBadgeProps) => {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1", 
    lg: "text-base px-3 py-1.5"
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <Badge 
      variant="secondary" 
      className={`bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200 hover:from-amber-200 hover:to-yellow-200 transition-colors ${sizeClasses[size]} ${className}`}
    >
      <Crown 
        className="mr-1 fill-amber-600 text-amber-600" 
        size={iconSizes[size]} 
      />
      {showText && "Premium"}
    </Badge>
  );
};