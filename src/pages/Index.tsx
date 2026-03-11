
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
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

import { Hero3D } from "@/components/Hero3D";
import { TypewriterText } from "@/components/TypewriterText";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ScrollReveal } from "@/components/ScrollReveal";

// Distance radius for filtering spots (in miles)
const NEARBY_RADIUS_MILES = 15;

const Index = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCoordinates, setSearchCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchPricingType, setSearchPricingType] = useState("");
  const [searchTimeFilter, setSearchTimeFilter] = useState("");
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [transformedSpots, setTransformedSpots] = useState([]);
  const { spots: allParkingSpots, loading } = useRealTimeSpots();
  
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Redirect logged-in users who haven't accepted terms
  useEffect(() => {
    if (user) {
      const termsAccepted = localStorage.getItem('termsAccepted');
      if (termsAccepted !== 'true') {
        navigate('/terms');
      }
    }
  }, [user, navigate]);

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("User location obtained:", position.coords.latitude, position.coords.longitude);
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
          enableHighAccuracy: true
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

  // Check if a spot is available at a given time filter
  const isSpotAvailableAtTime = (spot: any, timeFilter: string): boolean => {
    // If no time filter or "anytime", always available
    if (!timeFilter || timeFilter === 'anytime') return true;
    
    const schedule = spot.availabilitySchedule;
    
    // If no schedule defined, assume always available (24/7)
    if (!schedule) return true;
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = now.getHours();
    
    // Helper to check if current time falls within schedule
    const checkScheduleForDay = (daySchedule: any): boolean => {
      if (!daySchedule || !daySchedule.enabled) return false;
      if (!daySchedule.start || !daySchedule.end) return true; // If no times, assume all day
      
      const startHour = parseInt(daySchedule.start.split(':')[0], 10);
      const endHour = parseInt(daySchedule.end.split(':')[0], 10);
      
      return currentHour >= startHour && currentHour < endHour;
    };
    
    switch (timeFilter) {
      case 'now':
        // Check if available right now
        const todaySchedule = schedule[currentDay];
        return checkScheduleForDay(todaySchedule);
        
      case 'today':
        // Check if spot has any availability today
        const todayData = schedule[currentDay];
        return todayData?.enabled !== false;
        
      case 'tomorrow':
        // Check if spot has any availability tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const tomorrowData = schedule[tomorrowDay];
        return tomorrowData?.enabled !== false;
        
      case 'this_week':
        // Check if spot has any availability this week
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days.some(day => schedule[day]?.enabled !== false);
        
      default:
        return true;
    }
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
      
      // Fetch premium status for all spot owners
      const ownerIds = [...new Set(secureSpots.map(spot => spot.owner_id).filter(Boolean))];
      let premiumStatusMap: Record<string, boolean> = {};
      
      if (ownerIds.length > 0) {
        const { data: premiumData } = await supabase
          .rpc("get_premium_status_for_owners", { owner_ids: ownerIds });
        
        if (premiumData) {
          premiumData.forEach((p: { user_id: string; is_premium: boolean }) => {
            premiumStatusMap[p.user_id] = p.is_premium;
          });
        }
      }
      
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
          availabilitySchedule: spot.availability_schedule,
          image: spot.images?.[0] || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center`,
          latitude: Number(spot.latitude) || 40.7589,
          longitude: Number(spot.longitude) || -73.9851,
          isPremiumLister: spot.owner_id ? premiumStatusMap[spot.owner_id] || false : false
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

    // Apply time filter if selected
    if (searchTimeFilter && searchTimeFilter !== 'anytime') {
      filtered = filtered.filter(spot => isSpotAvailableAtTime(spot, searchTimeFilter));
      console.log("Filtering by time:", searchTimeFilter);
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

    // Apply time filter if selected
    if (searchTimeFilter && searchTimeFilter !== 'anytime') {
      filtered = filtered.filter(spot => isSpotAvailableAtTime(spot, searchTimeFilter));
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
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Navigation */}
      <nav className="bg-[#0F172A] sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex-shrink-0">
                <img
                  src="/lovable-uploads/settld-logo-with-text.png"
                  alt="Settld Logo"
                  className="h-9 w-auto"
                />
              </Link>
              <div className="hidden lg:flex items-center space-x-6">
                <Link to="/how-it-works" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">
                  How it Works
                </Link>
                <Link to="/manage-spots" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">
                  My Spots
                </Link>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-3">
              {user ? (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate('/premium')}
                    className="flex items-center bg-amber-500 hover:bg-amber-600 text-white border-none rounded-xl"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Premium
                  </Button>
                  {user.email === 'rodrigo@settldparking.com' && (
                    <Link to="/admin">
                      <Button variant="warning" size="sm" className="text-sm rounded-xl">
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Link to="/bookings">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl">
                      My Bookings
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl">
                      Profile
                    </Button>
                  </Link>
                  <Link to="/help-support">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/help-support">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help
                    </Button>
                  </Link>
                  <Button size="sm" onClick={handleSignIn} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl border-none">
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
                className="flex items-center bg-amber-500 hover:bg-amber-600 text-white border-none px-2 rounded-xl"
              >
                <Crown className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
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
                variant="ghost"
                size="sm"
                className="px-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
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
                      <Button variant="ghost" size="sm" className="px-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl">
                        <Menu className="w-4 h-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] bg-[#0F172A] border-white/10">
                      <div className="flex flex-col space-y-4 mt-8">
                        <Link to="/how-it-works" className="text-slate-300 hover:text-white transition-colors font-medium p-2 rounded-lg hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>
                          How it Works
                        </Link>
                        <Link to="/manage-spots" className="text-slate-300 hover:text-white transition-colors font-medium p-2 rounded-lg hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>
                          My Spots
                        </Link>
                        <Link to="/help-support" onClick={() => setMobileMenuOpen(false)} className="w-full">
                          <Button variant="ghost" className="w-full justify-start h-12 text-slate-300 hover:text-white hover:bg-white/10">
                            <HelpCircle className="w-4 h-4 mr-2" />
                            Help
                          </Button>
                        </Link>
                        <Button variant="ghost" className="w-full justify-start h-12 text-slate-300 hover:text-white hover:bg-white/10" onClick={() => { signOut(); setMobileMenuOpen(false); }}>
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
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl">
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-[#0F172A] border-white/10">
                  <div className="flex flex-col space-y-4 mt-8">
                    <Link
                      to="/how-it-works"
                      className="text-slate-300 hover:text-white transition-colors font-medium p-2 rounded-lg hover:bg-white/10"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      How it Works
                    </Link>
                    <Link
                      to="/manage-spots"
                      className="text-slate-300 hover:text-white transition-colors font-medium p-2 rounded-lg hover:bg-white/10"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Spots
                    </Link>
                    <Button
                      className="text-slate-300 hover:text-white transition-colors font-medium p-2 rounded-lg hover:bg-white/10 flex items-center w-full justify-start bg-transparent border-none shadow-none"
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

                    <div className="border-t border-white/10 pt-4 flex flex-col space-y-3">
                      {user?.email === 'rodrigo@settldparking.com' && (
                        <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="w-full">
                          <Button variant="ghost" className="w-full justify-start h-12 text-orange-400 hover:text-orange-300 hover:bg-white/10">
                            Admin
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 text-slate-300 hover:text-white hover:bg-white/10"
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
                        variant="ghost"
                        className="w-full justify-start h-12 text-slate-300 hover:text-white hover:bg-white/10"
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
                            <Button variant="ghost" className="w-full justify-start h-12 text-slate-300 hover:text-white hover:bg-white/10">
                              <HelpCircle className="w-4 h-4 mr-2" />
                              Help
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12 text-slate-300 hover:text-white hover:bg-white/10"
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
                            <Button variant="ghost" className="w-full justify-start h-12 text-slate-300 hover:text-white hover:bg-white/10">
                              <HelpCircle className="w-4 h-4 mr-2" />
                              Help
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12 text-slate-300 hover:text-white hover:bg-white/10"
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

      {/* Hero Section */}
      <section className="bg-[#0F172A] pt-16 pb-28" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center space-y-6"
          >
            {/* Logo */}
            <div className="flex justify-center mb-2">
              <img
                src="/lovable-uploads/settld-logo.png"
                alt="Settld Logo"
                className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl"
              />
            </div>

            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-400 text-sm font-medium px-3 py-1 rounded-full">
                🚗 Peer-to-Peer Parking
              </span>
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                Find parking.<br />
                <span className="text-blue-400">
                  <TypewriterText
                    words={[
                      "Earn from your spot.",
                      "Book in seconds.",
                      "Get it Settld."
                    ]}
                    className="text-blue-400"
                  />
                </span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Book a neighbor's driveway or garage near your destination. Hosts earn, drivers save.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <button
                onClick={() => document.getElementById('search-section')?.scrollIntoView({behavior: 'smooth'})}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Find Parking
              </button>
              <Link to="/list-spot">
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-lg w-full sm:w-auto">
                  List Your Spot
                </button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 justify-center text-sm text-slate-400 pt-2">
              <span className="flex items-center gap-1"><span className="text-green-400">✓</span> Instant booking</span>
              <span className="flex items-center gap-1"><span className="text-green-400">✓</span> Secure payments</span>
              <span className="flex items-center gap-1"><span className="text-green-400">✓</span> 24/7 support</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search Card (overlapping hero) */}
      <div id="search-section" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 mb-12">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Find a parking spot</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <GooglePlacesAutocomplete
                value={searchLocation}
                onChange={setSearchLocation}
                onLocationSelect={handleLocationSelect}
                placeholder="Where to?"
                className="h-12 text-base rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-slate-300 transition-colors"
              />
            </div>
            <Select value={searchPricingType} onValueChange={setSearchPricingType}>
              <SelectTrigger className="h-12 text-base rounded-xl bg-white border border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-white border border-slate-200">
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="one_time">One-time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={searchTimeFilter} onValueChange={setSearchTimeFilter}>
              <SelectTrigger className="h-12 text-base rounded-xl bg-white border border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-white border border-slate-200">
                <SelectItem value="anytime">Anytime</SelectItem>
                <SelectItem value="now">Now</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="lg"
              className="h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
              onClick={handleSearch}
            >
              <Search className="w-5 h-5 mr-2" />
              Search
            </Button>
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
                className="text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
              >
                Clear Search
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Search Results with Map - Show after search */}
      {hasSearched && (
        <SearchResultsMap 
          searchLocation={searchLocation}
          searchCoordinates={searchCoordinates}
          allSpots={transformedSpots}
          filteredSpots={filteredSpots}
          onSpotSelect={handleBookNow}
          hasActiveFilters={!!searchPricingType || (!!searchTimeFilter && searchTimeFilter !== 'anytime')}
          searchPricingType={searchPricingType}
          searchTimeFilter={searchTimeFilter}
        />
      )}

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-semibold mb-4 text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Why Choose Settld</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Parking <span className="text-blue-600">Reimagined</span>
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                Experience modern parking with simple technology
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Instant Booking", desc: "Reserve in seconds with real-time availability", color: "bg-blue-600", delay: 0 },
              { icon: Shield, title: "Bank-Level Security", desc: "Encrypted payments and data protection", color: "bg-slate-700", delay: 0.2 },
              { icon: Users, title: "Trusted Community", desc: "Join thousands of verified drivers and hosts", color: "bg-blue-600", delay: 0.4 }
            ].map((feature, idx) => (
              <ScrollReveal key={idx} delay={feature.delay}>
                <motion.div
                  whileHover={{ y: -6 }}
                  className="relative group"
                >
                  <Card className="relative border border-slate-100 h-full bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl">
                    <CardHeader className="text-center pb-4">
                      <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl ${feature.color} flex items-center justify-center`}>
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      <CardTitle className="text-xl mb-2 text-slate-900">{feature.title}</CardTitle>
                      <CardDescription className="text-base text-slate-500">{feature.desc}</CardDescription>
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
        <section className="py-16 bg-[#F1F5F9]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {(() => {
              // Filter spots by distance (within 15 miles) if user location is available
              let displaySpots = transformedSpots;
              
              if (userLocation) {
                // Filter to spots within 15 miles of user
                const nearbySpots = transformedSpots.filter(spot => {
                  if (!spot.latitude || !spot.longitude) return false;
                  const distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    spot.latitude,
                    spot.longitude
                  );
                  return distance <= NEARBY_RADIUS_MILES;
                });
                // If we have nearby spots, use those; otherwise fall back to all spots
                displaySpots = nearbySpots.length > 0 ? nearbySpots : transformedSpots;
                console.log(`Found ${nearbySpots.length} spots within ${NEARBY_RADIUS_MILES} miles`);
              }
              
              // Sort: premium first, then by rating
              displaySpots = [...displaySpots].sort((a, b) => {
                if (a.isPremiumLister && !b.isPremiumLister) return -1;
                if (!a.isPremiumLister && b.isPremiumLister) return 1;
                return (b.rating || 0) - (a.rating || 0);
              });
              
              // Limit to 9 spots max
              displaySpots = displaySpots.slice(0, 9);
              
              return (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        Available Parking Near You
                      </h2>
                      <p className="text-slate-500">
                        {displaySpots.length} spots near you
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={viewMode === "grid" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className={viewMode === "grid" ? "bg-blue-600 hover:bg-blue-700 text-white rounded-xl border-none" : "rounded-xl border-slate-200"}
                      >
                        <Grid className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className={viewMode === "list" ? "bg-blue-600 hover:bg-blue-700 text-white rounded-xl border-none" : "rounded-xl border-slate-200"}
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
                  ) : displaySpots.length === 0 ? (
                    <div className="text-center py-12">
                      <Car className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        {userLocation ? 'No parking spots within 15 miles' : 'Enable location to see nearby spots'}
                      </h3>
                      <p className="text-slate-500 mb-6">Be the first to list a parking spot in your area!</p>
                      <Link to="/list-spot">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl border-none">
                          List Your First Spot
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {displaySpots.map((spot, index) => (
                <ScrollReveal key={spot.id} delay={index * 0.1}>
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="h-full"
                  >
                    <Card className={`group hover:shadow-md transition-shadow duration-200 flex flex-col h-full overflow-hidden bg-white rounded-2xl ${spot.isPremiumLister ? 'border-2 border-amber-400' : 'border border-slate-100 shadow-sm'}`}>
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
                             <div className="text-lg font-semibold text-slate-900">${spot.price}</div>
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
                            className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
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
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* FAQ Accordion */}
      <FAQAccordion />


      {/* CTA Section */}
      <section className="py-20 bg-[#0F172A]" aria-labelledby="cta-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
            Turn Your Space Into Income
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Have an unused parking space? List it on Settld and start earning money today.
            Join members of the Settld community already making extra income.
          </p>
          <Link to="/list-spot">
            <Button size="xl" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-8 py-4 text-lg shadow-lg border-none">
              <DollarSign className="w-5 h-5 mr-2" />
              Start Earning Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Explore More</h2>
            <p className="text-lg text-slate-500">Everything you need to get started with Settld</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 group flex flex-col h-full bg-white rounded-2xl">
              <CardHeader className="pb-4 flex-grow">
                <div className="w-14 h-14 bg-[#0F172A] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">How It Works</CardTitle>
                <CardDescription className="text-base text-slate-500">
                  Learn how to find parking or list your space in simple steps
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to="/how-it-works">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl border-none">
                    Learn More
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 group flex flex-col h-full bg-white rounded-2xl">
              <CardHeader className="pb-4 flex-grow">
                <div className="w-14 h-14 bg-[#0F172A] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Car className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">My Spots</CardTitle>
                <CardDescription className="text-base text-slate-500">
                  Manage your listed parking spaces and track earnings
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to="/manage-spots">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl border-none">
                    Manage Spots
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 group flex flex-col h-full bg-white rounded-2xl">
              <CardHeader className="pb-4 flex-grow">
                <div className="w-14 h-14 bg-[#0F172A] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">My Bookings</CardTitle>
                <CardDescription className="text-base text-slate-500">
                  View and manage your parking reservations
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to="/bookings">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl border-none">
                    View Bookings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
      
      {/* Scroll to Top Button */}
      <ScrollToTop />
      </div>
  );
};

export default Index;
