import React from 'react';
import { MapPin, Square } from 'lucide-react';

export const MapLegend = () => {
  const legendItems = [
    { color: 'rgb(59, 130, 246)', label: 'Hourly Parking', type: 'pricing' },
    { color: 'rgb(34, 197, 94)', label: 'Daily Parking', type: 'pricing' },
    { color: 'rgb(168, 85, 247)', label: 'Monthly Parking', type: 'pricing' },
    { color: 'rgb(249, 115, 22)', label: 'One-time Payment', type: 'pricing' },
    { color: 'rgb(239, 68, 68)', label: 'Search Location', type: 'special' },
  ];

  const sizeItems = [
    { size: 'small', label: 'Single Spot' },
    { size: 'large', label: 'Multiple Spots or Garage/Lot' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Map Legend</h3>
      
      {/* Color Legend */}
      <div className="space-y-2 mb-4">
        <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Payment Types</h4>
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Size Legend */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Pin Sizes</h4>
        {sizeItems.map((item) => (
          <div key={item.label} className="flex items-center space-x-2">
            <div 
              className={`bg-blue-500 rounded-full flex-shrink-0 ${
                item.size === 'small' ? 'w-2 h-2' : 'w-4 h-4'
              }`}
            />
            <span className="text-xs text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};