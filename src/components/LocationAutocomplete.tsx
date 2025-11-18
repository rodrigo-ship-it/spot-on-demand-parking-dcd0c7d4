import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Mock data for demonstration (replace with real API call)
  const mockSuggestions: LocationSuggestion[] = [
    { id: "1", name: "Downtown", address: "Downtown, City Center", coordinates: { lat: 40.7128, lng: -74.0060 } },
    { id: "2", name: "Airport", address: "International Airport Terminal", coordinates: { lat: 40.6892, lng: -74.1745 } },
    { id: "3", name: "University District", address: "University Campus Area", coordinates: { lat: 40.7282, lng: -73.9942 } },
    { id: "4", name: "Shopping Mall", address: "Central Shopping Mall", coordinates: { lat: 40.7589, lng: -73.9851 } },
    { id: "5", name: "Business District", address: "Financial District", coordinates: { lat: 40.7074, lng: -74.0113 } },
    { id: "6", name: "Sports Stadium", address: "Main Sports Arena", coordinates: { lat: 40.8296, lng: -73.9262 } },
    { id: "7", name: "Convention Center", address: "City Convention Center", coordinates: { lat: 40.7505, lng: -73.9934 } },
    { id: "8", name: "Hospital District", address: "Medical Center Area", coordinates: { lat: 40.7831, lng: -73.9712 } }
  ];

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      // For now, using mock data. Replace with real API call:
      if (apiKey) {
        // Example: Use Google Places API, Mapbox, or similar service
        // const response = await fetch(`https://api.example.com/places?query=${encodeURIComponent(query)}&key=${apiKey}`);
        // const data = await response.json();
        // setSuggestions(data.suggestions);
      }
      
      // Mock implementation - filter based on query
      const filtered = mockSuggestions.filter(
        item =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.address.toLowerCase().includes(query.toLowerCase())
      );
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      setSuggestions(filtered.slice(0, 6)); // Limit to 6 suggestions
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
  }, [value]);

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
      
      {!apiKey && value.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-40 mt-2 p-4 bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200/50 rounded-2xl text-sm text-gray-900 backdrop-blur-sm shadow-card">
          <strong className="text-orange-600">Demo Mode:</strong> Using mock location data. Connect to a places API for real suggestions.
        </div>
      )}
    </div>
  );
};