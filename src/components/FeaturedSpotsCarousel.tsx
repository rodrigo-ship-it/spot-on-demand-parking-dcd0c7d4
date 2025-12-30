import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Star, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PremiumBadge } from "./PremiumBadge";

interface FeaturedSpot {
  id: string;
  title: string;
  address: string;
  images: string[];
  rating: number;
  price_per_hour: number;
  daily_price: number;
  monthly_price: number;
  one_time_price: number;
  pricing_type: string;
  owner_id: string;
  is_premium?: boolean;
}

// Helper function to extract city from address
const extractCityFromAddress = (address: string): string => {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim());
  
  // For addresses like "4700 Byron Cir, Irving, TX 75038, USA"
  // City is typically the 2nd part (index 1)
  // For "Irving, TX, USA" or "San Francisco, CA, USA", city is first part
  
  // Check if second part exists and is not a state code or zip
  if (parts.length >= 3) {
    // Look for the part that's just before "STATE ZIP" pattern
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1] || '';
      // If next part looks like "TX 75038" or "TX", this part is likely the city
      if (/^[A-Z]{2}(\s+\d{5})?/.test(nextPart)) {
        return part.toLowerCase();
      }
    }
  }
  
  // For simple "City, State, Country" format
  if (parts.length >= 2) {
    const firstPart = parts[0];
    // If first part doesn't look like a street address (no numbers at start)
    if (!/^\d+\s/.test(firstPart)) {
      return firstPart.toLowerCase();
    }
    // Otherwise return second part
    return parts[1]?.toLowerCase() || firstPart.toLowerCase();
  }
  
  return parts[0]?.toLowerCase() || '';
};

const FeaturedSpotsCarousel = () => {
  const [spots, setSpots] = useState<FeaturedSpot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userCity, setUserCity] = useState<string>("");
  const navigate = useNavigate();

  // Get user's city on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { data: tokenData } = await supabase.functions.invoke('get-mapbox-token');
            if (tokenData?.token) {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${position.coords.longitude},${position.coords.latitude}.json?types=place&access_token=${tokenData.token}`
              );
              const data = await response.json();
              if (data.features?.[0]?.text) {
                setUserCity(data.features[0].text.toLowerCase());
              }
            }
          } catch (error) {
            console.log("Could not reverse geocode user location:", error);
          }
        },
        (error) => {
          console.log("User denied location access:", error);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    }
  }, []);

  useEffect(() => {
    const fetchFeaturedSpots = async () => {
      const { data, error } = await supabase
        .from("parking_spots")
        .select("*")
        .eq("is_active", true)
        .order("rating", { ascending: false });

      if (data && !error) {
        // Filter by user's city if available
        let filteredData = data;
        if (userCity) {
          const citySpots = data.filter(spot => {
            const spotCity = extractCityFromAddress(spot.address);
            return spotCity === userCity;
          });
          // Use city spots if we have any, otherwise fall back to all spots
          filteredData = citySpots.length > 0 ? citySpots : data;
        }

        // Take top 6 highest rated
        filteredData = filteredData.slice(0, 6);

        // Check premium status for each spot owner
        const ownerIds = [...new Set(filteredData.map(spot => spot.owner_id))];
        const { data: premiumData } = await supabase
          .rpc("get_premium_status_for_owners", { owner_ids: ownerIds });

        const spotsWithPremium = filteredData.map(spot => ({
          ...spot,
          is_premium: premiumData?.find((p: any) => p.user_id === spot.owner_id)?.is_premium || false
        }));

        setSpots(spotsWithPremium);
      }
    };

    fetchFeaturedSpots();
  }, [userCity]);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, spots.length - 2));
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, spots.length - 2)) % Math.max(1, spots.length - 2));
  };

  if (spots.length === 0) return null;

  // Use carousel only if more than 3 spots, otherwise use grid
  const useCarousel = spots.length > 3;

  const SpotCard = ({ spot }: { spot: FeaturedSpot }) => (
    <Card className={`glass-card hover-lift overflow-hidden h-full group ${
      spot.is_premium ? 'border-2 border-amber-400' : ''
    }`}>
      <div className="relative h-48 overflow-hidden">
        <img
          src={spot.images?.[0] || "/placeholder.svg"}
          alt={spot.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute top-3 left-3">
          {spot.is_premium && <PremiumBadge />}
        </div>
        <div className="absolute top-3 right-3">
          <Badge className="bg-primary/90 text-primary-foreground border-0">
            Featured
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {spot.title}
        </h3>
        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">{spot.address}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{spot.rating?.toFixed(1) || "5.0"}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              ${spot.pricing_type === "hourly" ? spot.price_per_hour : 
                spot.pricing_type === "daily" ? spot.daily_price :
                spot.pricing_type === "monthly" ? spot.monthly_price :
                spot.one_time_price}
            </div>
            <div className="text-xs text-muted-foreground">
              {spot.pricing_type === "hourly" ? "per hour" : 
               spot.pricing_type === "daily" ? "per day" :
               spot.pricing_type === "monthly" ? "per month" :
               "one-time"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-slate-700 via-slate-900 to-slate-700 bg-clip-text text-transparent leading-tight pb-1">
            Featured Parking Spots
          </h2>
          <p className="text-lg text-muted-foreground">
            Discover our highest-rated and most popular locations
          </p>
        </div>

        {useCarousel ? (
          <>
            <div className="relative">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-out gap-6"
                  style={{ transform: `translateX(-${currentIndex * (100 / 3)}%)` }}
                >
                  {spots.map((spot) => (
                    <div
                      key={spot.id}
                      className="min-w-[calc(100%-2rem)] md:min-w-[calc(33.333%-1rem)] cursor-pointer"
                      onClick={() => navigate(`/spot/${spot.id}`)}
                    >
                      <SpotCard spot={spot} />
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={prev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-background shadow-lg hover:bg-muted"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={next}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-background shadow-lg hover:bg-muted"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: Math.max(1, spots.length - 2) }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {spots.map((spot) => (
              <div
                key={spot.id}
                className="cursor-pointer"
                onClick={() => navigate(`/spot/${spot.id}`)}
              >
                <SpotCard spot={spot} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedSpotsCarousel;
