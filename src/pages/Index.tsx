
import { useState, useEffect } from "react";
import { useRealTimeSpots } from "@/hooks/useRealTimeSpots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MapPin, DollarSign, Clock, Car, Grid, List, Search, Star, Shield, Zap, Users, Menu, X, HelpCircle, Settings, Filter, Crown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AvailabilityDisplay } from "@/components/AvailabilityDisplay";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import SearchResultsMap from "@/components/SearchResultsMap";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PremiumBadge } from "@/components/PremiumBadge";

const Index = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCoordinates, setSearchCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchPricingType, setSearchPricingType] = useState("");
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [transformedSpots, setTransformedSpots] = useState([]);
  const { spots: allParkingSpots, loading } = useRealTimeSpots();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log("User denied location access or location unavailable:", error);
          // Don't set a fallback - wait for user to search
        }
      );
    }
  }, []);

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

  // Transform spots and fetch premium status when parking spots change
  useEffect(() => {
    const transformSpots = async () => {
      const newTransformedSpots = allParkingSpots.map(spot => {
        // Calculate distance using search coordinates or user location as reference
        let calculatedDistance = "Unknown distance";
        const referenceLocation = searchCoordinates || userLocation;
        
        if (referenceLocation && spot.latitude && spot.longitude) {
          const distance = calculateDistance(
            referenceLocation.latitude,
            referenceLocation.longitude,
            Number(spot.latitude),
            Number(spot.longitude)
          );
          calculatedDistance = `${distance.toFixed(1)} miles`;
        }

        return {
          id: spot.id,
          title: spot.title,
          address: spot.address,
          price: spot.pricing_type === 'hourly' 
            ? Number(spot.price_per_hour)
            : spot.pricing_type === 'daily'
            ? Number(spot.daily_price)
            : spot.pricing_type === 'monthly'
            ? Number(spot.monthly_price)
            : Number(spot.one_time_price),
          pricingType: spot.pricing_type,
          rating: Number(spot.rating) || 0,
          distance: calculatedDistance,
          type: spot.spot_type?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Parking Spot',
          spotType: spot.spot_type,
          totalSpots: spot.total_spots || 1,
          available: "24/7", // This would come from availability_schedule
          image: spot.images?.[0] || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center`,
          latitude: Number(spot.latitude) || 40.7589,
          longitude: Number(spot.longitude) || -73.9851,
          owner_id: spot.owner_id,
          isPremiumLister: false // We'll fetch this separately
        };
      });

      // Fetch premium status for all spot owners
      if (newTransformedSpots.length > 0) {
        const ownerIds = [...new Set(newTransformedSpots.map(spot => spot.owner_id))];
        
        try {
          const { data: premiumStatuses } = await supabase
            .from('premium_subscriptions')
            .select('user_id')
            .in('user_id', ownerIds)
            .eq('status', 'active')
            .gte('current_period_end', new Date().toISOString());

          const premiumUserIds = new Set(premiumStatuses?.map(ps => ps.user_id) || []);
          
          // Update spots with premium status
          newTransformedSpots.forEach(spot => {
            spot.isPremiumLister = premiumUserIds.has(spot.owner_id);
          });
        } catch (error) {
          console.error('Error fetching premium statuses:', error);
        }
      }

      setTransformedSpots(newTransformedSpots);
    };

    transformSpots();
  }, [allParkingSpots, searchCoordinates, userLocation]);

  const parkingSpots = hasSearched ? filteredSpots : transformedSpots;

  const handleSearch = () => {
    if (!searchLocation.trim()) {
      toast.error("Please enter a location to search for parking");
      return;
    }

    console.log("Searching for parking:", { location: searchLocation, pricingType: searchPricingType });
    console.log("Search coordinates:", searchCoordinates);
    console.log("Setting hasSearched to true");
    
    // Filter spots based on search location and distance (5 mile radius)
    let filtered = transformedSpots.filter(spot => {
      // If we have search coordinates, use distance-based filtering
      if (searchCoordinates && spot.latitude && spot.longitude) {
        const distance = calculateDistance(
          searchCoordinates.latitude,
          searchCoordinates.longitude,
          spot.latitude,
          spot.longitude
        );
        console.log(`Spot ${spot.title}: ${distance.toFixed(2)} miles away`);
        return distance <= 5; // Only include spots within 5 miles
      }
      
      // Fallback to text matching if no coordinates available
      return spot.title.toLowerCase().includes(searchLocation.toLowerCase()) ||
        spot.address.toLowerCase().includes(searchLocation.toLowerCase()) ||
        spot.type.toLowerCase().includes(searchLocation.toLowerCase());
    });

    // Sort results to prioritize premium spots first
    filtered = filtered.sort((a, b) => {
      // Premium spots get priority
      if (a.isPremiumLister && !b.isPremiumLister) return -1;
      if (!a.isPremiumLister && b.isPremiumLister) return 1;
      
      // Then sort by rating
      return (b.rating || 0) - (a.rating || 0);
    });

    // If a pricing type is selected, further filter based on that
    if (searchPricingType) {
      filtered = filtered.filter(spot => spot.pricingType === searchPricingType);
      console.log("Filtering by pricing type:", searchPricingType);
    }

    setFilteredSpots(filtered);
    setHasSearched(true);
    
    console.log("hasSearched should now be true, filtered spots:", filtered.length);

    if (filtered.length === 0) {
      toast.info(`No parking spots found within 5 miles of "${searchLocation}"${searchPricingType ? ` with ${searchPricingType} pricing` : ""}. Showing map view to explore the area.`);
    } else {
      toast.success(`Found ${filtered.length} parking spot${filtered.length > 1 ? 's' : ''} within 5 miles of "${searchLocation}"${searchPricingType ? ` with ${searchPricingType} pricing` : ""}`);
    }
  };

  const handleLocationSelect = (location: { name: string; latitude: number; longitude: number }) => {
    setSearchLocation(location.name);
    setSearchCoordinates({ latitude: location.latitude, longitude: location.longitude });
    
    // Automatically trigger search with distance filtering when location is selected
    let filtered = transformedSpots.filter(spot => {
      // Use distance-based filtering when coordinates are available
      if (spot.latitude && spot.longitude) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          spot.latitude,
          spot.longitude
        );
        console.log(`Auto-search: Spot ${spot.title}: ${distance.toFixed(2)} miles away`);
        return distance <= 5; // Only include spots within 5 miles
      }
      
      // Fallback to text matching if spot coordinates missing
      return spot.title.toLowerCase().includes(location.name.toLowerCase()) ||
        spot.address.toLowerCase().includes(location.name.toLowerCase()) ||
        spot.type.toLowerCase().includes(location.name.toLowerCase());
    });

    // Apply pricing type filter if selected
    if (searchPricingType) {
      filtered = filtered.filter(spot => spot.pricingType === searchPricingType);
    }

    setFilteredSpots(filtered);
    setHasSearched(true);

    if (filtered.length === 0) {
      toast.info(`No parking spots found within 5 miles of "${location.name}". Showing map view to explore the area.`);
    } else {
      toast.success(`Found ${filtered.length} parking spot${filtered.length > 1 ? 's' : ''} within 5 miles of "${location.name}"`);
    }
  };

  const clearSearch = () => {
    setSearchLocation("");
    setSearchCoordinates(null);
    setSearchPricingType("");
    setFilteredSpots([]);
    setHasSearched(false);
    toast.info("Search cleared - showing all parking spots");
  };

  const handleBookNow = (spotId: string | number) => {
    console.log('handleBookNow called with spotId:', spotId);
    navigate(`/spot/${spotId}`);
  };

  const handleSignIn = () => {
    navigate("/auth");
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Modern Navigation with Glass Effect */}
      <nav className="glass-card border-0 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto container-padding">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <Link to="/" className="interactive">
                <img 
                  src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
                  alt="Arriv Logo" 
                  className="w-16 h-16 hover:drop-shadow-lg transition-all duration-300"
                />
              </Link>
              <div className="hidden md:flex items-center space-x-8">
                <Link to="/how-it-works" className="text-muted-foreground hover:text-primary smooth-transition font-semibold">
                  How it Works
                </Link>
                <Link to="/manage-spots" className="text-muted-foreground hover:text-primary smooth-transition font-semibold">
                  My Spots
                </Link>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/manage-spots')}
                    className="flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    My Spots
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => navigate('/premium')}
                    className="flex items-center bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-none"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Premium
                  </Button>
                  {user.email === 'rodrigo@arrivparking.com' && (
                    <Link to="/admin">
                      <Button variant="warning" size="sm" className="text-sm">
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Link to="/bookings">
                    <Button variant="outline" size="sm">
                      My Bookings
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="outline" size="sm">
                      Profile
                    </Button>
                  </Link>
                  <Link to="/help-support">
                    <Button variant="ghost" size="sm">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/help-support">
                    <Button variant="ghost" size="sm">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help
                    </Button>
                  </Link>
                  <Button variant="default" size="sm" onClick={handleSignIn}>
                    Sign In
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Navigation */}
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
                    <Link 
                      to="/manage-spots" 
                      className="text-gray-600 hover:text-primary transition-colors font-medium p-2 rounded-lg hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Spots
                    </Link>
                    <Link 
                      to="/premium" 
                      className="text-gray-600 hover:text-primary transition-colors font-medium p-2 rounded-lg hover:bg-gray-50 flex items-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Premium
                    </Link>
                    
                    <div className="border-t pt-4 flex flex-col space-y-3">
                      {user ? (
                        <>
                          {user.email === 'rodrigo@arrivparking.com' && (
                            <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="w-full">
                              <Button variant="outline" className="w-full justify-start h-12 border-orange-200 hover:bg-orange-50 text-orange-600">
                                Admin
                              </Button>
                            </Link>
                          )}
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
                          <Link to="/help-support" onClick={() => setMobileMenuOpen(false)} className="w-full">
                            <Button variant="outline" className="w-full justify-start h-12">
                              <HelpCircle className="w-4 h-4 mr-2" />
                              Help
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
                        <>
                          <Link to="/help-support" onClick={() => setMobileMenuOpen(false)} className="w-full">
                            <Button variant="outline" className="w-full justify-start h-12">
                              <HelpCircle className="w-4 h-4 mr-2" />
                              Help
                            </Button>
                          </Link>
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
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Enhanced SEO */}
      <section className="relative overflow-hidden section-padding bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900" role="banner">
        <div className="absolute inset-0 bg-gradient-hero opacity-10 animate-glow-pulse"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-tertiary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="relative max-w-7xl mx-auto container-padding">
          <div className="text-center max-w-5xl mx-auto animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none mb-8 text-gradient">
              Find it. Book it. <span className="text-primary-glow">Arriv</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed animate-slide-up max-w-3xl mx-auto font-medium" style={{ animationDelay: '0.3s' }}>
              Discover convenient parking spots or earn money by listing your unused space. 
              Join our growing community of drivers and property owners.
            </p>
            
            {/* Enhanced Search Bar with Glass Effect */}
            <div className="premium-card max-w-5xl mx-auto p-8 animate-scale-in" style={{ animationDelay: '0.6s' }}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
                  <GooglePlacesAutocomplete
                    value={searchLocation}
                    onChange={setSearchLocation}
                    onLocationSelect={handleLocationSelect}
                    placeholder="Where do you need parking?"
                    className="h-14 form-input text-lg rounded-xl border-2 focus:border-primary/50 bg-white/80 backdrop-blur-sm"
                  />
                </div>
                <Select value={searchPricingType} onValueChange={setSearchPricingType}>
                  <SelectTrigger className="h-14 form-input text-lg rounded-xl border-2 bg-white/80 backdrop-blur-sm">
                    <SelectValue placeholder="Parking type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="one_time">One-time payment</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="premium" size="lg" className="h-14 text-lg font-bold" onClick={handleSearch}>
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </Button>
              </div>
              {hasSearched && (
                <div className="mt-6 flex justify-center animate-slide-down">
                  <Button variant="ghost" onClick={clearSearch} className="text-sm hover:bg-white/20 rounded-xl">
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
          searchCoordinates={searchCoordinates}
          spots={filteredSpots.length > 0 ? filteredSpots : transformedSpots}
          onSpotSelect={handleBookNow}
        />
      )}

      {/* Enhanced Features Section */}
      <section className="py-16 bg-white/50" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="text-center mb-12">
            <h2 id="features-heading" className="text-3xl font-bold text-gray-900 mb-4">Why Choose Arriv?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Experience the future of parking with our innovative features</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <article className="text-center group hover-lift">
              <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300 shadow-glow">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Booking</h3>
              <p className="text-gray-600">Book parking spots instantly with our real-time availability system and get immediate confirmation</p>
            </article>
            <article className="text-center group hover-lift">
              <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300 shadow-glow">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h3>
              <p className="text-gray-600">Industry-standard security with encrypted transactions powered by Stripe and comprehensive data protection</p>
            </article>
            <article className="text-center group hover-lift">
              <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300 shadow-glow">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Trusted Community</h3>
              <p className="text-gray-600">Connect with drivers and property owners in our growing community with user profiles and ratings</p>
            </article>
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

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading parking spots...</p>
              </div>
            ) : transformedSpots.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No parking spots available yet</h3>
                <p className="text-gray-600 mb-6">Be the first to list a parking spot in your area!</p>
                <Link to="/list-spot">
                  <Button className="bg-primary hover:bg-secondary text-primary-foreground">
                    List Your First Spot
                  </Button>
                </Link>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {transformedSpots.map((spot, index) => (
                <Card key={spot.id} className="group hover-lift border-0 shadow-card hover:shadow-elegant animate-fade-in flex flex-col h-full" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img 
                      src={spot.image} 
                      alt={`Parking spot at ${spot.address} - ${spot.title}`}
                      className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {spot.rating > 0 && (
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold flex items-center shadow-card animate-bounce-in">
                        <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
                        {spot.rating}
                      </div>
                    )}
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
                         <div className="text-sm text-gray-500">
                           {spot.pricingType === 'hourly' ? 'per hour' : 
                            spot.pricingType === 'daily' ? 'per day' : 
                            spot.pricingType === 'monthly' ? 'per month' :
                            'one-time'}
                         </div>
                         {spot.isPremiumLister && (
                           <div className="mt-1">
                             <PremiumBadge size="sm" />
                           </div>
                         )}
                       </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col flex-grow">
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
                    <div className="mb-4 min-h-[2rem]">
                      <AvailabilityDisplay 
                        spotType={spot.spotType}
                        totalSpots={spot.totalSpots}
                        spotId={spot.id.toString()}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm text-gray-500 font-medium">{spot.distance} away</span>
                      <Button 
                        variant="premium"
                        size="sm" 
                        onClick={() => handleBookNow(spot.id)}
                        aria-label={`Book parking spot at ${spot.title}`}
                      >
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
          </div>
        </section>
      )}

      {/* Enhanced CTA Section */}
      <section className="py-20 bg-gradient-hero relative overflow-hidden" aria-labelledby="cta-heading">
        <div className="absolute inset-0 opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in">
            <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
              Turn Your Space Into Income
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Have an unused parking space? List it on Arriv and start earning money today. 
              Join members of the Arriv community already making extra income.
            </p>
            <Link to="/list-spot">
              <Button variant="glass" size="xl" className="animate-pulse-glow">
                <DollarSign className="w-5 h-5 mr-2" />
                Start Earning Now
              </Button>
            </Link>
          </div>
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
