import React, { useState } from 'react';
import { Crown, ChevronDown, ChevronUp, MapPin, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const MapLegend = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const pricingTypes = [
    { color: 'rgb(59, 130, 246)', label: 'Hourly', bgClass: 'bg-blue-500' },
    { color: 'rgb(34, 197, 94)', label: 'Daily', bgClass: 'bg-green-500' },
    { color: 'rgb(168, 85, 247)', label: 'Monthly', bgClass: 'bg-purple-500' },
    { color: 'rgb(249, 115, 22)', label: 'One-time', bgClass: 'bg-orange-500' },
  ];

  return (
    <div className="bg-card border border-border shadow-lg rounded-xl overflow-hidden backdrop-blur-md bg-opacity-95">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Map Legend</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <Separator />
        
        <div className="p-4 space-y-4">
          {/* Pricing Types */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2.5">Payment Types</p>
            <div className="grid grid-cols-2 gap-2">
              {pricingTypes.map((item) => (
                <div key={item.label} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/30 transition-colors">
                  <div className={`w-4 h-4 rounded-full ${item.bgClass} flex-shrink-0 shadow-sm`} />
                  <span className="text-xs text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Special Markers */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2.5">Special Markers</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/30 transition-colors">
                <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0 shadow-sm" />
                <span className="text-xs text-foreground">Your Location</span>
              </div>
              
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/30 transition-colors">
                <Crown className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                <span className="text-xs text-foreground">Premium Spots</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Info */}
          <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-muted/30">
            <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Larger markers indicate multiple spots or garage facilities
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};