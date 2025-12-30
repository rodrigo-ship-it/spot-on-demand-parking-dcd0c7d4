import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { PremiumBadge } from './PremiumBadge';

interface ParkingSpot {
  id: string | number;
  title: string;
  address: string;
  price: number;
  pricingType?: string;
  rating: number;
  latitude: number;
  longitude: number;
  type: string;
  spotType?: string;
  available: string;
  distance?: string;
  owner_id?: string;
  isPremiumLister?: boolean;
  totalReviews?: number;
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
  const [premiumStatuses, setPremiumStatuses] = useState<Record<string, boolean>>({});

  // Get pin color based on pricing type
  const getPinColor = (spot: ParkingSpot) => {
    // Color by pricing type
    switch (spot.pricingType) {
      case 'hourly':
        return '#3b82f6'; // Blue
      case 'daily':
        return '#22c55e'; // Green
      case 'monthly':
        return '#a855f7'; // Purple
      case 'one_time':
        return '#f97316'; // Orange
      default:
        return '#6b7280'; // Gray
    }
  };


  // Premium statuses are already fetched and set on spots by the parent component
  // No need to fetch again - just use the isPremiumLister property

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
            
            // Track ORIGINAL positions to detect overlaps (not offset positions)
            const originalPositions: { lat: number; lng: number; count: number }[] = [];
            const tolerance = 0.0001; // ~10 meters - tighter tolerance for exact matches
            
            // First pass: count how many spots are at each location
            spots.forEach((spot) => {
              if (!spot.latitude || !spot.longitude) return;
              
              const existing = originalPositions.find(pos => 
                Math.abs(pos.lat - spot.latitude!) < tolerance && 
                Math.abs(pos.lng - spot.longitude!) < tolerance
              );
              
              if (existing) {
                existing.count++;
              } else {
                originalPositions.push({ lat: spot.latitude, lng: spot.longitude, count: 1 });
              }
            });
            
            // Track how many we've placed at each position for offset calculation
            const placedAtPosition: Map<string, number> = new Map();
            
