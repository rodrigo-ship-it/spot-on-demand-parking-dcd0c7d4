import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onLocationSelect?: (location: LocationSuggestion) => void;
  apiKey?: string;
}

export const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = "Enter a location",
  className,
  onLocationSelect,
  apiKey
}: LocationAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Get user's current location for better search results
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
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    } else {
      setUserLocation({ lat: 40.7128, lng: -74.0060 });
    }
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      // Try Google Places API via edge function
      try {
        const { data: googlePlaces, error: edgeFunctionError } = await supabase.functions.invoke('search-places', {
          body: {
            query,
            userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null
          }
        });

        if (!edgeFunctionError && googlePlaces?.places?.length > 0) {
          const mapped: LocationSuggestion[] = googlePlaces.places.map((place: any) => ({
            id: place.id,
            name: place.name,
            address: place.description || place.address || '',
            coordinates: place.latitude && place.longitude
              ? { lat: place.latitude, lng: place.longitude }
              : undefined
          }));
          setSuggestions(mapped.slice(0, 6));
          return;
        }
      } catch {
        // fall through to local DB
      }

      // Fallback to local database search
      const { data: places, error } = await supabase
        .from('places')
        .select('*')
        .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(6);

      if (error) {
        setSuggestions([]);
        return;
      }

      const mapped: LocationSuggestion[] = (places || []).map((place: any) => ({
        id: place.id,
        name: place.name,
        address: place.address || `${place.category || ''} in ${place.name}`,
        coordinates: place.latitude && place.longitude
          ? { lat: Number(place.latitude), lng: Number(place.longitude) }
          : undefined
      }));
      setSuggestions(mapped);
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
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
      fetchSuggestions(value);
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
    onLocationSelect?.(suggestion);
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
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicks
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
          className={cn("pl-10", className)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-[9999] mt-2 rounded-xl overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', border: '2px solid #E5E7EB', boxShadow: '0 20px 40px -4px rgba(0,0,0,0.25)' }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className="px-5 py-4 cursor-pointer border-b last:border-b-0"
              style={{
                backgroundColor: selectedIndex === index ? '#FEF3C7' : '#FFFFFF',
                borderBottomColor: '#F3F4F6'
              }}
              onMouseEnter={(e) => {
                if (selectedIndex !== index) {
                  e.currentTarget.style.backgroundColor = '#FFF7ED';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedIndex !== index) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start space-x-3">
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#F97316' }}
                >
                  <MapPin className="w-5 h-5" style={{ color: '#FFFFFF' }} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div 
                    className="font-semibold truncate"
                    style={{ color: '#111827', fontSize: '15px' }}
                  >
                    {suggestion.name}
                  </div>
                  <div 
                    className="truncate mt-0.5"
                    style={{ color: '#6B7280', fontSize: '13px' }}
                  >
                    {suggestion.address}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
    </div>
  );
};