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
              
              // Create popup content
              const createPopupContent = (currentIndex = 0) => {
                const spot = group.spots[currentIndex];
                const isMultiple = group.spots.length > 1;
                const isPremium = spot.isPremiumLister || false;
                
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
              };
              
              const marker = new mapboxgl.Marker({
                color: getPinColor(primarySpot, isMultipleSpots),
                scale: getPinScale(primarySpot, isMultipleSpots),
              })
                .setLngLat([group.longitude, group.latitude])
                .setPopup(
                  new mapboxgl.Popup({ offset: 25 }).setHTML(createPopupContent(0))
                )
                .addTo(map.current!);

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
      
      // Create popup content
      const createPopupContent = (currentIndex = 0) => {
        const spot = group.spots[currentIndex];
        const isMultiple = group.spots.length > 1;
        const isPremium = spot.isPremiumLister || false;
        
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
      };
      
      const marker = new mapboxgl.Marker({
        color: getPinColor(primarySpot, isMultipleSpots),
        scale: getPinScale(primarySpot, isMultipleSpots),
      })
        .setLngLat([group.longitude, group.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(createPopupContent(0))
        )
        .addTo(map.current!);

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