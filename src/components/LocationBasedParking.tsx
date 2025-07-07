import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, DollarSign, Star, Clock, Car } from 'lucide-react';
import { toast } from 'sonner';

interface ParkingSpot {
  id: number;
  title: string;
  address: string;
  price: number;
  rating: number;
  type: string;
  lat: number;
  lng: number;
  available: string;
  distance: string;
  image: string;
}

interface LocationBasedParkingProps {
  onSpotSelect?: (spotId: number) => void;
}

const LocationBasedParking: React.FC<LocationBasedParkingProps> = ({ onSpotSelect }) => {
  const [locationPermission, setLocationPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbySpots, setNearbySpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock parking spots data with coordinates (San Francisco area)
  const allParkingSpots: ParkingSpot[] = [
    {
      id: 1,
      title: "Downtown Garage Spot",
      address: "123 Main St, Downtown",
      price: 8,
      rating: 4.8,
      type: "Covered Garage",
      lat: 37.7749,
      lng: -122.4194,
      available: "24/7",
      distance: "0.2 miles",
      image: "/placeholder.svg"
    },
    {
      id: 2,
      title: "Residential Driveway",
      address: "456 Oak Avenue",
      price: 6,
      rating: 4.9,
      type: "Private Driveway",
      lat: 37.7849,
      lng: -122.4094,
      available: "Weekdays",
      distance: "0.5 miles",
      image: "/placeholder.svg"
    },
    {
      id: 3,
      title: "Metro Center Parking",
      address: "890 Business District",
      price: 12,
      rating: 4.6,
      type: "Multi-Level Garage",
      lat: 37.7649,
      lng: -122.4294,
      available: "24/7",
      distance: "0.8 miles",
      image: "/placeholder.svg"
    },
    {
      id: 4,
      title: "Stadium Event Parking",
      address: "789 Sports Way",
      price: 25,
      rating: 4.7,
      type: "Event Parking",
      lat: 37.7549,
      lng: -122.4394,
      available: "Game Days",
      distance: "1.2 miles",
      image: "/placeholder.svg"
    },
    {
      id: 5,
      title: "Shopping Center Lot",
      address: "Mall Plaza Drive",
      price: 4,
      rating: 4.3,
      type: "Shopping Center",
      lat: 37.7449,
      lng: -122.4494,
      available: "Mall Hours",
      distance: "1.5 miles",
      image: "/placeholder.svg"
    }
  ];

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const requestLocation = () => {
    setLoading(true);
    
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      setLocationPermission('denied');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setUserLocation(location);
        setLocationPermission('granted');
        
        // Calculate distances and sort by proximity
        const spotsWithDistance = allParkingSpots.map(spot => ({
          ...spot,
          calculatedDistance: calculateDistance(location.lat, location.lng, spot.lat, spot.lng),
          distance: `${calculateDistance(location.lat, location.lng, spot.lat, spot.lng).toFixed(1)} miles`
        })).sort((a, b) => a.calculatedDistance - b.calculatedDistance);

        setNearbySpots(spotsWithDistance);
        setLoading(false);
        
        toast.success(`Found ${spotsWithDistance.length} parking spots near you!`);
      },
      (error) => {
        setLocationPermission('denied');
        setLoading(false);
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location access denied. Please enable location services to find nearby parking.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('An unknown error occurred while retrieving location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleBookNow = (spotId: number) => {
    if (onSpotSelect) {
      onSpotSelect(spotId);
    } else {
      window.location.href = `/spot/${spotId}?action=book`;
    }
  };

  const handleGetDirections = (spot: ParkingSpot) => {
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${spot.lat},${spot.lng}`;
      window.open(url, '_blank');
    } else {
      toast.error('Location not available for directions');
    }
  };

  useEffect(() => {
    // Auto-request location on component mount
    if (locationPermission === 'pending') {
      requestLocation();
    }
  }, []);

  if (locationPermission === 'pending' || loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Finding Parking Near You
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="animate-pulse space-y-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
              <Navigation className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {loading ? 'Finding nearby parking spots...' : 'Allow Location Access'}
              </h3>
              <p className="text-gray-600 mb-4">
                {loading 
                  ? 'We\'re searching for the best parking spots in your area'
                  : 'We need your location to show you the closest parking spots'
                }
              </p>
              {!loading && (
                <Button onClick={requestLocation} className="bg-primary hover:bg-secondary text-primary-foreground">
                  <MapPin className="w-4 h-4 mr-2" />
                  Share My Location
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (locationPermission === 'denied') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-600">
            <MapPin className="w-5 h-5 mr-2" />
            Location Access Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Enable Location Services
              </h3>
              <p className="text-gray-600 mb-4">
                To show you nearby parking spots, please allow location access in your browser settings or try again.
              </p>
              <Button onClick={requestLocation} variant="outline">
                <Navigation className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Nearby Parking Spots
            </span>
            <span className="text-sm text-gray-600 font-normal">
              {nearbySpots.length} spots found
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbySpots.slice(0, 6).map((spot) => (
              <Card key={spot.id} className="group hover:shadow-lg transition-all duration-300 border hover:border-primary/20">
                <div className="relative">
                  <img 
                    src={spot.image} 
                    alt={spot.title}
                    className="w-full h-32 object-cover rounded-t-lg"
                  />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center">
                    <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
                    {spot.rating}
                  </div>
                  <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {spot.distance}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        {spot.title}
                      </h3>
                      <div className="flex items-center text-gray-600 text-sm mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {spot.address}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <Car className="w-3 h-3 mr-1" />
                        {spot.type}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-3 h-3 mr-1" />
                        {spot.available}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center text-lg font-bold text-gray-900">
                        <DollarSign className="w-4 h-4" />
                        {spot.price}/hr
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGetDirections(spot)}
                          className="text-xs"
                        >
                          <Navigation className="w-3 h-3 mr-1" />
                          Directions
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleBookNow(spot.id)}
                          className="bg-primary hover:bg-secondary text-primary-foreground text-xs"
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationBasedParking;