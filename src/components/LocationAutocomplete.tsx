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
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-premium max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={cn(
                "px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-b-0",
                "hover:bg-primary/5 dark:hover:bg-primary/10",
                selectedIndex === index && "bg-primary/10 dark:bg-primary/20"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {suggestion.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {suggestion.address}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!apiKey && value.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-40 mt-1 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-900 dark:text-orange-200">
          <strong>Demo Mode:</strong> Using mock location data. Connect to a places API for real suggestions.
        </div>
      )}
    </div>
  );
};