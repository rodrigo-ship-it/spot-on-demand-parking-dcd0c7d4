import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, DollarSign, Star, Clock, Car, Grid, List } from 'lucide-react';
import { AvailabilityDisplay } from '@/components/AvailabilityDisplay';

interface ParkingSpot {
  id: number;
  title: string;
  address: string;
  price: number;
  rating: number;
  distance: string;
  type: string;
  spotType: string;
  totalSpots?: number;
  available: string;
  image: string;
  lat: number;
  lng: number;
}

interface SearchResultsMapProps {
  searchLocation: string;
  spots: ParkingSpot[];
  onSpotSelect: (spotId: number) => void;
}

const SearchResultsMap: React.FC<SearchResultsMapProps> = ({ searchLocation, spots, onSpotSelect }) => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Add coordinates to spots data for map display
  const spotsWithCoords: ParkingSpot[] = spots.map((spot, index) => ({
    ...spot,
    // Mock coordinates around San Francisco for demo
    lat: 37.7749 + (Math.random() - 0.5) * 0.1,
    lng: -122.4194 + (Math.random() - 0.5) * 0.1
  }));

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
          // Default to San Francisco if geolocation fails
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
        }
      );
    }
  }, []);

  const handleGetDirections = (spot: ParkingSpot) => {
    const url = `https://www.google.com/maps/dir/${userLocation?.lat || 37.7749},${userLocation?.lng || -122.4194}/${spot.lat},${spot.lng}`;
    window.open(url, '_blank');
  };

  const MapView = () => (
    <div className="space-y-6">
      {/* Simple Map Placeholder with Pins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Parking Near "{searchLocation}"
            </span>
            <span className="text-sm font-normal text-gray-600">
              {spots.length} spots found
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-gray-100 rounded-lg h-96 overflow-hidden">
            {/* Mock Map Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100"></div>
            
            {/* Map Grid Lines */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(8)].map((_, i) => (
                <div key={`v-${i}`} className="absolute bg-gray-400 w-px h-full" style={{ left: `${(i + 1) * 12.5}%` }} />
              ))}
              {[...Array(6)].map((_, i) => (
                <div key={`h-${i}`} className="absolute bg-gray-400 h-px w-full" style={{ top: `${(i + 1) * 16.67}%` }} />
              ))}
            </div>

            {/* Search Location Pin */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                  📍
                </div>
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-lg text-xs whitespace-nowrap">
                  {searchLocation}
                </div>
              </div>
            </div>

            {/* Parking Spot Pins */}
            {spotsWithCoords.slice(0, 6).map((spot, index) => {
              const top = 20 + (index % 3) * 20 + Math.random() * 10;
              const left = 20 + Math.floor(index / 3) * 30 + Math.random() * 20;
              
              return (
                <div
                  key={spot.id}
                  className="absolute z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{ top: `${top}%`, left: `${left}%` }}
                  onClick={() => onSpotSelect(spot.id)}
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg group-hover:scale-110 transition-transform">
                      P
                    </div>
                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-30 min-w-48">
                      <div className="font-semibold">{spot.title}</div>
                      <div className="text-gray-600">{spot.address}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-green-600">${spot.price}/hr</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{spot.distance}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg text-xs">
              <div className="font-semibold mb-2">Legend</div>
              <div className="flex items-center mb-1">
                <div className="w-4 h-4 bg-blue-600 rounded-full mr-2 flex items-center justify-center text-white text-xs">📍</div>
                <span>Search Location</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-600 rounded-full mr-2 flex items-center justify-center text-white text-xs font-bold">P</div>
                <span>Parking Spots</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Spot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spots.slice(0, 6).map((spot) => (
          <Card key={spot.id} className="cursor-pointer hover:shadow-lg transition-all duration-300 border hover:border-primary/20" onClick={() => onSpotSelect(spot.id)}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{spot.title}</h3>
                    <div className="flex items-center text-gray-600 text-sm mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {spot.address}
                    </div>
                  </div>
                  <div className="flex items-center text-lg font-bold text-gray-900">
                    <DollarSign className="w-4 h-4" />
                    {spot.price}/hr
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Car className="w-3 h-3 mr-1" />
                    {spot.type}
                  </div>
                  <div className="flex items-center text-green-600 font-medium">
                    <Navigation className="w-3 h-3 mr-1" />
                    {spot.distance}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-1 fill-current" />
                    <span className="text-sm font-medium">{spot.rating}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGetDirections(spot);
                    }}
                    className="text-xs"
                  >
                    Directions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const ListView = () => (
    <div className="space-y-4">
      {spots.map((spot) => (
        <Card key={spot.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg shadow-gray-900/5 hover:-translate-y-1">
          <div className="flex">
            <div className="relative w-48 h-32">
              <img 
                src={spot.image} 
                alt={spot.title}
                className="w-full h-full object-cover rounded-l-lg"
              />
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center">
                <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
                {spot.rating}
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
                  <div className="text-sm text-gray-500">per hour</div>
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
      ))}
    </div>
  );

  if (spots.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Parking Near "{searchLocation}"
            </h2>
            <p className="text-gray-600">
              {spots.length} spot{spots.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
              className={viewMode === "map" ? "bg-primary hover:bg-secondary" : ""}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Map View
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-primary hover:bg-secondary" : ""}
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