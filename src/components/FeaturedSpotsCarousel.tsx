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
  latitude: number;
  longitude: number;
  is_premium?: boolean;
}

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const FeaturedSpotsCarousel = () => {
  const [spots, setSpots] = useState<FeaturedSpot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const navigate = useNavigate();

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("FeaturedSpotsCarousel: User location obtained:", position.coords.latitude, position.coords.longitude);
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log("FeaturedSpotsCarousel: User denied location access:", error);
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
        // Filter by distance (within 15 miles) if user location is available
        let filteredData = data;
        if (userLocation) {
          const nearbySpots = data.filter(spot => {
            if (!spot.latitude || !spot.longitude) return false;
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              Number(spot.latitude),
              Number(spot.longitude)
            );
            return distance <= 15; // Within 15 miles
          });
          // Use nearby spots if we have any, otherwise fall back to all spots
          filteredData = nearbySpots.length > 0 ? nearbySpots : data;
          console.log(`FeaturedSpotsCarousel: Found ${nearbySpots.length} spots within 15 miles`);
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
  }, [userLocation]);

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
