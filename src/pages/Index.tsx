
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, DollarSign, Clock, Car, Grid, List, Search, Star, Shield, Zap, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AvailabilityDisplay } from "@/components/AvailabilityDisplay";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import SearchResultsMap from "@/components/SearchResultsMap";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchDuration, setSearchDuration] = useState("");
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const allParkingSpots = [
    {
      id: 1,
      title: "Downtown Garage Spot",
      address: "123 Main St, Downtown",
      price: 8,
      rating: 4.8,
      distance: "0.2 miles",
      type: "Covered Garage",
      spotType: "single-spot",
      available: "24/7",
      image: "/placeholder.svg",
      latitude: 40.7589,
      longitude: -73.9851
    },
    {
      id: 2,
      title: "Residential Driveway",
      address: "456 Oak Avenue",
      price: 6,
      rating: 4.9,
      distance: "0.5 miles",
      type: "Private Driveway",
      spotType: "single-spot",
      available: "Weekdays",
      image: "/placeholder.svg",
      latitude: 40.7505,
      longitude: -73.9934
    },
    {
      id: 3,
      title: "Metro Center Parking Garage",
      address: "890 Business District",
      price: 12,
      rating: 4.6,
      distance: "0.8 miles",
      type: "Multi-Level Garage",
      spotType: "entire-garage",
      totalSpots: 150,
      available: "24/7",
      image: "/placeholder.svg",
      latitude: 40.7614,
      longitude: -73.9776
    },
    {
      id: 4,
      title: "Stadium Event Parking",
      address: "789 Sports Way",
      price: 25,
      rating: 4.7,
      distance: "1.2 miles",
      type: "Event Parking",
      spotType: "single-spot",
      available: "Game Days",
      image: "/placeholder.svg",
      latitude: 40.7282,
      longitude: -74.0776
    },
    {
      id: 5,
      title: "Airport Terminal Garage",
      address: "Airport Terminal 1",
      price: 15,
      rating: 4.5,
      distance: "3.2 miles",
      type: "Airport Parking",
      spotType: "entire-garage",
      totalSpots: 300,
      available: "24/7",
      image: "/placeholder.svg",
      latitude: 40.6892,
      longitude: -74.1745
    },
    {
      id: 6,
      title: "Mall Shopping Center",
      address: "City Mall, Shopping District",
      price: 5,
      rating: 4.3,
      distance: "1.8 miles",
      type: "Shopping Center",
      spotType: "entire-outdoor-lot",
      totalSpots: 80,
      available: "Mall Hours",
      image: "/placeholder.svg",
      latitude: 40.7831,
      longitude: -73.9712
    },
    {
      id: 7,
      title: "University Campus Lot",
      address: "State University, Campus Drive",
      price: 3,
      rating: 4.1,
      distance: "2.5 miles",
      type: "Campus Parking",
      spotType: "entire-outdoor-lot",
      totalSpots: 200,
      available: "Weekdays",
      image: "/placeholder.svg",
      latitude: 40.8075,
      longitude: -73.9626
    }
  ];

  const parkingSpots = hasSearched ? filteredSpots : allParkingSpots;

  const handleSearch = () => {
    if (!searchLocation.trim()) {
      toast.error("Please enter a location to search for parking");
      return;
    }

    console.log("Searching for parking:", { location: searchLocation, duration: searchDuration });
    
    // Filter spots based on search location
    const filtered = allParkingSpots.filter(spot => 
      spot.title.toLowerCase().includes(searchLocation.toLowerCase()) ||
      spot.address.toLowerCase().includes(searchLocation.toLowerCase()) ||
      spot.type.toLowerCase().includes(searchLocation.toLowerCase())
    );

    setFilteredSpots(filtered);
    setHasSearched(true);

    if (filtered.length === 0) {
      toast.error(`No parking spots found near "${searchLocation}"`);
    } else {
      toast.success(`Found ${filtered.length} parking spot${filtered.length > 1 ? 's' : ''} near "${searchLocation}"${searchDuration ? ` for ${searchDuration}` : ""}`);
    }
  };

  const clearSearch = () => {
    setSearchLocation("");
    setSearchDuration("");
    setFilteredSpots([]);
    setHasSearched(false);
    toast.info("Search cleared - showing all parking spots");
  };

  const handleBookNow = (spotId: number) => {
    navigate(`/spot/${spotId}?action=book`);
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
                <Link to="/manage-spots" className="text-gray-600 hover:text-primary transition-colors font-medium">
                  My Spots
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {user ? (
                <>
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
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Find it. Book it. Arriv
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Discover convenient parking spots or earn money by listing your unused space. 
              Join thousands of drivers and property owners.
            </p>
            
            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-gray-900/10 border border-gray-100 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <GooglePlacesAutocomplete
                    value={searchLocation}
                    onChange={setSearchLocation}
                    placeholder="Where do you need parking?"
                    className="h-12 border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent"
                    onLocationSelect={(location) => {
                      console.log("Selected location:", location);
                      // You can use the selected location data for enhanced search
                    }}
                  />
                </div>
                <Select value={searchDuration} onValueChange={setSearchDuration}>
                  <SelectTrigger className="h-12 border-gray-200">
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
                <Button className="h-12 bg-primary hover:bg-secondary text-primary-foreground shadow-lg" onClick={handleSearch}>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
              {hasSearched && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" onClick={clearSearch} className="text-sm">
                    Clear Search & Show All
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Search Results with Map - Show after search */}
      {hasSearched && (
        <SearchResultsMap 
          searchLocation={searchLocation}
          spots={filteredSpots.length > 0 ? filteredSpots : allParkingSpots}
          onSpotSelect={handleBookNow}
        />
      )}

      {/* Features */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Booking</h3>
              <p className="text-gray-600">Book parking spots instantly with our real-time availability system</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h3>
              <p className="text-gray-600">Safe and secure transactions with protection for both parties</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Community Driven</h3>
              <p className="text-gray-600">Join a trusted community of drivers and parking space owners</p>
            </div>
          </div>
        </div>
      </section>

      {/* Parking Spots - Only show when no search has been made */}
      {!hasSearched && (
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
                  className={viewMode === "grid" ? "bg-primary hover:bg-secondary" : ""}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-primary hover:bg-secondary" : ""}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {allParkingSpots.map((spot) => (
                <Card key={spot.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg shadow-gray-900/5 hover:-translate-y-1">
                  <div className="relative">
                    <img 
                      src={spot.image} 
                      alt={spot.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
                      {spot.rating}
                    </div>
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
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
                    
                    {/* Availability Display */}
                    <div className="mb-4">
                      <AvailabilityDisplay 
                        spotType={spot.spotType}
                        totalSpots={spot.totalSpots}
                        spotId={spot.id.toString()}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{spot.distance} away</span>
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-secondary text-primary-foreground"
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
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Turn Your Space Into Income
          </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Have an unused parking space? List it on Arriv and start earning money today.
            </p>
          <Link to="/list-spot">
            <Button size="lg" className="bg-white text-primary hover:bg-gray-50 font-semibold px-8 py-3 text-lg shadow-xl">
              Start Earning Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore More</h2>
            <p className="text-lg text-gray-600">Everything you need to get started with Arriv</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-lg shadow-gray-900/5 hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
              <CardHeader className="pb-4 flex-grow">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">How It Works</CardTitle>
                <CardDescription className="text-base">
                  Learn how to find parking or list your space in simple steps
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to="/how-it-works">
                  <Button className="w-full bg-primary hover:bg-secondary text-primary-foreground">
                    Learn More
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg shadow-gray-900/5 hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
              <CardHeader className="pb-4 flex-grow">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Car className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">My Spots</CardTitle>
                <CardDescription className="text-base">
                  Manage your listed parking spaces and track earnings
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to="/manage-spots">
                  <Button className="w-full bg-primary hover:bg-secondary text-primary-foreground">
                    Manage Spots
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg shadow-gray-900/5 hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
              <CardHeader className="pb-4 flex-grow">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">My Bookings</CardTitle>
                <CardDescription className="text-base">
                  View and manage your parking reservations
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to="/bookings">
                  <Button className="w-full bg-primary hover:bg-secondary text-primary-foreground">
                    View Bookings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
