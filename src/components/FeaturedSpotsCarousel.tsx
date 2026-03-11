import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Star, MapPin, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const FeaturedSpotsCarousel = () => {
  const [spots, setSpots] = useState<FeaturedSpot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
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
        let filteredData = data;
        if (userLocation) {
          const nearby = data.filter(s => {
            if (!s.latitude || !s.longitude) return false;
            return calculateDistance(userLocation.latitude, userLocation.longitude, Number(s.latitude), Number(s.longitude)) <= 15;
          });
          filteredData = nearby.length > 0 ? nearby : data;
        }
        filteredData = filteredData.slice(0, 6);

        const ownerIds = [...new Set(filteredData.map(s => s.owner_id))];
        const { data: premiumData } = await supabase.rpc("get_premium_status_for_owners", { owner_ids: ownerIds });

        setSpots(filteredData.map(s => ({
          ...s,
          is_premium: premiumData?.find((p: any) => p.user_id === s.owner_id)?.is_premium || false
        })));
      }
    };
    fetchFeaturedSpots();
  }, [userLocation]);

  const total = spots.length;
  const visibleCount = 3;
  const maxIndex = Math.max(0, total - visibleCount);

  const next = () => setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
  const prev = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

  if (spots.length === 0) return null;

  const getPrice = (spot: FeaturedSpot) => {
    if (spot.pricing_type === "hourly") return { amount: spot.price_per_hour, label: "/ hr" };
    if (spot.pricing_type === "daily") return { amount: spot.daily_price, label: "/ day" };
    if (spot.pricing_type === "monthly") return { amount: spot.monthly_price, label: "/ mo" };
    return { amount: spot.one_time_price, label: "one-time" };
  };

  const SpotCard = ({ spot }: { spot: FeaturedSpot }) => {
    const price = getPrice(spot);
    return (
      <div
        className="group cursor-pointer rounded-2xl overflow-hidden bg-card border border-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
        onClick={() => navigate(`/spot/${spot.id}`)}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={spot.images?.[0] || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=450&fit=crop"}
            alt={spot.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {spot.is_premium && <PremiumBadge size="sm" />}
          </div>
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm text-foreground text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {spot.rating?.toFixed(1) || "5.0"}
            </span>
          </div>
          {/* Featured tag */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              Featured
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-foreground text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
              {spot.title}
            </h3>
            <div className="flex-shrink-0 text-right">
              <span className="font-bold text-foreground text-base">${price.amount}</span>
              <span className="text-muted-foreground text-xs ml-1">{price.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{spot.address}</span>
          </div>
        </div>
      </div>
    );
  };

  const useCarousel = spots.length > 3;

  return (
    <div className="w-full py-16 px-4 bg-white border-t border-border">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="section-label mb-3 block">
              <Sparkles className="w-3.5 h-3.5" />
              Top Rated
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Featured Parking Spots
            </h2>
            <p className="text-muted-foreground mt-2">
              Highest-rated spaces near you
            </p>
          </div>
          {useCarousel && (
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={prev}
                disabled={currentIndex === 0}
                className="rounded-full w-10 h-10 border-border disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={next}
                disabled={currentIndex >= maxIndex}
                className="rounded-full w-10 h-10 border-border disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {useCarousel ? (
          <>
            <div className="overflow-hidden">
              <div
                className="flex gap-6 transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentIndex * (100 / visibleCount)}%)` }}
              >
                {spots.map(spot => (
                  <div
                    key={spot.id}
                    className="min-w-[calc(100%-1.5rem)] md:min-w-[calc(33.333%-1rem)] flex-shrink-0"
                  >
                    <SpotCard spot={spot} />
                  </div>
                ))}
              </div>
            </div>
            {/* Dot indicators (mobile) */}
            <div className="flex md:hidden justify-center gap-2 mt-6">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {spots.map(spot => (
              <SpotCard key={spot.id} spot={spot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedSpotsCarousel;
