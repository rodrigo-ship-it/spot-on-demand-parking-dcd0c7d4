import React from 'react';
import { Crown } from 'lucide-react';

export const MapLegend = () => {
  const legendItems = [
    { color: 'rgb(59, 130, 246)', label: 'Hourly payment' },
    { color: 'rgb(34, 197, 94)', label: 'Daily payment' },
    { color: 'rgb(168, 85, 247)', label: 'Monthly payment' },
    { color: 'rgb(249, 115, 22)', label: 'One-time payment' },
    { color: 'rgb(239, 68, 68)', label: 'Search Location' },
  ];

  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-lg border border-border px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {legendItems.map((item, index) => (
          <div key={item.label} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-foreground whitespace-nowrap">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Crown className="w-3 h-3 text-amber-600 fill-amber-600 flex-shrink-0" />
          <span className="text-xs text-foreground whitespace-nowrap">Premium subscription</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>•</span>
          <span className="hidden sm:inline">Larger pins = Multiple spots or Garages</span>
          <span className="sm:hidden">Larger = Multiple/Garages</span>
        </div>
      </div>
    </div>
  );
};