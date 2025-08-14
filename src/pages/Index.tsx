import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MapPin, DollarSign, Clock, Car, Grid, List, Search, Star, Shield, Zap, Users, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchDuration, setSearchDuration] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Sample parking spots data for display
  const sampleSpots = [
    {
      id: "1",
      title: "Downtown Parking Garage",
      address: "123 Main St, Downtown",
      price: 15,
      rating: 4.5,
      distance: "0.2 miles",
      type: "Covered Garage",
      available: "24/7",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center"
    },
    {
      id: "2", 
      title: "Street Parking",
      address: "456 Oak Ave, Midtown", 
      price: 8,
      rating: 4.2,
      distance: "0.5 miles",
      type: "Street Parking",
      available: "8 AM - 6 PM",
      image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center"
    }
  ];

  const handleSearch = () => {
    if (!searchLocation.trim()) {
      toast.error("Please enter a location to search for parking");
      return;
    }
    toast.success("Search functionality will be implemented soon!");
  };

  const handleBookNow = (spotId: string | number) => {
    navigate(`/book-spot/${spotId}`);
  };

  const handleSignIn = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link to="/" className="hover:scale-105 transition-transform duration-200">
                <img 
                  src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
                  alt="Arriv Logo" 
                  className="w-16 h-16 hover:drop-shadow-lg transition-all duration-200"
                />
              </Link>
              <div className="hidden md:flex items-center space-x-6">
                <Link to="/how-it-works" className="text-gray-600 hover:text-primary transition-colors font-medium">
                  How it Works
                </Link>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-3">
              {user ? (
                <>
                  <Link to="/bookings">
                    <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
                      My Bookings
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
                      Profile
                    </Button>
                  </Link>
                  <Button variant="outline" className="border-gray-200 hover:bg-gray-50" onClick={signOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="border-gray-200 hover:bg-gray-50" onClick={handleSignIn}>
                  Sign In
                </Button>
              )}
            </div>

            <div className="md:hidden flex items-center space-x-2">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col space-y-4 mt-8">
                    <Link 
                      to="/how-it-works" 
                      className="text-gray-600 hover:text-primary transition-colors font-medium p-2 rounded-lg hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      How it Works
                    </Link>
                    
                    <div className="border-t pt-4 flex flex-col space-y-3">
                      {user ? (
                        <>
                          <Link to="/bookings" onClick={() => setMobileMenuOpen(false)} className="w-full">
                            <Button variant="outline" className="w-full justify-start h-12">
                              My Bookings
                            </Button>
                          </Link>
                          <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="w-full">
                            <Button variant="outline" className="w-full justify-start h-12">
                              Profile
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start h-12" 
                            onClick={() => {
                              signOut();
                              setMobileMenuOpen(false);
                            }}
                          >
                            Sign Out
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full justify-start h-12" 
                          onClick={() => {
                            handleSignIn();
                            setMobileMenuOpen(false);
                          }}
                        >
                          Sign In
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32" role="banner">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Find it. Book it. Arriv
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Discover convenient parking spots or earn money by listing your unused space. 
              Join our growing community of drivers and property owners.
            </p>
            
            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    placeholder="Where do you need parking?"
                    className="w-full h-12 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                  />
                </div>
                <Select value={searchDuration} onValueChange={setSearchDuration}>
                  <SelectTrigger className="h-12 border-gray-200 transition-all duration-300 hover:border-primary">
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="2h">2 Hours</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="8h">8 Hours</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="lg" className="h-12" onClick={handleSearch}>
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
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Experience the future of parking with our innovative features</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Booking</h3>
              <p className="text-gray-600">Book parking spots instantly with our real-time availability system</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h3>
              <p className="text-gray-600">Industry-standard security with encrypted transactions powered by Stripe</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Trusted Community</h3>
              <p className="text-gray-600">Connect with drivers and property owners in our growing community</p>
            </div>
          </div>
        </div>
      </section>

      {/* Parking Spots */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Available Parking Spots
              </h2>
              <p className="text-gray-600">
                Find the perfect spot for your needs
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {sampleSpots.map((spot) => (
              <Card key={spot.id} className="hover:shadow-lg transition-shadow duration-200">
                <div className="relative overflow-hidden rounded-t-lg">
                  <img 
                    src={spot.image} 
                    alt={`Parking spot at ${spot.address}`}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white/95 px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                    <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
                    {spot.rating}
                  </div>
                </div>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {spot.title}
                      </CardTitle>
                      <CardDescription className="flex items-center text-gray-600 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {spot.address}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">${spot.price}</div>
                      <div className="text-sm text-gray-500">per hour</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
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

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium">{spot.distance} away</span>
                    <Button 
                      size="sm" 
                      onClick={() => handleBookNow(spot.id)}
                    >
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Turn Your Space Into Income
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Have an unused parking space? List it on Arriv and start earning money today.
            </p>
            <Link to="/list-spot">
              <Button variant="secondary" size="lg">
                <DollarSign className="w-5 h-5 mr-2" />
                Start Earning Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;