import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

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
  const [mapboxToken, setMapboxToken] = useState(() => localStorage.getItem('mapboxToken') || '');
  const [tokenEntered, setTokenEntered] = useState(() => !!localStorage.getItem('mapboxToken'));

  const initializeMap = (token: string) => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;
    
    try {
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
    } catch (error) {
      console.error('Map initialization error:', error);
      toast.error('Map initialization failed. Please try again.');
      // Don't reset tokenEntered on search-related map updates
    }
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapboxToken.trim()) {
      localStorage.setItem('mapboxToken', mapboxToken.trim());
      setTokenEntered(true);
      initializeMap(mapboxToken.trim());
    }
  };

  useEffect(() => {
    // Reinitialize map when spots or centerLocation change and token is already entered
    if (tokenEntered && mapboxToken) {
      if (map.current) {
        map.current.remove();
      }
      initializeMap(mapboxToken);
    }
  }, [spots, centerLocation, tokenEntered, mapboxToken]);

  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  if (!tokenEntered) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Map Configuration Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              To display the interactive map, please enter your Mapbox public token. 
              You can get one from{' '}
              <a 
                href="https://mapbox.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                mapbox.com
              </a>
            </p>
            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <div>
                <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
                <Input
                  id="mapbox-token"
                  type="text"
                  placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSI..."
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Load Map
              </Button>
            </form>
          </CardContent>
        </Card>
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