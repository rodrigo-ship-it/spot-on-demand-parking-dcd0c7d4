
import { useState, useEffect } from "react";
import { useRealTimeSpots } from "@/hooks/useRealTimeSpots";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  MapPin, DollarSign, Clock, Car, Grid, List, Search, Star,
  Shield, Zap, Users, Menu, HelpCircle, Crown, Sparkles,
  ChevronRight, BadgeCheck, TrendingUp
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AvailabilityDisplay } from "@/components/AvailabilityDisplay";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import SearchResultsMap from "@/components/SearchResultsMap";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PremiumBadge } from "@/components/PremiumBadge";
import FeaturedSpotsCarousel from "@/components/FeaturedSpotsCarousel";
import HowItWorksTimeline from "@/components/HowItWorksTimeline";
import FAQAccordion from "@/components/FAQAccordion";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { TypewriterText } from "@/components/TypewriterText";
import { ScrollReveal } from "@/components/ScrollReveal";

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

  useEffect(() => {
    if (user) {
      const termsAccepted = localStorage.getItem('termsAccepted');
      if (termsAccepted !== 'true') navigate('/terms');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { timeout: 10000, enableHighAccuracy: true }
      );
    }
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const isSpotAvailableAtTime = (spot: any, timeFilter: string): boolean => {
    if (!timeFilter || timeFilter === 'anytime') return true;
    const schedule = spot.availabilitySchedule;
    if (!schedule) return true;
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = now.getHours();
    const checkScheduleForDay = (daySchedule: any): boolean => {
      if (!daySchedule || !daySchedule.enabled) return false;
      if (!daySchedule.start || !daySchedule.end) return true;
      const startHour = parseInt(daySchedule.start.split(':')[0], 10);
      const endHour = parseInt(daySchedule.end.split(':')[0], 10);
      return currentHour >= startHour && currentHour < endHour;
    };
    switch (timeFilter) {
      case 'now': return checkScheduleForDay(schedule[currentDay]);
      case 'today': return schedule[currentDay]?.enabled !== false;
      case 'tomorrow': {
        const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        return schedule[tomorrowDay]?.enabled !== false;
      }
      case 'this_week': return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].some(d => schedule[d]?.enabled !== false);
      default: return true;
    }
  };

  useEffect(() => {
    const transformSpots = async () => {
      const { data: spotData, error } = await supabase
        .from('parking_spots').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (error || !spotData) return;
      const ownerIds = [...new Set(spotData.map(s => s.owner_id).filter(Boolean))];
      let premiumStatusMap: Record<string, boolean> = {};
      if (ownerIds.length > 0) {
        const { data: premiumData } = await supabase.rpc("get_premium_status_for_owners", { owner_ids: ownerIds });
        if (premiumData) premiumData.forEach((p: any) => { premiumStatusMap[p.user_id] = p.is_premium; });
      }
      const ref = searchCoordinates || userLocation;
      setTransformedSpots(spotData.map(spot => {
        let dist = "Unknown distance";
        if (ref && spot.latitude && spot.longitude) {
          dist = `${calculateDistance(ref.latitude, ref.longitude, Number(spot.latitude), Number(spot.longitude)).toFixed(1)} miles`;
        }
        return {
          id: spot.id, title: spot.title, address: spot.address,
          price: spot.pricing_type === 'hourly' ? Number(spot.price_per_hour) : spot.pricing_type === 'daily' ? Number(spot.daily_price) : spot.pricing_type === 'monthly' ? Number(spot.monthly_price) : Number(spot.one_time_price),
          pricingType: spot.pricing_type, rating: Number(spot.rating) || 0, totalReviews: Number(spot.total_reviews) || 0,
          distance: dist, type: spot.spot_type?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Parking Spot',
          spotType: spot.spot_type, totalSpots: spot.total_spots || 1, available: "24/7",
          availabilitySchedule: spot.availability_schedule,
          image: spot.images?.[0] || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=450&fit=crop`,
          latitude: Number(spot.latitude) || 40.7589, longitude: Number(spot.longitude) || -73.9851,
          isPremiumLister: spot.owner_id ? premiumStatusMap[spot.owner_id] || false : false
        };
      }));
    };
    if (!loading) transformSpots();
  }, [loading, searchCoordinates, userLocation]);

  const handleSearch = () => {
    if (!searchLocation.trim()) { toast.error("Please enter a location to search for parking"); return; }
    let filtered = transformedSpots.filter((spot: any) => {
      if (searchCoordinates && spot.latitude && spot.longitude)
        return calculateDistance(searchCoordinates.latitude, searchCoordinates.longitude, spot.latitude, spot.longitude) <= 5;
      return spot.title.toLowerCase().includes(searchLocation.toLowerCase()) || spot.address.toLowerCase().includes(searchLocation.toLowerCase());
    });
    filtered = filtered.sort((a: any, b: any) => {
      if (a.isPremiumLister && !b.isPremiumLister) return -1;
      if (!a.isPremiumLister && b.isPremiumLister) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });
    if (searchPricingType) filtered = filtered.filter((s: any) => s.pricingType === searchPricingType);
    if (searchTimeFilter && searchTimeFilter !== 'anytime') filtered = filtered.filter((s: any) => isSpotAvailableAtTime(s, searchTimeFilter));
    setFilteredSpots(filtered);
    setHasSearched(true);
    if (filtered.length === 0) toast.info(`No spots found within 5 miles of "${searchLocation}". Showing map view.`);
    else toast.success(`Found ${filtered.length} spot${filtered.length > 1 ? 's' : ''} near "${searchLocation}"`);
  };

  const handleLocationSelect = (location: { name: string; latitude: number; longitude: number }) => {
    setSearchLocation(location.name);
    setSearchCoordinates({ latitude: location.latitude, longitude: location.longitude });
    let filtered = transformedSpots.filter((spot: any) => {
      if (spot.latitude && spot.longitude)
        return calculateDistance(location.latitude, location.longitude, spot.latitude, spot.longitude) <= 5;
      return spot.title.toLowerCase().includes(location.name.toLowerCase()) || spot.address.toLowerCase().includes(location.name.toLowerCase());
    });
    if (searchPricingType) filtered = filtered.filter((s: any) => s.pricingType === searchPricingType);
    if (searchTimeFilter && searchTimeFilter !== 'anytime') filtered = filtered.filter((s: any) => isSpotAvailableAtTime(s, searchTimeFilter));
    setFilteredSpots(filtered);
    setHasSearched(true);
    if (filtered.length === 0) toast.info(`No spots within 5 miles of "${location.name}".`);
    else toast.success(`Found ${filtered.length} spot${filtered.length > 1 ? 's' : ''} near "${location.name}"`);
  };

  const clearSearch = () => {
    setSearchLocation(""); setSearchCoordinates(null); setSearchPricingType(""); setFilteredSpots([]); setHasSearched(false);
    toast.info("Search cleared");
  };

  const handleBookNow = (spotId: string | number) => {
    if (!user) { toast.info("Please sign in to book a parking spot"); navigate("/auth"); return; }
    navigate(`/spot/${spotId}`);
  };

  // ── Shared nav link style ──
  const navLink = "text-slate-300 hover:text-white text-sm font-medium transition-colors duration-150";

  return (
    <div className="min-h-screen bg-background">

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <nav className="bg-navy-900 sticky top-0 z-50 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Left: Logo + links */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2.5">
                <img src="/assets/settld-logo-white.png" alt="Settld logo" className="h-8 w-auto" />
                <span className="text-white font-bold text-lg tracking-tight">Settld</span>
              </Link>
              <div className="hidden lg:flex items-center gap-6">
                <Link to="/how-it-works" className={navLink}>How It Works</Link>
                <Link to="/manage-spots" className={navLink}>My Spots</Link>
                <Link to="/help-support" className={navLink}>Help</Link>
              </div>
            </div>

            {/* Right: Desktop actions */}
            <div className="hidden lg:flex items-center gap-2">
              {user ? (
                <>
                  <Button variant="premium" size="sm" onClick={() => navigate('/premium')}>
                    <Crown className="w-3.5 h-3.5" /> Premium
                  </Button>
                  {user.email === 'rodrigo@settldparking.com' && (
                    <Link to="/admin">
                      <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">Admin</Button>
                    </Link>
                  )}
                  <Link to="/bookings">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">Bookings</Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">Profile</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-400 hover:text-white hover:bg-white/10">Sign Out</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10" onClick={() => navigate('/auth')}>Sign In</Button>
                  <Button size="sm" onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90 text-white">Get Started</Button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-white/10">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 bg-navy-900 border-white/10 p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-white/10 flex items-center gap-2.5">
                      <img src="/assets/settld-logo-white.png" alt="Settld logo" className="h-7 w-auto" />
                      <span className="text-white font-bold text-base">Settld</span>
                    </div>
                    <div className="flex flex-col gap-1 p-4 flex-1">
                      {[
                        { label: "How It Works", to: "/how-it-works" },
                        { label: "My Spots", to: "/manage-spots" },
                        { label: "Help", to: "/help-support" },
                        ...(user ? [{ label: "My Bookings", to: "/bookings" }, { label: "Profile", to: "/profile" }] : []),
                      ].map(item => (
                        <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)}
                          className="text-slate-300 hover:text-white hover:bg-white/10 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
                          {item.label}
                        </Link>
                      ))}
                      <button onClick={() => { navigate('/premium'); setMobileMenuOpen(false); }}
                        className="text-amber-400 hover:text-amber-300 hover:bg-white/10 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2">
                        <Crown className="w-4 h-4" /> Premium
                      </button>
                    </div>
                    <div className="p-4 border-t border-white/10">
                      {user ? (
                        <Button variant="ghost" className="w-full text-slate-400 hover:text-white hover:bg-white/10" onClick={() => { signOut(); setMobileMenuOpen(false); }}>Sign Out</Button>
                      ) : (
                        <Button className="w-full bg-primary hover:bg-primary/90 text-white" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}>Sign In</Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section
        className="relative min-h-[600px] md:min-h-[680px] flex items-center overflow-hidden"
        style={{ background: "linear-gradient(160deg, hsl(222, 47%, 8%) 0%, hsl(222, 47%, 13%) 60%, hsl(217, 55%, 18%) 100%)" }}
        role="banner"
      >
        {/* Subtle mesh overlay */}
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(217 91% 50% / 0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, hsl(217 91% 60% / 0.1) 0%, transparent 50%)" }} />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Eyebrow */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 bg-primary/20 text-primary-glow text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <BadgeCheck className="w-3.5 h-3.5" />
                Peer-to-Peer Parking Marketplace
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6"
            >
              Park smarter,{" "}
              <span className="text-primary-glow">
                <TypewriterText
                  words={["earn more.", "book faster.", "get Settld."]}
                  className="text-primary-glow"
                />
              </span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Book a neighbor's driveway or garage near your destination. Hosts earn, drivers save — all in seconds.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3 justify-center mb-10"
            >
              <button
                onClick={() => document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-premium text-white font-semibold px-7 py-3 rounded-xl text-base"
              >
                Find Parking
              </button>
              <Link to="/list-spot">
                <button className="bg-white/10 hover:bg-white/18 border border-white/20 text-white font-semibold px-7 py-3 rounded-xl text-base transition-all duration-200">
                  List Your Spot
                </button>
              </Link>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-wrap gap-5 text-sm text-slate-400 justify-center"
            >
              {[
                { icon: "✓", label: "Instant booking" },
                { icon: "✓", label: "Secure payments" },
                { icon: "✓", label: "Verified listings" },
              ].map(t => (
                <span key={t.label} className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">{t.icon}</span> {t.label}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ══════════════════════ SEARCH BAR ══════════════════════ */}
      <div id="search-section" className="bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 pb-8">
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_hsl(222_47%_11%/0.12)] border border-border p-5 md:p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Find a parking spot</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <GooglePlacesAutocomplete
                  value={searchLocation}
                  onChange={setSearchLocation}
                  onLocationSelect={handleLocationSelect}
                  placeholder="Where to?"
                  className="h-11 text-sm rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Select value={searchPricingType} onValueChange={setSearchPricingType}>
                <SelectTrigger className="h-11 text-sm rounded-lg border-input focus:border-primary focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
              <Select value={searchTimeFilter} onValueChange={setSearchTimeFilter}>
                <SelectTrigger className="h-11 text-sm rounded-lg border-input focus:border-primary focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="When" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anytime">Anytime</SelectItem>
                  <SelectItem value="now">Now</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                </SelectContent>
              </Select>
              <Button size="default" className="h-11 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-white shadow-button" onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" /> Search
              </Button>
            </div>
            {hasSearched && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {filteredSpots.length} spot{filteredSpots.length !== 1 ? 's' : ''} near "{searchLocation}"
                </span>
                <button onClick={clearSearch} className="text-sm text-primary hover:text-primary/80 font-medium ml-2">
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════ SEARCH RESULTS ══════════════════════ */}
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

      {/* ══════════════════════ WHY SETTLD ══════════════════════ */}
      <section className="py-20 bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-14">
              <span className="section-label mb-4 inline-flex">
                <Sparkles className="w-3.5 h-3.5" /> Why Settld
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Parking <span className="text-primary">reimagined</span>
              </h2>
              <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
                Everything you need for stress-free parking — for renters and hosts alike.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Instant Booking",
                desc: "Reserve in seconds with real-time availability. No phone calls, no waiting.",
                accent: "bg-primary/10 text-primary",
                delay: 0
              },
              {
                icon: Shield,
                title: "Verified & Secure",
                desc: "Every listing is verified. Bank-level encryption on all payments.",
                accent: "bg-emerald-50 text-emerald-600",
                delay: 0.1
              },
              {
                icon: TrendingUp,
                title: "Earn Passively",
                desc: "Turn your unused driveway or garage into consistent monthly income.",
                accent: "bg-amber-50 text-amber-600",
                delay: 0.2
              }
            ].map((f, i) => (
              <ScrollReveal key={i} delay={f.delay}>
                <div className="card-clean p-6 h-full flex flex-col">
                  <div className={`w-12 h-12 rounded-xl ${f.accent} flex items-center justify-center mb-4`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FEATURED SPOTS ══════════════════════ */}
      <FeaturedSpotsCarousel />

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <HowItWorksTimeline />

      {/* ══════════════════════ AVAILABLE SPOTS GRID ══════════════════════ */}
      {!hasSearched && (
        <section className="py-16 bg-muted/30 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {(() => {
              let displaySpots: any[] = transformedSpots;
              if (userLocation) {
                const nearby = transformedSpots.filter((s: any) => {
                  if (!s.latitude || !s.longitude) return false;
                  return calculateDistance(userLocation.latitude, userLocation.longitude, s.latitude, s.longitude) <= NEARBY_RADIUS_MILES;
                });
                displaySpots = nearby.length > 0 ? nearby : transformedSpots;
              }
              displaySpots = [...displaySpots].sort((a: any, b: any) => {
                if (a.isPremiumLister && !b.isPremiumLister) return -1;
                if (!a.isPremiumLister && b.isPremiumLister) return 1;
                return (b.rating || 0) - (a.rating || 0);
              }).slice(0, 9);

              return (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                        Available Near You
                      </h2>
                      <p className="text-muted-foreground text-sm mt-1">{displaySpots.length} spots found</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
                      <p className="mt-4 text-muted-foreground text-sm">Loading parking spots…</p>
                    </div>
                  ) : displaySpots.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Car className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {userLocation ? 'No spots within 15 miles' : 'Enable location to see nearby spots'}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-6">Be the first to list a parking spot in your area!</p>
                      <Link to="/list-spot">
                        <Button className="bg-primary hover:bg-primary/90 text-white">List Your First Spot</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" : "space-y-4"}>
                      {displaySpots.map((spot: any, index: number) => (
                        <ScrollReveal key={spot.id} delay={index * 0.05}>
                          <div
                            className={`listing-card group h-full ${spot.isPremiumLister ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                            onClick={() => handleBookNow(spot.id)}
                          >
                            {/* Image */}
                            <div className="listing-card-image">
                              <img
                                src={spot.image}
                                alt={`${spot.title} parking`}
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                              {spot.rating > 0 && (
                                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  {spot.rating.toFixed(1)}
                                </div>
                              )}
                              {spot.isPremiumLister && (
                                <div className="absolute top-3 left-3">
                                  <PremiumBadge size="sm" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3 mb-1.5">
                                <h3 className="font-semibold text-foreground text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                                  {spot.title}
                                </h3>
                                <div className="flex-shrink-0 text-right">
                                  <span className="font-bold text-foreground">${spot.price}</span>
                                  <span className="text-muted-foreground text-xs ml-1">
                                    {spot.pricingType === 'hourly' ? '/hr' : spot.pricingType === 'daily' ? '/day' : spot.pricingType === 'monthly' ? '/mo' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="line-clamp-1">{spot.address}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                                <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" />{spot.type}</span>
                                {spot.distance && spot.distance !== "Unknown distance" && (
                                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{spot.distance}</span>
                                )}
                              </div>
                              <AvailabilityDisplay spotId={spot.id} spotType={spot.type} totalSpots={spot.totalSpots || 1} />
                              <Button
                                className="w-full mt-3 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-lg h-10"
                                onClick={(e) => { e.stopPropagation(); handleBookNow(spot.id); }}
                              >
                                Book Now
                              </Button>
                            </div>
                          </div>
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

      {/* ══════════════════════ FAQ ══════════════════════ */}
      <FAQAccordion />

      {/* ══════════════════════ CTA BANNER ══════════════════════ */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, hsl(222, 47%, 8%) 0%, hsl(222, 47%, 13%) 60%, hsl(217, 55%, 18%) 100%)" }}
      >
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, hsl(217 91% 50% / 0.2) 0%, transparent 60%)" }} />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-2 bg-primary/20 text-primary-glow text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <DollarSign className="w-3.5 h-3.5" /> Start Earning Today
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Turn your empty space into income
          </h2>
          <p className="text-slate-300 mb-8 text-lg leading-relaxed max-w-xl mx-auto">
            Have an unused driveway or garage? List it on Settld and start earning money every month.
          </p>
          <Link to="/list-spot">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 shadow-button">
              List Your Space <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ══════════════════════ EXPLORE LINKS ══════════════════════ */}
      <section className="py-16 bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Explore Settld</h2>
            <p className="text-muted-foreground text-sm mt-2">Everything you need to get started</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Shield, title: "How It Works", desc: "Find parking or list your space in a few simple steps.", to: "/how-it-works", cta: "Learn More" },
              { icon: Car, title: "My Spots", desc: "Manage your listed spaces and track your earnings.", to: "/manage-spots", cta: "Manage Spots" },
              { icon: Clock, title: "My Bookings", desc: "View and manage all your parking reservations.", to: "/bookings", cta: "View Bookings" },
            ].map(item => (
              <div key={item.to} className="card-clean p-6 flex flex-col">
                <div className="w-11 h-11 bg-navy-800 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">{item.desc}</p>
                <Link to={item.to}>
                  <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted text-sm">{item.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
