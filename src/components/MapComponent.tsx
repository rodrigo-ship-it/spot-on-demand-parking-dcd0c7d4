import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface ParkingSpot {
  id: number;
  title: string;
  address: string;
  price: number;
  rating: number;
  latitude: number;
  longitude: number;
  type: string;
  available: string;
  distance?: string;
}

interface MapComponentProps {
  spots: ParkingSpot[];
  onSpotSelect: (spotId: number) => void;
  centerLocation?: { latitude: number; longitude: number } | null;
}

export const MapComponent = ({ spots, onSpotSelect, centerLocation }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Set the Mapbox access token immediately
    mapboxgl.accessToken = 'pk.eyJ1Ijoicm9kcmlnby1hcnJpdiIsImEiOiJjbWR1ZmQ5a20weXphMmtwejJkY3pkOTk2In0.mO4oWjs7xAHkdUE0CV5XPg';

    const mapCenter: [number, number] = centerLocation 
      ? [centerLocation.longitude, centerLocation.latitude]
      : spots.length > 0 
        ? [spots[0].longitude, spots[0].latitude] 
        : [-74.006, 40.7128];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: mapCenter,
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    spots.forEach((spot) => {
      const marker = new mapboxgl.Marker({
        color: '#3B82F6',
      })
        .setLngLat([spot.longitude, spot.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <h3 class="font-bold text-sm">${spot.title}</h3>
              <p class="text-xs text-gray-600">${spot.address}</p>
              <div class="flex justify-between items-center mb-2">
                <p class="text-sm font-semibold">$${spot.price}/hour</p>
                ${spot.distance ? `<p class="text-xs text-gray-500">${spot.distance}</p>` : ''}
              </div>
              <button 
                onclick="window.selectSpot(${spot.id})" 
                class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 w-full"
              >
                Book Now
              </button>
            </div>
          `)
        )
        .addTo(map.current!);
    });

    if (centerLocation) {
      new mapboxgl.Marker({
        color: '#ef4444',
      })
        .setLngLat([centerLocation.longitude, centerLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <h3 class="font-bold text-sm">Search Location</h3>
              <p class="text-xs text-gray-600">Your searched location</p>
            </div>
          `)
        )
        .addTo(map.current!);
    }

    (window as any).selectSpot = onSpotSelect;

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [spots, centerLocation, onSpotSelect]);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default MapComponent;