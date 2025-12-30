import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, DollarSign, Star, Clock, Car, Grid, List } from 'lucide-react';
import { AvailabilityDisplay } from '@/components/AvailabilityDisplay';
import { MapComponent } from '@/components/MapComponent';
import { MapLegend } from '@/components/MapLegend';
import { PremiumBadge } from '@/components/PremiumBadge';

interface ParkingSpot {
  id: string | number;
  title: string;
  address: string;
  price: number;
  pricingType?: string;
  rating: number;
  distance: string;
  type: string;
  spotType: string;
  totalSpots?: number;
  available: string;
  image: string;
  latitude?: number;
  longitude?: number;
  lat: number;
  lng: number;
  isPremiumLister?: boolean;
}

interface SearchResultsMapProps {
  searchLocation: string;
  searchCoordinates?: { latitude: number; longitude: number } | null;
  allSpots: ParkingSpot[];
  filteredSpots: ParkingSpot[];
  onSpotSelect: (spotId: string | number) => void;
}

const SearchResultsMap: React.FC<SearchResultsMapProps> = ({ searchLocation, searchCoordinates, allSpots, filteredSpots, onSpotSelect }) => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Function to calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in miles
    return d.toFixed(1);
  };

  // Update ALL spots with distances for the map
  const allSpotsWithDistance = allSpots.map(spot => {
    const referenceLocation = searchCoordinates || userLocation || { lat: 40.7128, lng: -74.006 };
    
    // Handle both possible coordinate formats
    const refLat = 'lat' in referenceLocation ? referenceLocation.lat : referenceLocation.latitude;
    const refLng = 'lng' in referenceLocation ? referenceLocation.lng : referenceLocation.longitude;
    
    const distance = calculateDistance(
      refLat,
      refLng,
      spot.latitude || spot.lat || 40.7128,
      spot.longitude || spot.lng || -74.006
    );
    
    return {
      ...spot,
      distance: `${distance} miles`,
      lat: spot.latitude || spot.lat || 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: spot.longitude || spot.lng || -74.006 + (Math.random() - 0.5) * 0.1
    };
  });

  // Update FILTERED spots with distances for the grid/list below
  const filteredSpotsWithDistance = filteredSpots.map(spot => {
    const referenceLocation = searchCoordinates || userLocation || { lat: 40.7128, lng: -74.006 };
    
    // Handle both possible coordinate formats
    const refLat = 'lat' in referenceLocation ? referenceLocation.lat : referenceLocation.latitude;
    const refLng = 'lng' in referenceLocation ? referenceLocation.lng : referenceLocation.longitude;
    
    const distance = calculateDistance(
      refLat,
      refLng,
      spot.latitude || spot.lat || 40.7128,
      spot.longitude || spot.lng || -74.006
    );
    
    return {
      ...spot,
      distance: `${distance} miles`,
      lat: spot.latitude || spot.lat || 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: spot.longitude || spot.lng || -74.006 + (Math.random() - 0.5) * 0.1
    };
  });

  useEffect(() => {
    // Request user location for map centering
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Default to NYC if geolocation fails
          setUserLocation({ lat: 40.7128, lng: -74.006 });
        }
      );
    } else {
      // Default to NYC if geolocation is not supported
      setUserLocation({ lat: 40.7128, lng: -74.006 });
    }
  }, []);

  const handleGetDirections = (spot: ParkingSpot) => {
    if (!userLocation) {
      alert('Location information unavailable. Please enable location access or try again.');
      return;
    }
    const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${spot.lat},${spot.lng}`;
    window.open(url, '_blank');
  };

  const MapView = () => (
    <div className="space-y-6">
      {/* Map Legend - positioned above the map */}
      <div className="flex justify-center">
        <MapLegend />
      </div>
      
      {/* Pass FILTERED spots to the map so only matching spots show */}
      <MapComponent 
        spots={filteredSpotsWithDistance.map(spot => ({
          ...spot,
          latitude: spot.lat,
          longitude: spot.lng,
        }))}
        onSpotSelect={onSpotSelect}
        centerLocation={searchCoordinates}
      />
      {/* Quick Spot Cards - only show filtered spots (nearby ones) */}
      {hasSpots && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpotsWithDistance.slice(0, 6).map((spot) => (
            <Card 
              key={spot.id} 
              className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/20 h-44 ${
                spot.isPremiumLister ? 'border-2 border-amber-400' : 'border'
              }`}
              onClick={() => onSpotSelect(spot.id)}
            >
              <CardContent className="p-4 h-full flex flex-col">
                {/* Header with title/address and price */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{spot.title}</h3>
                    <div className="flex items-center text-gray-600 text-xs mt-1">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{spot.address}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center text-lg font-bold text-gray-900">
                      <DollarSign className="w-4 h-4" />
                      {spot.price}{spot.pricingType === 'hourly' ? '/hr' : spot.pricingType === 'daily' ? '/day' : spot.pricingType === 'monthly' ? '/mo' : ''}
                    </div>
                    {spot.isPremiumLister && (
                      <div className="mt-1">
                        <PremiumBadge size="sm" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Type and distance row */}
                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="flex items-center text-gray-600">
                    <Car className="w-3 h-3 mr-1" />
                    <span className="truncate">{spot.type}</span>
                  </div>
                  <div className="flex items-center text-green-600 font-medium">
                    <Navigation className="w-3 h-3 mr-1" />
                    {spot.distance}
                  </div>
                </div>

                {/* Bottom row with rating and button */}
                <div className="flex justify-between items-center mt-auto pt-2 border-t">
                  {spot.rating > 0 ? (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1 fill-current" />
                      <span className="text-sm font-medium">{spot.rating}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No rating</span>
                  )}
                  <Button
                    size="sm"
                    variant="default"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSpotSelect(spot.id);
                    }}
                    className="text-xs bg-primary hover:bg-secondary"
                  >
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message when no spots are found */}
      {!hasSpots && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No parking spots found in this area</h3>
          <p className="text-gray-600">Try zooming out on the map above or search for a different location.</p>
        </div>
      )}
    </div>
  );

  const ListView = () => {
    return (
    <div className="space-y-4">
      {hasSpots ? (
        filteredSpotsWithDistance.map((spot) => (
          <Card 
            key={spot.id} 
            className={`group hover:shadow-xl transition-all duration-300 shadow-lg shadow-gray-900/5 hover:-translate-y-1 ${
              spot.isPremiumLister ? 'border-2 border-amber-400' : 'border-0'
            }`}
          >
            <div className="flex">
              <div className="relative w-48 h-32">
                <img 
                  src={spot.image} 
                  alt={spot.title}
                  className="w-full h-full object-cover rounded-l-lg"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center">
                  {spot.rating > 0 ? (
                    <>
                      <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
                      {spot.rating}
                    </>
                  ) : (
                    <span className="text-gray-400">No rating</span>
                  )}
                </div>
              </div>
              <div className="flex-1 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        {spot.title}
                      </h3>
                      <div className="flex items-center text-gray-600 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {spot.address}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">${spot.price}</div>
                      <div className="text-sm text-gray-500">
                        {spot.pricingType === 'hourly' ? 'per hour' : spot.pricingType === 'daily' ? 'per day' : spot.pricingType === 'one_time' ? 'one-time' : 'one-time'}
                      </div>
                      {spot.isPremiumLister && (
                        <div className="mt-1">
                          <PremiumBadge size="sm" />
                        </div>
                      )}
                    </div>
                  </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Car className="w-4 h-4 mr-1" />
                    {spot.type}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {spot.available}
                  </div>
                </div>
                
                <div className="mb-4">
                  <AvailabilityDisplay 
                    spotType={spot.spotType}
                    totalSpots={spot.totalSpots}
                    spotId={spot.id.toString()}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{spot.distance} away</span>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGetDirections(spot)}
                    >
                      <Navigation className="w-4 h-4 mr-1" />
                      Directions
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-primary hover:bg-secondary text-primary-foreground"
                      onClick={() => onSpotSelect(spot.id)}
                    >
                      Book Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <List className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No parking spots found in this area</h3>
          <p className="text-gray-600">Try searching for a different location or go back to map view to explore the area.</p>
        </div>
      )}
    </div>
    );
  };

  // Always show the map, even when no spots are found
  const hasSpots = filteredSpots.length > 0;

  return (
    <section className="py-16 bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Parking Near "{searchLocation}"
            </h2>
            <p className="text-gray-600">
              {filteredSpots.length} spot{filteredSpots.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 sm:space-x-2">
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
              className={`w-full sm:w-auto ${viewMode === "map" ? "bg-primary hover:bg-secondary" : ""}`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Map View
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`w-full sm:w-auto ${viewMode === "list" ? "bg-primary hover:bg-secondary" : ""}`}
            >
              <List className="w-4 h-4 mr-2" />
              List View
            </Button>
          </div>
        </div>

        {viewMode === 'map' ? <MapView /> : <ListView />}
      </div>
    </section>
  );
};

export default SearchResultsMap;