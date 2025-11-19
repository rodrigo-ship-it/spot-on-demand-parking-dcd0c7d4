import { Card } from "./ui/card";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CityGrid = () => {
  const navigate = useNavigate();

  const cities = [
    {
      name: "New York",
      image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop",
      spots: 1234,
    },
    {
      name: "Los Angeles",
      image: "https://images.unsplash.com/photo-1580655653885-65763b2597d0?w=800&h=600&fit=crop",
      spots: 892,
    },
    {
      name: "Chicago",
      image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop",
      spots: 567,
    },
    {
      name: "San Francisco",
      image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop",
      spots: 743,
    },
    {
      name: "Miami",
      image: "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=800&h=600&fit=crop",
      spots: 445,
    },
    {
      name: "Boston",
      image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop",
      spots: 389,
    },
  ];

  const handleCityClick = (cityName: string) => {
    navigate(`/?city=${encodeURIComponent(cityName)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-full py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-slate-700 via-slate-900 to-slate-700 bg-clip-text text-transparent leading-tight pb-1">
            Browse by City
          </h2>
          <p className="text-lg text-muted-foreground">
            Find parking in popular cities across the country
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((city, index) => (
            <Card
              key={city.name}
              onClick={() => handleCityClick(city.name)}
              className="group cursor-pointer overflow-hidden border-0 bg-transparent hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative h-64 overflow-hidden rounded-2xl">
                {/* City image */}
                <img
                  src={city.image}
                  alt={city.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <h3 className="text-3xl font-bold text-white mb-2 group-hover:scale-105 transition-transform">
                    {city.name}
                  </h3>
                  <div className="flex items-center gap-2 text-white/90">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {city.spots.toLocaleString()} spots available
                    </span>
                  </div>
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CityGrid;
