import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, DollarSign } from 'lucide-react';
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
}

interface ParkingMapProps {
  onSpotSelect?: (spotId: number) => void;
  searchQuery?: string;
}

const ParkingMap: React.FC<ParkingMapProps> = ({ onSpotSelect, searchQuery }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Mock parking spots data with coordinates
  const parkingSpots: ParkingSpot[] = [
    {
      id: 1,
      title: "Downtown Garage Spot",
      address: "123 Main St, Downtown",
      price: 8,
      rating: 4.8,
      type: "Covered Garage",
      lat: 37.7749,
      lng: -122.4194,
      available: "24/7"
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
      available: "Weekdays"
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
      available: "24/7"
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
      available: "Game Days"
    },
    {
      id: 5,
      title: "Airport Terminal Garage",
      address: "Airport Terminal 1",
      price: 15,
      rating: 4.5,
      type: "Airport Parking",
      lat: 37.6213,
      lng: -122.3790,
      available: "24/7"
    }
  ];

  const initializeMap = async (apiKey: string) => {
    if (!mapRef.current || !apiKey) return;

    try {
      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places']
      });

      await loader.load();
      setIsLoaded(true);

      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(userPos);
            createMap(userPos);
          },
          () => {
            // Default to San Francisco if geolocation fails
            const defaultPos = { lat: 37.7749, lng: -122.4194 };
            setUserLocation(defaultPos);
            createMap(defaultPos);
          }
        );
      } else {
        const defaultPos = { lat: 37.7749, lng: -122.4194 };
        setUserLocation(defaultPos);
        createMap(defaultPos);
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      toast.error('Failed to load Google Maps. Please check your API key.');
    }
  };

  const createMap = (center: { lat: number; lng: number }) => {
    if (!mapRef.current) return;

    mapInstance.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Add user location marker
    new google.maps.Marker({
      position: center,
      map: mapInstance.current,
      title: 'Your Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(24, 24),
        anchor: new google.maps.Point(12, 12)
      }
    });

    addParkingSpotMarkers();
  };

  const addParkingSpotMarkers = () => {
    if (!mapInstance.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    parkingSpots.forEach(spot => {
      const marker = new google.maps.Marker({
        position: { lat: spot.lat, lng: spot.lng },
        map: mapInstance.current,
        title: spot.title,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="#059669" stroke="white" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">P</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${spot.title}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${spot.address}</p>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${spot.type}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <span style="font-size: 18px; font-weight: bold; color: #059669;">$${spot.price}/hr</span>
              <button onclick="window.selectParkingSpot(${spot.id})" style="background: #059669; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                Book Now
              </button>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker);
      });

      markersRef.current.push(marker);
    });
  };

  // Global function for booking button in info window
  useEffect(() => {
    (window as any).selectParkingSpot = (spotId: number) => {
      if (onSpotSelect) {
        onSpotSelect(spotId);
      } else {
        window.location.href = `/spot/${spotId}?action=book`;
      }
    };

    return () => {
      delete (window as any).selectParkingSpot;
    };
  }, [onSpotSelect]);

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Google Maps API key');
      return;
    }
    localStorage.setItem('googleMapsApiKey', apiKey);
    initializeMap(apiKey);
  };

  const performLocationSearch = (query: string) => {
    if (!mapInstance.current || !isLoaded) return;

    const service = new google.maps.places.PlacesService(mapInstance.current);
    const request = {
      query,
      fields: ['geometry', 'name']
    };

    service.findPlaceFromQuery(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
        const place = results[0];
        if (place.geometry && place.geometry.location) {
          mapInstance.current?.setCenter(place.geometry.location);
          mapInstance.current?.setZoom(14);
          toast.success(`Found location: ${place.name}`);
        }
      } else {
        toast.error('Location not found');
      }
    });
  };

  useEffect(() => {
    const savedApiKey = localStorage.getItem('googleMapsApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      initializeMap(savedApiKey);
    }
  }, []);

  useEffect(() => {
    if (searchQuery && isLoaded) {
      performLocationSearch(searchQuery);
    }
  }, [searchQuery, isLoaded]);

  if (!apiKey || !isLoaded) {
    return (
      <Card className="w-full h-96">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Google Maps Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            To display the parking map, please enter your Google Maps API key.
          </p>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter Google Maps API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div className="flex space-x-2">
              <Button onClick={handleApiKeySubmit} className="flex-1">
                Load Map
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('https://console.cloud.google.com/google/maps-apis/credentials', '_blank')}
              >
                Get API Key
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Get your API key from the Google Cloud Console and enable the Maps JavaScript API and Places API.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Nearby Parking Spots
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (userLocation && mapInstance.current) {
                  mapInstance.current.setCenter(userLocation);
                  mapInstance.current.setZoom(12);
                }
              }}
            >
              <Navigation className="w-4 h-4 mr-2" />
              My Location
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={mapRef} className="w-full h-96 rounded-lg" />
        </CardContent>
      </Card>
      
      {/* Spots Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parkingSpots.slice(0, 3).map(spot => (
          <Card key={spot.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSpotSelect?.(spot.id)}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm">{spot.title}</h3>
                <div className="flex items-center text-green-600 font-bold">
                  <DollarSign className="w-4 h-4" />
                  {spot.price}/hr
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-1">{spot.address}</p>
              <p className="text-xs text-gray-500">{spot.type} • {spot.available}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ParkingMap;