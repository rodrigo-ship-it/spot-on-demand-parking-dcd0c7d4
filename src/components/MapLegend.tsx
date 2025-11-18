import React, { useState } from 'react';
import { Crown, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

export const MapLegend = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const legendItems = [
    { color: 'bg-blue-500', label: 'Hourly' },
    { color: 'bg-green-500', label: 'Daily' },
    { color: 'bg-purple-500', label: 'Monthly' },
    { color: 'bg-orange-500', label: 'One-time' },
    { color: 'bg-red-500', label: 'Your Location' },
  ];

  return (
    <div className="bg-card/95 border border-border shadow-lg rounded-lg overflow-hidden backdrop-blur-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors"
      >
        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-semibold text-foreground">Legend</span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-1" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
        )}
      </button>
      
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 pb-2 pt-1 border-t border-border">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color} flex-shrink-0`} />
                <span className="text-xs text-foreground whitespace-nowrap">{item.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-500 flex-shrink-0" />
              <span className="text-xs text-foreground whitespace-nowrap">Premium</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};