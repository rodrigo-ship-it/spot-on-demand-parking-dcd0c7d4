
import { useState, useEffect } from "react";
import { useRealTimeSpots } from "@/hooks/useRealTimeSpots";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MapPin, DollarSign, Clock, Car, Grid, List, Search, Star, Shield, Zap, Users, Menu, X, HelpCircle, Settings, Filter, Crown, Plane, Building2, Calendar, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AvailabilityDisplay } from "@/components/AvailabilityDisplay";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import SearchResultsMap from "@/components/SearchResultsMap";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PremiumBadge } from "@/components/PremiumBadge";
import QuickSearchChips from "@/components/QuickSearchChips";
import LiveAvailabilityBadge from "@/components/LiveAvailabilityBadge";
import FeaturedSpotsCarousel from "@/components/FeaturedSpotsCarousel";
import HowItWorksTimeline from "@/components/HowItWorksTimeline";
import FAQAccordion from "@/components/FAQAccordion";
import CityGrid from "@/components/CityGrid";
import { Hero3D } from "@/components/Hero3D";
import { TypewriterText } from "@/components/TypewriterText";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ScrollReveal } from "@/components/ScrollReveal";

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
          console.log("User location obtained:", position.coords);
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log("User denied location access or location unavailable:", error);
          // Don't set a fallback - wait for user to search or enable location
        },
        {
          timeout: 10000,
          enableHighAccuracy: false
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
      // Use regular parking spots data since secure function isn't working
      const { data: spotData, error } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching parking spots:', error);
        return;
      }
      
      const secureSpots = spotData || [];
      
      const newTransformedSpots = secureSpots.map(spot => {
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
          totalReviews: Number(spot.total_reviews) || 0,
          distance: calculatedDistance,
          type: spot.spot_type?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Parking Spot',
          spotType: spot.spot_type,
          totalSpots: spot.total_spots || 1,
          available: "24/7", // This would come from availability_schedule
          image: spot.images?.[0] || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center`,
          latitude: Number(spot.latitude) || 40.7589,
          longitude: Number(spot.longitude) || -73.9851,
          // Note: owner_id removed for security - no longer exposed to public
          isPremiumLister: false // We'll fetch this separately
        };
      });

      setTransformedSpots(newTransformedSpots);
    };

    if (!loading) { // Only transform when loading is complete
      transformSpots();
    }
  }, [loading, searchCoordinates, userLocation]);

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
    if (!user) {
      toast.info("Please sign in to book a parking spot");
      navigate("/auth");
      return;
    }
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
              <div className="hidden lg:flex items-center space-x-8">
                <Link to="/how-it-works" className="text-muted-foreground hover:text-primary smooth-transition font-semibold">
                  How it Works
                </Link>
                <Link to="/manage-spots" className="text-muted-foreground hover:text-primary smooth-transition font-semibold">
                  My Spots
                </Link>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              {user ? (
                <>
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

            {/* Tablet Navigation - Condensed */}
            <div className="hidden md:flex lg:hidden items-center space-x-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  if (!user) {
                    toast.info("Please sign in to access premium features");
                    navigate("/auth");
                    return;
                  }
                  navigate('/premium');
                }}
                className="flex items-center bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-none px-2"
              >
                <Crown className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="px-2"
                onClick={() => {
                  if (!user) {
                    toast.info("Please sign in to view your bookings");
                    navigate("/auth");
                    return;
                  }
                  navigate("/bookings");
                }}
              >
                Bookings
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="px-2"
                onClick={() => {
                  if (!user) {
                    toast.info("Please sign in to access your profile");
                    navigate("/auth");
                    return;
                  }
                  navigate("/profile");
                }}
              >
                Profile
              </Button>
              {user && (
                  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="px-2">
                        <Menu className="w-4 h-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px]">
                      <div className="flex flex-col space-y-4 mt-8">
                        <Link to="/how-it-works" className="text-gray-600 hover:text-primary transition-colors font-medium p-2 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                          How it Works
                        </Link>
                        <Link to="/manage-spots" className="text-gray-600 hover:text-primary transition-colors font-medium p-2 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                          My Spots
                        </Link>
                        <Link to="/help-support" onClick={() => setMobileMenuOpen(false)} className="w-full">
                          <Button variant="outline" className="w-full justify-start h-12">
                            <HelpCircle className="w-4 h-4 mr-2" />
                            Help
                          </Button>
                        </Link>
                        <Button variant="outline" className="w-full justify-start h-12" onClick={() => { signOut(); setMobileMenuOpen(false); }}>
                          Sign Out
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                )
              }
              <Link to="/help-support">
                <Button variant="ghost" size="sm" className="px-2">
                  Help
                </Button>
              </Link>
              {!user && (
                <Button variant="default" size="sm" onClick={handleSignIn} className="px-3">
                  Sign In
                </Button>
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
                    <Button 
                      className="text-gray-600 hover:text-primary transition-colors font-medium p-2 rounded-lg hover:bg-gray-50 flex items-center w-full justify-start bg-transparent border-none shadow-none"
                      onClick={() => {
                        if (!user) {
                          toast.info("Please sign in to access premium features");
                          navigate("/auth");
                          setMobileMenuOpen(false);
                          return;
                        }
                        navigate("/premium");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Premium
                    </Button>
                    
                    <div className="border-t pt-4 flex flex-col space-y-3">
                      {user?.email === 'rodrigo@arrivparking.com' && (
                        <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="w-full">
                          <Button variant="outline" className="w-full justify-start h-12 border-orange-200 hover:bg-orange-50 text-orange-600">
                            Admin
                          </Button>
                        </Link>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full justify-start h-12"
                        onClick={() => {
                          if (!user) {
                            toast.info("Please sign in to view your bookings");
                            navigate("/auth");
                            setMobileMenuOpen(false);
                            return;
                          }
                          navigate("/bookings");
                          setMobileMenuOpen(false);
                        }}
                      >
                        My Bookings
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start h-12"
                        onClick={() => {
                          if (!user) {
                            toast.info("Please sign in to access your profile");
                            navigate("/auth");
                            setMobileMenuOpen(false);
                            return;
                          }
                          navigate("/profile");
                          setMobileMenuOpen(false);
                        }}
                      >
                        Profile
                      </Button>
                      {user ? (
                        <>
                          <Link to="/help-support" onClick={() => setMobileMenuOpen(false)} className="w-full">
                            <Button variant="outline" className="w-full justify-start h-12">
                              <HelpCircle className="w-4 h-4 mr-2" />
                              Help
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

      {/* Revolutionary Hero Section with 3D */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950" role="banner">
        {/* 3D Background */}
        <Hero3D />
        
        {/* Animated Particles */}
        <AnimatedBackground />
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/5 to-background/80"></div>
        
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8"
          >
            {/* Live Badge with Motion */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center"
            >
              <div className="glass-card px-6 py-3 flex items-center gap-3 border border-white/20">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
                <span className="text-sm font-semibold text-white">
                  <LiveAvailabilityBadge />
                </span>
              </div>
            </motion.div>
            
            {/* Revolutionary Heading */}
            <div className="space-y-6">
              {/* Animated Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
                className="flex justify-center mb-8"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-1 shadow-2xl shadow-blue-500/50">
                    <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                      <Car className="w-10 h-10 md:w-12 md:h-12 text-cyan-400" />
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 blur-xl opacity-50 animate-pulse" />
                </motion.div>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-6xl md:text-8xl lg:text-9xl font-black leading-none tracking-tighter"
              >
                <span className="block bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-2xl">
                  Arriv
                </span>
                <span className="block mt-2">
                  <TypewriterText 
                    words={["Park Smarter.", "Park Faster.", "Park Better."]}
                    className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
                  />
                </span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-xl md:text-2xl text-blue-100/80 max-w-3xl mx-auto font-medium"
              >
                The future of parking is here. Find spots instantly or earn from your space.
              </motion.p>
            </div>
            
            {/* Futuristic Search Card */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="max-w-4xl mx-auto mt-16"
            >
              <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                
                <div className="relative bg-black/40 backdrop-blur-2xl rounded-3xl p-8 border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <GooglePlacesAutocomplete
                        value={searchLocation}
                        onChange={setSearchLocation}
                        onLocationSelect={handleLocationSelect}
                        placeholder="Where to?"
                        className="h-14 text-base rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-cyan-400/50 focus:bg-white/10 backdrop-blur-sm"
                      />
                    </div>
                    <Select value={searchPricingType} onValueChange={setSearchPricingType}>
                      <SelectTrigger className="h-14 text-base rounded-2xl bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl bg-slate-900 border-white/20">
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="one_time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      size="lg" 
                      className="h-14 rounded-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/60 hover:scale-105 transition-all" 
                      onClick={handleSearch}
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Search
                    </Button>
                  </div>
                  
                  {/* Sleek Quick Actions */}
                  <div className="flex flex-wrap gap-3 justify-center mt-8 pt-6 border-t border-white/10">
                    {[
                      { label: "Near Me", icon: MapPin },
                      { label: "Airport", icon: Plane },
                      { label: "Downtown", icon: Building2 },
                      { label: "Monthly", icon: Calendar },
                    ].map((chip) => {
                      const Icon = chip.icon;
                      return (
                        <motion.button
                          key={chip.label}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (chip.label === "Airport") setSearchLocation("airport");
                            if (chip.label === "Downtown") setSearchLocation("downtown");
                            if (chip.label === "Monthly") setSearchPricingType("monthly");
                            handleSearch();
                          }}
                          className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 text-white text-sm font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
                        >
                          <Icon className="w-4 h-4" />
                          {chip.label}
                        </motion.button>
                      );
                    })}
                  </div>
                  
                  {hasSearched && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 flex justify-center"
                    >
                      <Button 
                        variant="ghost" 
                        onClick={clearSearch} 
                        className="text-sm text-white/60 hover:text-white hover:bg-white/5"
                      >
                        Clear Search
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
            
            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2"
            >
              <div className="flex flex-col items-center gap-2 text-white/60">
                <span className="text-xs uppercase tracking-wider">Scroll to explore</span>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Search Results with Map - Show after search */}
      {hasSearched && (
        <SearchResultsMap 
          searchLocation={searchLocation}
          searchCoordinates={searchCoordinates}
          allSpots={transformedSpots}
          filteredSpots={filteredSpots}
          onSpotSelect={handleBookNow}
        />
      )}

      {/* Revolutionary Features Section */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold mb-4"
              >
                <Sparkles className="w-4 h-4" />
                <span>Why Choose Arriv</span>
              </motion.div>
              <h2 className="text-4xl md:text-6xl font-bold mb-4">
                Parking <span className="text-primary">Reimagined</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Experience next-generation parking with cutting-edge technology
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Instant Booking", desc: "Reserve in seconds with real-time availability", gradient: "from-yellow-500 to-orange-500", delay: 0 },
              { icon: Shield, title: "Bank-Level Security", desc: "Encrypted payments and data protection", gradient: "from-blue-500 to-cyan-500", delay: 0.2 },
              { icon: Users, title: "Trusted Community", desc: "Join thousands of verified drivers and hosts", gradient: "from-purple-500 to-pink-500", delay: 0.4 }
            ].map((feature, idx) => (
              <ScrollReveal key={idx} delay={feature.delay}>
                <motion.div
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="relative group"
                >
                  {/* Glow effect on hover */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-3xl blur opacity-0 group-hover:opacity-30 transition duration-500`}></div>
                  
                  <Card className="relative border-2 h-full bg-card/50 backdrop-blur-sm">
                    <CardHeader className="text-center pb-4">
                      <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-xl transform group-hover:rotate-6 transition-transform duration-300`}>
                        <feature.icon className="w-10 h-10 text-white" />
                      </div>
                      <CardTitle className="text-2xl mb-2">{feature.title}</CardTitle>
                      <CardDescription className="text-base">{feature.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Spots Carousel */}
      <FeaturedSpotsCarousel />

      {/* How It Works Timeline */}
      <HowItWorksTimeline />

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
                <ScrollReveal key={spot.id} delay={index * 0.1}>
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="h-full"
                  >
                    <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 flex flex-col h-full overflow-hidden bg-card/50 backdrop-blur-sm">
                      <div className="relative overflow-hidden">
                        <motion.img 
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.6 }}
                          src={spot.image} 
                          alt={`Parking spot at ${spot.address} - ${spot.title}`}
                          className="w-full h-48 object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent"></div>
                        {spot.rating > 0 && (
                          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-semibold flex items-center shadow-xl">
                            <Star className="w-3.5 h-3.5 text-yellow-500 mr-1 fill-current" />
                            {spot.rating}
                          </div>
                        )}
                        {spot.isPremiumLister && (
                          <div className="absolute top-3 left-3">
                            <PremiumBadge size="sm" />
                          </div>
                        )}
                      </div>
                      <CardHeader className="pb-3">
                         <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">
                                {spot.title}
                              </CardTitle>
                              <CardDescription className="flex items-center mt-2">
                                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span className="line-clamp-1">{spot.address}</span>
                              </CardDescription>
                            </div>
                           <div className="text-right flex-shrink-0">
                             <div className="text-2xl font-bold text-primary">${spot.price}</div>
                             <div className="text-xs text-muted-foreground">
                               {spot.pricingType === 'hourly' ? 'per hour' : 
                                spot.pricingType === 'daily' ? 'per day' : 
                                spot.pricingType === 'monthly' ? 'per month' :
                                'one-time'}
                             </div>
                           </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 flex flex-col flex-grow">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center">
                            <Car className="w-4 h-4 mr-1" />
                            {spot.type}
                          </div>
                          {spot.distance && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {spot.distance}
                            </div>
                          )}
                        </div>
                        <div className="mt-auto">
                          <AvailabilityDisplay 
                            spotId={spot.id} 
                            spotType={spot.type}
                            totalSpots={spot.totalSpots || 1}
                          />
                          <Button 
                            className="w-full mt-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 font-semibold shadow-lg hover:shadow-xl transition-all" 
                            onClick={() => handleBookNow(spot.id)}
                          >
                            Book Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* FAQ Accordion */}
      <FAQAccordion />

      {/* City Grid */}
      <CityGrid />

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
              <Button variant="glass" size="xl" className="shadow-glow">
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
