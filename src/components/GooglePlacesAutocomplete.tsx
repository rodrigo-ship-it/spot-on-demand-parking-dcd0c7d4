import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LocationSuggestion {
  id: string;
  name: string;
  description: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: LocationSuggestion & { latitude: number; longitude: number }) => void;
  placeholder?: string;
  className?: string;
}

export const GooglePlacesAutocomplete = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter a location",
  className
}: LocationAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Get user's current location for distance calculation
  useEffect(() => {
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
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    } else {
      setUserLocation({ lat: 40.7128, lng: -74.0060 });
    }
  }, []);

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

  const getCurrentLocation = () => {
    setIsLoading(true);
    
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const locationName = `Current Location`;
          setUserLocation({ lat: latitude, lng: longitude });
          onChange(locationName);
          
          // Call onLocationSelect with current location
          if (onLocationSelect) {
            onLocationSelect({
              id: 'current',
              name: 'Current Location',
              description: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              latitude,
              longitude
            });
          }
          
          toast.success("Current location detected!");
        } catch (error) {
          toast.error("Failed to get location details");
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        setIsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location access denied. Please enable location permissions.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out.");
            break;
          default:
            toast.error("An unknown error occurred while getting location.");
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

  const searchPlaces = async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      
      // First try Google Places API via edge function
      try {
        const { data: googlePlaces, error: edgeFunctionError } = await supabase.functions.invoke('search-places', {
          body: { 
            query,
            userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null
          }
        });

        if (!edgeFunctionError && googlePlaces?.places?.length > 0) {
          setSuggestions(googlePlaces.places);
          return;
        }
        
        console.warn('Google Places API fallback to local database:', edgeFunctionError);
      } catch (error) {
        console.warn('Google Places API error, falling back to local database:', error);
      }
      
      // Fallback to local database search
      const { data: places, error } = await supabase
        .from('places')
        .select('*')
        .or(`name.ilike.%${query}%,address.ilike.%${query}%,category.ilike.%${query}%,subcategory.ilike.%${query}%`)
        .limit(8);

      if (error) {
        console.error('Error searching places:', error);
        setSuggestions([]);
        return;
      }

      const placesWithDistance = places?.map(place => {
        const distance = userLocation 
          ? calculateDistance(userLocation.lat, userLocation.lng, Number(place.latitude), Number(place.longitude))
          : '0';
        
        return {
          id: place.id,
          name: place.name,
          description: place.address || `${place.category} in ${place.name}`,
          latitude: Number(place.latitude),
          longitude: Number(place.longitude),
          distance: `${distance} mi`
        };
      }) || [];

      // Sort by relevance (exact name matches first, then by distance)
      placesWithDistance.sort((a, b) => {
        const aExactMatch = a.name.toLowerCase().startsWith(query.toLowerCase());
        const bExactMatch = b.name.toLowerCase().startsWith(query.toLowerCase());
        
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        
        // If both are exact matches or neither, sort by distance
        const aDistance = parseFloat(a.distance || '0');
        const bDistance = parseFloat(b.distance || '0');
        return aDistance - bDistance;
      });

      setSuggestions(placesWithDistance);
    } catch (error) {
      console.error('Error searching places:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, userLocation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    onChange(suggestion.name);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    
    if (onLocationSelect && suggestion.latitude && suggestion.longitude) {
      onLocationSelect({
        ...suggestion,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputFocus = () => {
    if (value.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className={cn("pl-10 pr-12", className)}
          autoComplete="off"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
          onClick={getCurrentLocation}
          disabled={isLoading}
          title="Use current location"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={cn(
                "px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0",
                selectedIndex === index && "bg-blue-50 text-blue-700"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start justify-between space-x-3">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {suggestion.name}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {suggestion.description}
                    </div>
                  </div>
                </div>
                {suggestion.distance && (
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {suggestion.distance}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};