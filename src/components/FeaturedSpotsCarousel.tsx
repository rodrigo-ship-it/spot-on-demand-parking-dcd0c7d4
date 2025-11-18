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
  pricing_type: string;
  owner_id: string;
  is_premium?: boolean;
}

const FeaturedSpotsCarousel = () => {
  const [spots, setSpots] = useState<FeaturedSpot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeaturedSpots = async () => {
      const { data, error } = await supabase
        .from("parking_spots")
        .select("*")
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .limit(6);

      if (data && !error) {
        // Check premium status for each spot owner
        const ownerIds = [...new Set(data.map(spot => spot.owner_id))];
        const { data: premiumData } = await supabase
          .rpc("get_premium_status_for_owners", { owner_ids: ownerIds });

        const spotsWithPremium = data.map(spot => ({
          ...spot,
          is_premium: premiumData?.find((p: any) => p.user_id === spot.owner_id)?.is_premium || false
        }));

        setSpots(spotsWithPremium);
      }
    };

    fetchFeaturedSpots();
  }, []);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, spots.length - 2));
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, spots.length - 2)) % Math.max(1, spots.length - 2));
  };

  if (spots.length === 0) return null;

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-b from-background to-background/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-slate-700 via-slate-900 to-slate-700 bg-clip-text text-transparent leading-tight pb-1">
            Featured Parking Spots
          </h2>
          <p className="text-lg text-muted-foreground">
            Discover our highest-rated and most popular locations
          </p>
        </div>

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
                  <Card className="glass-card hover-lift overflow-hidden h-full group">
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
                            ${spot.pricing_type === "hourly" ? spot.price_per_hour : spot.daily_price}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            per {spot.pricing_type === "hourly" ? "hour" : "day"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {spots.length > 3 && (
            <>
              <Button
                variant="glass"
                size="icon"
                onClick={prev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 glass-card hover-lift"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="glass"
                size="icon"
                onClick={next}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 glass-card hover-lift"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}
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
      </div>
    </div>
  );
};

export default FeaturedSpotsCarousel;
