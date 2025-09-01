import React from 'react';

export const MapLegend = () => {
  const legendItems = [
    { color: 'rgb(59, 130, 246)', label: 'Hourly payment' },
    { color: 'rgb(34, 197, 94)', label: 'Daily payment' },
    { color: 'rgb(168, 85, 247)', label: 'Monthly payment' },
    { color: 'rgb(249, 115, 22)', label: 'One-time payment' },
    { color: 'mixed', label: 'Mixed payment types' },
    { color: 'rgb(239, 68, 68)', label: 'Search Location' },
  ];

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 px-4 py-2 shadow-sm">
      <div className="flex items-center space-x-6">
        {legendItems.map((item, index) => (
          <div key={item.label} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ 
                backgroundColor: item.color !== 'mixed' ? item.color : 'transparent',
                background: item.color === 'mixed' ? 
                  'conic-gradient(rgb(59, 130, 246) 0deg 90deg, rgb(34, 197, 94) 90deg 180deg, rgb(168, 85, 247) 180deg 270deg, rgb(249, 115, 22) 270deg 360deg)' 
                  : item.color
              }}
            />
            <span className="text-xs text-gray-700 whitespace-nowrap">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <span>•</span>
          <span>Larger pins = Multiple spots or Garages</span>
        </div>
      </div>
    </div>
  );
};