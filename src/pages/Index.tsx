
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
      {/* Simple Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
                alt="Arriv Logo" 
                className="w-12 h-12"
              />
            </Link>
            
            <div className="flex items-center space-x-3">
              {user ? (
                <>
                  <Link to="/bookings">
                    <Button variant="outline" size="sm">
                      My Bookings
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={signOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleSignIn}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Find it. Book it. Arriv
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Discover convenient parking spots or earn money by listing your unused space.
            </p>
            
            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-6 shadow-lg max-w-2xl mx-auto">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Where do you need parking?"
                  className="flex-1 h-12 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button size="lg" onClick={handleSearch}>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Arriv?</h2>
            <p className="text-lg text-gray-600">Experience the future of parking</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Booking</h3>
              <p className="text-gray-600">Book parking spots instantly with real-time availability</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h3>
              <p className="text-gray-600">Safe and encrypted transactions powered by Stripe</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Trusted Community</h3>
              <p className="text-gray-600">Connect with verified drivers and property owners</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Parking Spots */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Available Parking Spots
            </h2>
            <p className="text-gray-600">
              Find the perfect spot for your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleSpots.map((spot) => (
              <Card key={spot.id} className="hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop"
                    alt={`Parking spot at ${spot.address}`}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute top-3 right-3 bg-white/95 px-2 py-1 rounded-full text-sm font-semibold flex items-center">
                    <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
                    {spot.rating}
                  </div>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{spot.title}</CardTitle>
                      <CardDescription className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {spot.address}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${spot.price}</div>
                      <div className="text-sm text-gray-500">per hour</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Car className="w-4 h-4 mr-1" />
                      {spot.type}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {spot.available}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full"
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
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Turn Your Space Into Income
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Have an unused parking space? List it on Arriv and start earning money today.
          </p>
          <Link to="/list-spot">
            <Button variant="secondary" size="lg">
              <DollarSign className="w-5 h-5 mr-2" />
              Start Earning Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
