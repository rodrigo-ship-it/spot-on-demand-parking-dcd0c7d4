import React, { useState } from 'react';
import { Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MapLegend = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const legendItems = [
    { color: 'rgb(59, 130, 246)', label: 'Hourly payment' },
    { color: 'rgb(34, 197, 94)', label: 'Daily payment' },
    { color: 'rgb(168, 85, 247)', label: 'Monthly payment' },
    { color: 'rgb(249, 115, 22)', label: 'One-time payment' },
    { color: 'rgb(239, 68, 68)', label: 'Search Location' },
  ];

  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-lg border border-border shadow-sm w-fit">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-xs font-medium text-foreground">Map Legend</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6 p-0 hover:bg-accent"
        >
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </div>
      
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 pb-2 border-t border-border pt-2">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-foreground whitespace-nowrap">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <Crown className="w-3 h-3 text-amber-600 fill-amber-600 flex-shrink-0" />
            <span className="text-xs text-foreground whitespace-nowrap">Premium subscription</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>•</span>
            <span className="hidden sm:inline">Larger pins = Multiple spots or Garages</span>
            <span className="sm:hidden">Larger = Multiple/Garages</span>
          </div>
        </div>
      </div>
    </div>
  );
};