            // Create individual markers for each spot
            spots.forEach((spot, index) => {
              if (!spot.latitude || !spot.longitude) {
                console.warn(`Skipping spot ${spot.id} - missing coordinates:`, { lat: spot.latitude, lng: spot.longitude });
                return;
              }
              
              // Find which original position this spot belongs to
              const posKey = `${spot.latitude.toFixed(5)},${spot.longitude.toFixed(5)}`;
              const placedCount = placedAtPosition.get(posKey) || 0;
              placedAtPosition.set(posKey, placedCount + 1);
              
              let spotLng = spot.longitude;
              let spotLat = spot.latitude;
              
              // Apply spiral offset for overlapping spots (starting from the 2nd spot at same location)
              if (placedCount > 0) {
                const angle = (placedCount * 120) * (Math.PI / 180); // 120 degrees apart (triangle pattern)
                const offsetDistance = 0.00012; // Very small offset - just enough to see pins
                spotLng += Math.cos(angle) * offsetDistance;
                spotLat += Math.sin(angle) * offsetDistance;
              }
              
              // Also check if too close to search location
              if (centerLocation) {
                const distToCenter = Math.sqrt(
                  Math.pow(spotLng - centerLocation.longitude, 2) + 
                  Math.pow(spotLat - centerLocation.latitude, 2)
                );
                if (distToCenter < tolerance) {
                  spotLng += 0.0003;
                  spotLat += 0.0002;
                }
              }
              
              const isPremium = spot.isPremiumLister || false;
              
              // Create popup content for this spot
              const popupContent = `
                <div class="p-2" style="min-width: 200px;">
                  <div class="flex items-center justify-between mb-1">
                    <h3 class="font-bold text-sm mr-2 flex-1">${spot.title}</h3>
                    ${isPremium ? `
                      <svg class="shrink-0 text-amber-600 fill-amber-600" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M3 10l2-5 4 3 3-4 3 4 4-3 2 5v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3z"/>
                      </svg>
                    ` : ''}
                  </div>
                  <p class="text-xs text-gray-600">${spot.address}</p>
                  <div class="flex justify-between items-center mb-2">
                    <p class="text-sm font-semibold">$${spot.price}${spot.pricingType === 'hourly' ? '/hr' : spot.pricingType === 'daily' ? '/day' : spot.pricingType === 'monthly' ? '/mo' : ''}</p>
                    ${spot.distance ? `<p class="text-xs text-gray-500">${spot.distance}</p>` : ''}
                  </div>
                  ${spot.rating > 0 ? `
                    <div class="flex items-center mb-2">
                      <svg class="w-3 h-3 text-yellow-500 fill-current mr-1" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span class="text-xs font-medium">${spot.rating}</span>
                      <span class="text-xs text-gray-500 ml-1">(${spot.totalReviews || 0} reviews)</span>
                    </div>
                  ` : `
                    <div class="text-xs text-gray-400 mb-2">No rating yet</div>
                  `}
                  <button 
                    id="book-btn-${spot.id}" 
                    class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 w-full"
                  >
                    Book Now
                  </button>
                </div>
              `;
              
              // Create custom SVG marker for ALL spots (consistent shape/size)
              const el = document.createElement('div');
              el.className = isPremium ? 'premium-pin-marker' : 'pin-marker';
              const pinColor = getPinColor(spot);
              
              // Use same SVG for both premium and non-premium - only difference is the gold stroke
              el.innerHTML = `
                <svg width="27" height="41" viewBox="0 0 27 41" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.5 1C6.596 1 1 6.596 1 13.5C1 23 13.5 40 13.5 40S26 23 26 13.5C26 6.596 20.404 1 13.5 1Z" 
                        fill="${pinColor}" 
                        stroke="${isPremium ? '#d4af37' : pinColor}" 
                        stroke-width="${isPremium ? '2' : '0.5'}"/>
                  <circle cx="13.5" cy="13.5" r="4" fill="white"/>
                </svg>
              `;
              el.style.cssText = `cursor: pointer;`;
              
              const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([spotLng, spotLat])
                .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
                .addTo(map.current!);
              
              // Add click event listener when popup opens
              marker.getPopup().on('open', () => {
                setTimeout(() => {
                  const bookBtn = document.getElementById(`book-btn-${spot.id}`);
                  if (bookBtn) {
                    bookBtn.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSpotSelectRef.current(spot.id);
                    });
                  }
                }, 150);
              });
            });

            // Remove the global selectSpot function since we're using direct event listeners now
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
    
    // Clear existing markers by removing them
    // Note: In production, you'd want to track markers more efficiently
    
    // Add search location marker first (if exists)
    if (centerLocation) {
      // Update map center
      map.current.setCenter([centerLocation.longitude, centerLocation.latitude]);
      
      new mapboxgl.Marker({
        color: '#ef4444',
        scale: 0.8,
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
    
    // Track ORIGINAL positions to detect overlaps (not offset positions)
    const originalPositions: { lat: number; lng: number; count: number }[] = [];
    const tolerance = 0.0001; // ~10 meters - tighter tolerance for exact matches
    
    // First pass: count how many spots are at each location
    spots.forEach((spot) => {
      if (!spot.latitude || !spot.longitude) return;
      
      const existing = originalPositions.find(pos => 
        Math.abs(pos.lat - spot.latitude!) < tolerance && 
        Math.abs(pos.lng - spot.longitude!) < tolerance
      );
      
      if (existing) {
        existing.count++;
      } else {
        originalPositions.push({ lat: spot.latitude, lng: spot.longitude, count: 1 });
      }
    });
    
    // Track how many we've placed at each position for offset calculation
    const placedAtPosition: Map<string, number> = new Map();
    
    // Create individual markers for each spot
    spots.forEach((spot, index) => {
      if (!spot.latitude || !spot.longitude) {
        console.warn(`Skipping spot ${spot.id} - missing coordinates:`, { lat: spot.latitude, lng: spot.longitude });
        return;
      }
      
      // Find which original position this spot belongs to
      const posKey = `${spot.latitude.toFixed(5)},${spot.longitude.toFixed(5)}`;
      const placedCount = placedAtPosition.get(posKey) || 0;
      placedAtPosition.set(posKey, placedCount + 1);
      
      let spotLng = spot.longitude;
      let spotLat = spot.latitude;
      
      // Apply spiral offset for overlapping spots (starting from the 2nd spot at same location)
      if (placedCount > 0) {
        const angle = (placedCount * 120) * (Math.PI / 180); // 120 degrees apart (triangle pattern)
        const offsetDistance = 0.00012; // Very small offset - just enough to see pins
        spotLng += Math.cos(angle) * offsetDistance;
        spotLat += Math.sin(angle) * offsetDistance;
      }
      
      // Also check if too close to search location
      if (centerLocation) {
        const distToCenter = Math.sqrt(
          Math.pow(spotLng - centerLocation.longitude, 2) + 
          Math.pow(spotLat - centerLocation.latitude, 2)
        );
        if (distToCenter < tolerance) {
          spotLng += 0.0003;
          spotLat += 0.0002;
        }
      }
      
      const isPremium = spot.isPremiumLister || false;
      
      // Create popup content for this spot
      const popupContent = `
        <div class="p-2" style="min-width: 200px;">
          <div class="flex items-center justify-between mb-1">
            <h3 class="font-bold text-sm mr-2 flex-1">${spot.title}</h3>
            ${isPremium ? `
              <svg class="shrink-0 text-amber-600 fill-amber-600" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M3 10l2-5 4 3 3-4 3 4 4-3 2 5v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3z"/>
              </svg>
            ` : ''}
          </div>
          <p class="text-xs text-gray-600">${spot.address}</p>
          <div class="flex justify-between items-center mb-2">
            <p class="text-sm font-semibold">$${spot.price}${spot.pricingType === 'hourly' ? '/hr' : spot.pricingType === 'daily' ? '/day' : spot.pricingType === 'monthly' ? '/mo' : ''}</p>
            ${spot.distance ? `<p class="text-xs text-gray-500">${spot.distance}</p>` : ''}
          </div>
          ${spot.rating > 0 ? `
            <div class="flex items-center mb-2">
              <svg class="w-3 h-3 text-yellow-500 fill-current mr-1" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span class="text-xs font-medium">${spot.rating}</span>
              <span class="text-xs text-gray-500 ml-1">(${spot.totalReviews || 0} reviews)</span>
            </div>
          ` : `
            <div class="text-xs text-gray-400 mb-2">No rating yet</div>
          `}
          <button 
            id="book-btn-update-${spot.id}" 
            class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 w-full"
          >
            Book Now
          </button>
        </div>
      `;
      
      // Create custom SVG marker for ALL spots (consistent shape/size)
      const el = document.createElement('div');
      el.className = isPremium ? 'premium-pin-marker' : 'pin-marker';
      const pinColor = getPinColor(spot);
      
      // Use same SVG for both premium and non-premium - only difference is the gold stroke
      el.innerHTML = `
        <svg width="27" height="41" viewBox="0 0 27 41" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5 1C6.596 1 1 6.596 1 13.5C1 23 13.5 40 13.5 40S26 23 26 13.5C26 6.596 20.404 1 13.5 1Z" 
                fill="${pinColor}" 
                stroke="${isPremium ? '#d4af37' : pinColor}" 
                stroke-width="${isPremium ? '2' : '0.5'}"/>
          <circle cx="13.5" cy="13.5" r="4" fill="white"/>
        </svg>
      `;
      el.style.cssText = `cursor: pointer;`;
      
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([spotLng, spotLat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
        .addTo(map.current!);
      
      // Add click event listener when popup opens
      marker.getPopup().on('open', () => {
        setTimeout(() => {
          const bookBtn = document.getElementById(`book-btn-update-${spot.id}`);
          if (bookBtn) {
            bookBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              onSpotSelectRef.current(spot.id);
            });
          }
        }, 150);
      });
    });
  }, [spots, centerLocation, isInitialized]);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default MapComponent;