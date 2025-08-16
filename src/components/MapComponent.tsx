import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface ParkingSpot {
  id: string | number;
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
  onSpotSelect: (spotId: string | number) => void;
  centerLocation?: { latitude: number; longitude: number } | null;
}

export const MapComponent = ({ spots, onSpotSelect, centerLocation }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const onSpotSelectRef = useRef(onSpotSelect);

  // Update the ref when onSpotSelect changes
  useEffect(() => {
    onSpotSelectRef.current = onSpotSelect;
  }, [onSpotSelect]);

  // Initialize map only once
  useEffect(() => {
    // Add a small delay to ensure the component is fully rendered
    const timeoutId = setTimeout(() => {
      if (map.current || isInitialized) return;

      const initializeMap = async () => {
        if (!mapContainer.current) {
          console.error('Map container not ready');
          return;
        }

        try {
          console.log('Initializing map...');
          
          // Fetch Mapbox token securely from edge function
          const { data: tokenData, error } = await supabase.functions.invoke('get-mapbox-token');
          
          if (error || !tokenData?.token) {
            console.error('Failed to fetch Mapbox token:', error);
            return;
          }

          console.log('Mapbox token fetched successfully');

          // Set the Mapbox access token securely
          mapboxgl.accessToken = tokenData.token;

          const mapCenter: [number, number] = centerLocation 
            ? [centerLocation.longitude, centerLocation.latitude]
            : spots.length > 0 
              ? [spots[0].longitude, spots[0].latitude] 
              : [-74.006, 40.7128];

          console.log('Creating map with center:', mapCenter);

          // Create map instance
          map.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: mapCenter,
            zoom: 12,
            attributionControl: false,
            logoPosition: 'bottom-right'
          });

          console.log('Map instance created');

          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

          // Wait for map to load before adding markers
          map.current.on('load', () => {
            console.log('Map loaded, adding markers for', spots.length, 'spots');
            
            // Add search location marker first (so it appears below parking spots)
            if (centerLocation) {
              new mapboxgl.Marker({
                color: '#ef4444',
                scale: 0.8, // Make search marker slightly smaller
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
            
            // Add parking spot markers after (so they appear on top and are clickable)
            spots.forEach((spot) => {
              // Skip spots without valid coordinates
              if (!spot.latitude || !spot.longitude) {
                console.warn(`Skipping spot ${spot.id} - missing coordinates:`, { lat: spot.latitude, lng: spot.longitude });
                return;
              }
              
              // If spot is very close to search location, offset it slightly so both are visible
              let spotLng = spot.longitude;
              let spotLat = spot.latitude;
              
              if (centerLocation) {
                const distance = Math.sqrt(
                  Math.pow(spot.longitude - centerLocation.longitude, 2) + 
                  Math.pow(spot.latitude - centerLocation.latitude, 2)
                );
                
                // If markers are too close (within ~50 meters), offset the parking spot marker slightly
                if (distance < 0.0005) {
                  spotLng += 0.0002; // Small offset to make both markers visible and clickable
                  spotLat += 0.0001;
                }
              }
              
              const marker = new mapboxgl.Marker({
                color: '#3B82F6',
                scale: 1.1, // Make parking spot markers slightly larger
              })
                .setLngLat([spotLng, spotLat])
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
                        onclick="window.selectSpot && window.selectSpot(${spot.id})" 
                        class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 w-full"
                      >
                        Book Now
                      </button>
                    </div>
                  `)
                )
                .addTo(map.current!);
            });

            (window as any).selectSpot = (spotId: string | number) => {
              onSpotSelectRef.current(spotId);
            };
            setIsInitialized(true);
            console.log('Map initialization complete');
          });

          // Handle map errors
          map.current.on('error', (e) => {
            console.error('Map error:', e);
          });

        } catch (error) {
          console.error('Error initializing map:', error);
        }
      };

      initializeMap();
    }, 250); // Increased delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      if (map.current) {
        map.current.remove();
        map.current = null;
        setIsInitialized(false);
      }
    };
  }, []); // Empty dependency array - only run once

  // Update markers when spots or centerLocation change
  useEffect(() => {
    if (!map.current || !isInitialized) return;

    console.log('Updating markers for', spots.length, 'spots');
    
    // Clear existing markers (we'll recreate them)
    // Note: In a production app, you'd want to track markers and only update what changed
    
    // Clear existing markers (we'll recreate them)
    // Note: In a production app, you'd want to track markers and only update what changed
    
    // Add search location marker first (if exists)
    if (centerLocation) {
      // Update map center
      map.current.setCenter([centerLocation.longitude, centerLocation.latitude]);
      
      new mapboxgl.Marker({
        color: '#ef4444',
        scale: 0.8, // Make search marker slightly smaller
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
    
    // Add parking spot markers after (so they appear on top)
    spots.forEach((spot) => {
      // Skip spots without valid coordinates
      if (!spot.latitude || !spot.longitude) {
        console.warn(`Skipping spot ${spot.id} - missing coordinates:`, { lat: spot.latitude, lng: spot.longitude });
        return;
      }
      
      // If spot is very close to search location, offset it slightly so both are visible
      let spotLng = spot.longitude;
      let spotLat = spot.latitude;
      
      if (centerLocation) {
        const distance = Math.sqrt(
          Math.pow(spot.longitude - centerLocation.longitude, 2) + 
          Math.pow(spot.latitude - centerLocation.latitude, 2)
        );
        
        // If markers are too close (within ~50 meters), offset the parking spot marker slightly
        if (distance < 0.0005) {
          spotLng += 0.0002; // Small offset to make both markers visible and clickable
          spotLat += 0.0001;
        }
      }
      
      const marker = new mapboxgl.Marker({
        color: '#3B82F6',
        scale: 1.1, // Make parking spot markers slightly larger
      })
        .setLngLat([spotLng, spotLat])
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
                onclick="window.selectSpot && window.selectSpot(${spot.id})" 
                class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 w-full"
              >
                Book Now
              </button>
            </div>
          `)
        )
        .addTo(map.current!);
    });
  }, [spots, centerLocation, isInitialized]);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default MapComponent;