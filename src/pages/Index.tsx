
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, DollarSign, Clock, Car, Search, Star, Shield, Zap, Users, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [searchLocation, setSearchLocation] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSearch = () => {
    if (!searchLocation.trim()) {
      toast.error("Please enter a location to search for parking");
      return;
    }
    toast.success(`Searching for parking near "${searchLocation}"`);
  };

  const handleBookNow = () => {
    navigate("/book-spot/1");
  };

  const handleSignIn = () => {
    navigate("/auth");
  };

  // Sample parking spots data
  const sampleSpots = [
    {
      id: 1,
      title: "Downtown Parking",
      address: "123 Main St",
      price: 5,
      rating: 4.8,
      type: "Covered",
      available: "Available Now"
    },
    {
      id: 2,
      title: "Mall Parking",
      address: "456 Shopping Ave",
      price: 3,
      rating: 4.5,
      type: "Open Air",
      available: "Available Now"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Mobile-Optimized Navigation */}
      <nav className="bg-white/90 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-14 md:h-16">
            <Link to="/" className="flex items-center">
              <img 
                src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
                alt="Arriv Logo" 
                className="w-10 h-10 md:w-12 md:h-12"
              />
            </Link>
            
            <div className="flex items-center space-x-2">
              {user ? (
                <>
                  <Link to="/bookings" className="hidden sm:block">
                    <Button variant="outline" size="sm" className="text-sm">
                      Bookings
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={signOut} className="text-sm">
                    {user ? "Sign Out" : "Sign In"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleSignIn} className="text-sm px-4">
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-gray-900 mb-4 md:mb-6">
              Find it. Book it. Arriv
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 px-4">
              Discover convenient parking spots or earn money by listing your unused space.
            </p>
            
            {/* Mobile-Optimized Search Bar */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg max-w-2xl mx-auto">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Where do you need parking?"
                  className="flex-1 h-12 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
                <Button size="lg" onClick={handleSearch} className="h-12 w-full md:w-auto">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-4">Why Choose Arriv?</h2>
            <p className="text-base md:text-lg text-gray-600">Experience the future of parking</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center px-4">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Zap className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Instant Booking</h3>
              <p className="text-sm md:text-base text-gray-600">Book parking spots instantly with real-time availability</p>
            </div>
            <div className="text-center px-4">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Shield className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Secure Payment</h3>
              <p className="text-sm md:text-base text-gray-600">Safe and encrypted transactions powered by Stripe</p>
            </div>
            <div className="text-center px-4">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Trusted Community</h3>
              <p className="text-sm md:text-base text-gray-600">Connect with verified drivers and property owners</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Parking Spots */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Available Parking Spots
            </h2>
            <p className="text-sm md:text-base text-gray-600">
              Find the perfect spot for your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {sampleSpots.map((spot) => (
              <Card key={spot.id} className="hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop"
                    alt={`Parking spot at ${spot.address}`}
                    className="w-full h-40 md:h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute top-2 md:top-3 right-2 md:right-3 bg-white/95 px-2 py-1 rounded-full text-xs md:text-sm font-semibold flex items-center">
                    <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
                    {spot.rating}
                  </div>
                </div>
                <CardHeader className="p-3 md:p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base md:text-lg truncate">{spot.title}</CardTitle>
                      <CardDescription className="flex items-center text-xs md:text-sm mt-1">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{spot.address}</span>
                      </CardDescription>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-lg md:text-2xl font-bold">${spot.price}</div>
                      <div className="text-xs md:text-sm text-gray-500">per hour</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                  <div className="flex items-center justify-between text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                    <div className="flex items-center">
                      <Car className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      {spot.type}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      {spot.available}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full h-10 md:h-12 text-sm md:text-base"
                    onClick={handleBookNow}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
            Turn Your Space Into Income
          </h2>
          <p className="text-base md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            Have an unused parking space? List it on Arriv and start earning money today.
          </p>
          <Link to="/list-spot">
            <Button variant="secondary" size="lg" className="h-12 md:h-14 px-6 md:px-8">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Start Earning Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
