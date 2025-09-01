import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

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
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Memoize spots to prevent unnecessary re-renders when array reference changes
  const memoizedSpots = useMemo(() => spots, [
    spots.length, 
    spots.map(s => `${s.id}-${s.latitude}-${s.longitude}-${s.address}`).join(',')
  ]);

  // Memoize centerLocation to prevent unnecessary re-renders  
  const memoizedCenterLocation = useMemo(() => centerLocation, [
    centerLocation?.latitude,
    centerLocation?.longitude
  ]);

  // Get pin color based on pricing type and spot type
  const getPinColor = (spot: ParkingSpot, isMultiple: boolean = false) => {
    // If it's a clustered location, use a darker shade
    const opacity = isMultiple ? '1' : '0.9';
    
    // Color by pricing type
    switch (spot.pricingType) {
      case 'hourly':
        return `rgba(59, 130, 246, ${opacity})`; // Blue
      case 'daily':
        return `rgba(34, 197, 94, ${opacity})`; // Green
      case 'monthly':
        return `rgba(168, 85, 247, ${opacity})`; // Purple
      case 'one_time':
        return `rgba(249, 115, 22, ${opacity})`; // Orange
      default:
        return `rgba(107, 114, 128, ${opacity})`; // Gray
    }
  };

  // Get additional styling for entire lots/garages
  const getPinScale = (spot: ParkingSpot, isMultiple: boolean = false) => {
    const baseScale = isMultiple ? 1.3 : 1.1;
    // Make entire garages/lots slightly larger
    const isEntireSpace = spot.type?.toLowerCase().includes('garage') || 
                         spot.type?.toLowerCase().includes('lot') ||
                         spot.spotType?.includes('garage') ||
                         spot.spotType?.includes('lot');
    return isEntireSpace ? baseScale + 0.2 : baseScale;
  };

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

          const mapCenter: [number, number] = memoizedCenterLocation 
            ? [memoizedCenterLocation.longitude, memoizedCenterLocation.latitude]
            : memoizedSpots.length > 0 
              ? [memoizedSpots[0].longitude, memoizedSpots[0].latitude] 
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
            console.log('Map loaded, adding markers for', memoizedSpots.length, 'spots');
            
            // Add search location marker first (so it appears below parking spots)
            if (memoizedCenterLocation) {
              new mapboxgl.Marker({
                color: '#ef4444',
                scale: 0.8, // Make search marker slightly smaller
              })
                .setLngLat([memoizedCenterLocation.longitude, memoizedCenterLocation.latitude])
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
            
            // Clear any existing markers
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];
            
            // Group spots by exact address
            const groupedSpots = new Map();
            
            memoizedSpots.forEach((spot) => {
              if (!spot.latitude || !spot.longitude) {
                console.warn(`Skipping spot ${spot.id} - missing coordinates:`, { lat: spot.latitude, lng: spot.longitude });
                return;
              }
              
              // Group by exact address
              if (groupedSpots.has(spot.address)) {
                groupedSpots.get(spot.address)!.spots.push(spot);
              } else {
                groupedSpots.set(spot.address, {
                  latitude: spot.latitude,
                  longitude: spot.longitude,
                  spots: [spot]
                });
              }
            });
            
            console.log('Grouped spots:', Array.from(groupedSpots.entries()).map(([address, group]) => ({
              address,
              count: group.spots.length,
              coordinates: [group.latitude, group.longitude]
            })));
            
            // Create markers for each group
            groupedSpots.forEach((group) => {
              const isMultipleSpots = group.spots.length > 1;
              const primarySpot = group.spots[0]; // Use first spot for color/scale decisions
              
              // Create popup content function
              const createPopupContent = (currentIndex = 0) => {
                const spot = group.spots[currentIndex];
                const isMultiple = group.spots.length > 1;
                
                return `
                  <div class="p-2" style="min-width: 200px;">
                    ${isMultiple ? `
                      <div class="flex justify-between items-center mb-2">
                        <span class="text-xs text-gray-500">${currentIndex + 1} of ${group.spots.length} spots</span>
                        <div class="flex gap-1">
                          <button 
                            id="prev-btn-${group.latitude}-${group.longitude}" 
                            class="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                            ${currentIndex === 0 ? 'disabled style="opacity: 0.5;"' : ''}
                          >←</button>
                          <button 
                            id="next-btn-${group.latitude}-${group.longitude}" 
                            class="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                            ${currentIndex === group.spots.length - 1 ? 'disabled style="opacity: 0.5;"' : ''}
                          >→</button>
                        </div>
                      </div>
                    ` : ''}
                    <h3 class="font-bold text-sm">${spot.title}</h3>
                    <p class="text-xs text-gray-600">${spot.address}</p>
                    <div class="flex justify-between items-center mb-2">
                      <p class="text-sm font-semibold">$${spot.price}${spot.pricingType === 'hourly' ? '/hr' : spot.pricingType === 'daily' ? '/day' : spot.pricingType === 'monthly' ? '/mo' : ''}</p>
                      ${spot.distance ? `<p class="text-xs text-gray-500">${spot.distance}</p>` : ''}
                    </div>
                    <button 
                      id="book-btn-${spot.id}" 
                      class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 w-full"
                    >
                      Book Now
                    </button>
                  </div>
                `;
              };
              
              let marker;
              
      if (isMultipleSpots) {
        // Create a custom pin-shaped marker with a number badge for multiple spots
        const el = document.createElement('div');
        el.className = 'multiple-spot-marker';
        el.style.cssText = `
          position: relative;
          cursor: pointer;
        `;
        
        // Create pin shape with SVG
        el.innerHTML = `
          <svg width="32" height="40" viewBox="0 0 32 40" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <path d="M16 0C7.164 0 0 7.164 0 16s16 24 16 24 16-15.164 16-24S24.836 0 16 0z" 
                  fill="${getPinColor(primarySpot, isMultipleSpots)}" 
                  stroke="white" 
                  stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold" 
                  style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${group.spots.length}</text>
          </svg>
        `;
        
                marker = new mapboxgl.Marker(el)
                  .setLngLat([group.longitude, group.latitude])
                  .setPopup(
                    new mapboxgl.Popup({ offset: 25 }).setHTML(createPopupContent(0))
                  )
                  .addTo(map.current!);
                
                // Store marker reference
                markersRef.current.push(marker);
      } else {
                // Regular single-color marker for single spots
                marker = new mapboxgl.Marker({
                  color: getPinColor(primarySpot, isMultipleSpots),
                  scale: getPinScale(primarySpot, isMultipleSpots),
                })
                  .setLngLat([group.longitude, group.latitude])
                  .setPopup(
                    new mapboxgl.Popup({ offset: 25 }).setHTML(createPopupContent(0))
                  )
                  .addTo(map.current!);
                
                // Store marker reference
                markersRef.current.push(marker);
              }

              // Track current spot index for this marker
              let currentSpotIndex = 0;
              
              // Function to attach event listeners
              const attachEventListeners = () => {
                const currentSpot = group.spots[currentSpotIndex];
                
                // Book button event
                const bookBtn = document.getElementById(`book-btn-${currentSpot.id}`);
                if (bookBtn) {
                  bookBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSpotSelectRef.current(currentSpot.id);
                  });
                }
                
                // Navigation buttons for multiple spots
                if (group.spots.length > 1) {
                  const prevBtn = document.getElementById(`prev-btn-${group.latitude}-${group.longitude}`) as HTMLButtonElement;
                  const nextBtn = document.getElementById(`next-btn-${group.latitude}-${group.longitude}`) as HTMLButtonElement;
                  
                  if (prevBtn) {
                    prevBtn.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentSpotIndex > 0) {
                        currentSpotIndex--;
                        marker.getPopup().setHTML(createPopupContent(currentSpotIndex));
                        setTimeout(attachEventListeners, 100);
                      }
                    });
                  }
                  
                  if (nextBtn) {
                    nextBtn.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentSpotIndex < group.spots.length - 1) {
                        currentSpotIndex++;
                        marker.getPopup().setHTML(createPopupContent(currentSpotIndex));
                        setTimeout(attachEventListeners, 100);
                      }
                    });
                  }
                }
              };
              
              // Add click event listeners when popup opens
              marker.getPopup().on('open', () => {
                currentSpotIndex = 0; // Reset to first spot
                setTimeout(attachEventListeners, 150);
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
      // Clear markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
        setIsInitialized(false);
      }
    };
  }, []); // Empty dependency array - only run once

  // Center map when centerLocation changes (separate from marker updates)
  useEffect(() => {
    if (!map.current || !isInitialized || !memoizedCenterLocation) return;
    
    console.log('Centering map to:', memoizedCenterLocation);
    map.current.setCenter([memoizedCenterLocation.longitude, memoizedCenterLocation.latitude]);
  }, [memoizedCenterLocation, isInitialized]);

  // Update markers when spots or centerLocation change
  useEffect(() => {
    if (!map.current || !isInitialized) return;

    console.log('Updating markers for', memoizedSpots.length, 'spots');
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Add search location marker first (if exists)
    if (memoizedCenterLocation) {
      // DON'T update map center here - that's done in separate useEffect
      const searchMarker = new mapboxgl.Marker({
        color: '#ef4444',
        scale: 0.8,
      })
        .setLngLat([memoizedCenterLocation.longitude, memoizedCenterLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <h3 class="font-bold text-sm">Search Location</h3>
              <p class="text-xs text-gray-600">Your searched location</p>
            </div>
          `)
        )
        .addTo(map.current!);
      
      markersRef.current.push(searchMarker);
    }
    
    // Group spots by exact address
    const groupedSpots = new Map();
    
    memoizedSpots.forEach((spot) => {
      if (!spot.latitude || !spot.longitude) {
        console.warn(`Skipping spot ${spot.id} - missing coordinates:`, { lat: spot.latitude, lng: spot.longitude });
        return;
      }
      
      // Group by exact address
      if (groupedSpots.has(spot.address)) {
        groupedSpots.get(spot.address)!.spots.push(spot);
      } else {
        groupedSpots.set(spot.address, {
          latitude: spot.latitude,
          longitude: spot.longitude,
          spots: [spot]
        });
      }
    });
    
    console.log('Update - Grouped spots:', Array.from(groupedSpots.entries()).map(([address, group]) => ({
      address,
      count: group.spots.length,
      coordinates: [group.latitude, group.longitude]
    })));
    
    // Create markers for each group
    groupedSpots.forEach((group) => {
      const isMultipleSpots = group.spots.length > 1;
      const primarySpot = group.spots[0]; // Use first spot for color/scale decisions
      
      // Create popup content function
      const createPopupContent = (currentIndex = 0) => {
        const spot = group.spots[currentIndex];
        const isMultiple = group.spots.length > 1;
        
        return `
          <div class="p-2" style="min-width: 200px;">
            ${isMultiple ? `
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs text-gray-500">${currentIndex + 1} of ${group.spots.length} spots</span>
                <div class="flex gap-1">
                  <button 
                    id="prev-btn-update-${group.latitude}-${group.longitude}" 
                    class="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                    ${currentIndex === 0 ? 'disabled style="opacity: 0.5;"' : ''}
                  >←</button>
                  <button 
                    id="next-btn-update-${group.latitude}-${group.longitude}" 
                    class="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                    ${currentIndex === group.spots.length - 1 ? 'disabled style="opacity: 0.5;"' : ''}
                  >→</button>
                </div>
              </div>
            ` : ''}
            <h3 class="font-bold text-sm">${spot.title}</h3>
            <p class="text-xs text-gray-600">${spot.address}</p>
            <div class="flex justify-between items-center mb-2">
              <p class="text-sm font-semibold">$${spot.price}${spot.pricingType === 'hourly' ? '/hr' : spot.pricingType === 'daily' ? '/day' : spot.pricingType === 'monthly' ? '/mo' : ''}</p>
              ${spot.distance ? `<p class="text-xs text-gray-500">${spot.distance}</p>` : ''}
            </div>
            <button 
              id="book-btn-update-${spot.id}" 
              class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 w-full"
            >
              Book Now
            </button>
          </div>
        `;
      };
      
      let marker;
      
      if (isMultipleSpots) {
        // Create a custom pin-shaped marker with a number badge for multiple spots
        const el = document.createElement('div');
        el.className = 'multiple-spot-marker';
        el.style.cssText = `
          position: relative;
          cursor: pointer;
        `;
        
        // Create pin shape with SVG
        el.innerHTML = `
          <svg width="32" height="40" viewBox="0 0 32 40" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <path d="M16 0C7.164 0 0 7.164 0 16s16 24 16 24 16-15.164 16-24S24.836 0 16 0z" 
                  fill="${getPinColor(primarySpot, isMultipleSpots)}" 
                  stroke="white" 
                  stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold" 
                  style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${group.spots.length}</text>
          </svg>
        `;
        
        marker = new mapboxgl.Marker(el)
          .setLngLat([group.longitude, group.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(createPopupContent(0))
          )
          .addTo(map.current!);
        
        markersRef.current.push(marker);
      } else {
        // Regular single-color marker for single spots
        marker = new mapboxgl.Marker({
          color: getPinColor(primarySpot, isMultipleSpots),
          scale: getPinScale(primarySpot, isMultipleSpots),
        })
          .setLngLat([group.longitude, group.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(createPopupContent(0))
          )
          .addTo(map.current!);
        
        markersRef.current.push(marker);
      }

      // Track current spot index for this marker
      let currentSpotIndex = 0;
      
      // Function to update popup content and reattach listeners
      const updatePopupContent = (newIndex) => {
        currentSpotIndex = newIndex;
        const newContent = createPopupContent(currentSpotIndex);
        marker.getPopup().setHTML(newContent);
        
        // Reattach event listeners after content update
        setTimeout(() => {
          attachEventListeners();
        }, 50);
      };
      
      // Function to attach event listeners
      const attachEventListeners = () => {
        const currentSpot = group.spots[currentSpotIndex];
        
        // Book button event
        const bookBtn = document.getElementById(`book-btn-update-${currentSpot.id}`);
        if (bookBtn) {
          bookBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onSpotSelectRef.current(currentSpot.id);
          });
        }
        
        // Navigation buttons for multiple spots
        if (group.spots.length > 1) {
          const prevBtn = document.getElementById(`prev-btn-update-${group.latitude}-${group.longitude}`) as HTMLButtonElement;
          const nextBtn = document.getElementById(`next-btn-update-${group.latitude}-${group.longitude}`) as HTMLButtonElement;
          
          if (prevBtn && !prevBtn.disabled) {
            prevBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (currentSpotIndex > 0) {
                updatePopupContent(currentSpotIndex - 1);
              }
            });
          }
          
          if (nextBtn && !nextBtn.disabled) {
            nextBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (currentSpotIndex < group.spots.length - 1) {
                updatePopupContent(currentSpotIndex + 1);
              }
            });
          }
        }
      };
      
      // Add click event listeners when popup opens
      marker.getPopup().on('open', () => {
        setTimeout(() => {
          attachEventListeners();
        }, 100);
      });
    });
  }, [memoizedSpots, memoizedCenterLocation, isInitialized]);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default MapComponent;