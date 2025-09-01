import React, { useEffect, useRef, useState } from 'react';
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

  // Get pin color based on pricing type and spot type
  const getPinColor = (spot: ParkingSpot, isMultiple: boolean = false, allSpots?: ParkingSpot[]) => {
    // Check if this is a mixed payment type location
    if (isMultiple && allSpots && allSpots.length > 1) {
      const paymentTypes = [...new Set(allSpots.map(s => s.pricingType))];
      if (paymentTypes.length > 1) {
        // Return gradient for mixed payment types
        return 'mixed';
      }
    }
    
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
            
            // Group spots by location (within ~50 meters)
            const groupedSpots = new Map();
            const tolerance = 0.0005; // ~50 meters
            
            spots.forEach((spot) => {
              if (!spot.latitude || !spot.longitude) {
                console.warn(`Skipping spot ${spot.id} - missing coordinates:`, { lat: spot.latitude, lng: spot.longitude });
                return;
              }
              
              // Check if there's already a group for this location
              let foundGroup = false;
              for (const [key, group] of groupedSpots) {
                const [groupLat, groupLng] = key.split(',').map(Number);
                const distance = Math.sqrt(
                  Math.pow(spot.longitude - groupLng, 2) + 
                  Math.pow(spot.latitude - groupLat, 2)
                );
                
                if (distance < tolerance) {
                  group.spots.push(spot);
                  foundGroup = true;
                  break;
                }
              }
              
              if (!foundGroup) {
                // If spot is very close to search location, offset it slightly
                let spotLng = spot.longitude;
                let spotLat = spot.latitude;
                
                if (centerLocation) {
                  const distance = Math.sqrt(
                    Math.pow(spot.longitude - centerLocation.longitude, 2) + 
                    Math.pow(spot.latitude - centerLocation.latitude, 2)
                  );
                  
                  if (distance < tolerance) {
                    spotLng += 0.0002;
                    spotLat += 0.0001;
                  }
                }
                
                groupedSpots.set(`${spotLat},${spotLng}`, {
                  latitude: spotLat,
                  longitude: spotLng,
                  spots: [spot]
                });
              }
            });
            
            // Create markers for each group
            groupedSpots.forEach((group) => {
              const isMultipleSpots = group.spots.length > 1;
              const primarySpot = group.spots[0]; // Use first spot for color/scale decisions
              const pinColor = getPinColor(primarySpot, isMultipleSpots, group.spots);
              
              // Check if this location has mixed payment types
              const paymentTypes = [...new Set(group.spots.map(s => s.pricingType))];
              const hasMixedTypes = paymentTypes.length > 1;
              
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
              
              if (hasMixedTypes) {
                // Create a custom marker with multiple colors
                const el = document.createElement('div');
                el.className = 'mixed-payment-marker';
                el.style.cssText = `
                  width: ${getPinScale(primarySpot, isMultipleSpots) * 24}px;
                  height: ${getPinScale(primarySpot, isMultipleSpots) * 24}px;
                  background: conic-gradient(
                    ${paymentTypes.includes('hourly') ? 'rgb(59, 130, 246) 0deg 90deg,' : ''}
                    ${paymentTypes.includes('daily') ? 'rgb(34, 197, 94) 90deg 180deg,' : ''}
                    ${paymentTypes.includes('monthly') ? 'rgb(168, 85, 247) 180deg 270deg,' : ''}
                    ${paymentTypes.includes('one_time') ? 'rgb(249, 115, 22) 270deg 360deg' : ''}
                  );
                  border-radius: 50%;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  cursor: pointer;
                  position: relative;
                `;
                
                // Add a small icon in the center
                el.innerHTML = `<div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 8px;
                  height: 8px;
                  background: white;
                  border-radius: 50%;
                  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
                "></div>`;
                
                marker = new mapboxgl.Marker(el)
                  .setLngLat([group.longitude, group.latitude])
                  .setPopup(
                    new mapboxgl.Popup({ offset: 25 }).setHTML(createPopupContent(0))
                  )
                  .addTo(map.current!);
              } else {
                // Regular single-color marker
                marker = new mapboxgl.Marker({
                  color: pinColor,
                  scale: getPinScale(primarySpot, isMultipleSpots),
                })
                  .setLngLat([group.longitude, group.latitude])
                  .setPopup(
                    new mapboxgl.Popup({ offset: 25 }).setHTML(createPopupContent(0))
                  )
                  .addTo(map.current!);
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
    
    // Group spots by location (within ~50 meters) - same logic as initialization
    const groupedSpots = new Map();
    const tolerance = 0.0005;
    
    spots.forEach((spot) => {
      if (!spot.latitude || !spot.longitude) {
        console.warn(`Skipping spot ${spot.id} - missing coordinates:`, { lat: spot.latitude, lng: spot.longitude });
        return;
      }
      
      // Check if there's already a group for this location
      let foundGroup = false;
      for (const [key, group] of groupedSpots) {
        const [groupLat, groupLng] = key.split(',').map(Number);
        const distance = Math.sqrt(
          Math.pow(spot.longitude - groupLng, 2) + 
          Math.pow(spot.latitude - groupLat, 2)
        );
        
        if (distance < tolerance) {
          group.spots.push(spot);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        // If spot is very close to search location, offset it slightly
        let spotLng = spot.longitude;
        let spotLat = spot.latitude;
        
        if (centerLocation) {
          const distance = Math.sqrt(
            Math.pow(spot.longitude - centerLocation.longitude, 2) + 
            Math.pow(spot.latitude - centerLocation.latitude, 2)
          );
          
          if (distance < tolerance) {
            spotLng += 0.0002;
            spotLat += 0.0001;
          }
        }
        
        groupedSpots.set(`${spotLat},${spotLng}`, {
          latitude: spotLat,
          longitude: spotLng,
          spots: [spot]
        });
      }
    });
    
    // Create markers for each group
    groupedSpots.forEach((group) => {
      const isMultipleSpots = group.spots.length > 1;
      const primarySpot = group.spots[0]; // Use first spot for color/scale decisions
      const pinColor = getPinColor(primarySpot, isMultipleSpots, group.spots);
      
      // Check if this location has mixed payment types
      const paymentTypes = [...new Set(group.spots.map(s => s.pricingType))];
      const hasMixedTypes = paymentTypes.length > 1;
      
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
      
      if (hasMixedTypes) {
        // Create a custom marker with multiple colors
        const el = document.createElement('div');
        el.className = 'mixed-payment-marker';
        el.style.cssText = `
          width: ${getPinScale(primarySpot, isMultipleSpots) * 24}px;
          height: ${getPinScale(primarySpot, isMultipleSpots) * 24}px;
          background: conic-gradient(
            ${paymentTypes.includes('hourly') ? 'rgb(59, 130, 246) 0deg 90deg,' : ''}
            ${paymentTypes.includes('daily') ? 'rgb(34, 197, 94) 90deg 180deg,' : ''}
            ${paymentTypes.includes('monthly') ? 'rgb(168, 85, 247) 180deg 270deg,' : ''}
            ${paymentTypes.includes('one_time') ? 'rgb(249, 115, 22) 270deg 360deg' : ''}
          );
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          cursor: pointer;
          position: relative;
        `;
        
        // Add a small icon in the center
        el.innerHTML = `<div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        "></div>`;
        
        marker = new mapboxgl.Marker(el)
          .setLngLat([group.longitude, group.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(createPopupContent(0))
          )
          .addTo(map.current!);
      } else {
        // Regular single-color marker
        marker = new mapboxgl.Marker({
          color: pinColor,
          scale: getPinScale(primarySpot, isMultipleSpots),
        })
          .setLngLat([group.longitude, group.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(createPopupContent(0))
          )
          .addTo(map.current!);
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
  }, [spots, centerLocation, isInitialized]);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default MapComponent;