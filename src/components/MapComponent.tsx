import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMapboxToken = async () => {
    try {
      console.log('Fetching Mapbox token from Supabase...');
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      
      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Failed to fetch Mapbox token: ${error.message}`);
      }
      
      console.log('Mapbox token response:', data);
      
      if (!data || !data.token) {
        throw new Error('No token received from Supabase function');
      }
      
      return data.token;
    } catch (error) {
      console.error('Error fetching Mapbox token:', error);
      throw error;
    }
  };

  const initializeMap = async () => {
    if (!mapContainer.current) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const token = await fetchMapboxToken();
      
      if (!token) {
        throw new Error('No Mapbox token available');
      }

      mapboxgl.accessToken = token;
      
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

      // Use the actual coordinates from spots data
      const spotsWithCoords = spots;

      console.log('Initializing map with spots:', spotsWithCoords);

      spotsWithCoords.forEach((spot) => {
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

      // Add marker for search location if provided
      if (centerLocation) {
        new mapboxgl.Marker({
          color: '#ef4444', // Red color for search location
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

      // Add spot selection to window object for popup buttons
      (window as any).selectSpot = onSpotSelect;

      toast.success('Map loaded successfully!');
      console.log('Map initialized successfully with', spotsWithCoords.length, 'spots');
      setIsLoading(false);
    } catch (error) {
      console.error('Map initialization error:', error);
      setError('Failed to load map. Please try refreshing the page.');
      setIsLoading(false);
      toast.error('Map initialization failed. Please try again.');
    }
  };

  useEffect(() => {
    // Initialize map when component mounts or when spots/centerLocation change
    if (map.current) {
      map.current.remove();
    }
    initializeMap();
  }, [spots, centerLocation]);

  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  if (error) {
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg flex items-center justify-center bg-gray-100">
        <div className="text-center p-6">
          <p className="text-red-600 mb-2">{error}</p>
          <button 
            onClick={() => initializeMap()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default MapComponent;