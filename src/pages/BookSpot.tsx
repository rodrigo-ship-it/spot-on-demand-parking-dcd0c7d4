
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { MarketplacePaymentIntegration } from "@/components/MarketplacePaymentIntegration";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, Clock, DollarSign, Shield, Car, CreditCard, Calendar, Zap, CalendarIcon, ClockIcon } from "lucide-react";
import { secureSignOut } from "@/lib/auth-cleanup";
import { cn } from "@/lib/utils";

import { toast } from "sonner";
import { VehicleManagementDialog } from "@/components/VehicleManagementDialog";
import { PaymentMethodDialog } from "@/components/PaymentMethodDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BookSpot = () => {
  console.log('🔥 BookSpot component is loading!');
  
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  console.log('🔥 BookSpot params:', { id, pathname: location.pathname, search: location.search });
  
  // Check if this is a QR code scan
  const urlParams = new URLSearchParams(location.search);
  const isQRCodeBooking = urlParams.get('qr') === 'true';
  
  console.log('🔥 BookSpot QR check:', { isQRCodeBooking, urlParams: location.search });
  
  const [spotData, setSpotData] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string>("");
  
  // Guest booking state (for QR code bookings)
  const [guestDetails, setGuestDetails] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Booking state
  const [bookingDetails, setBookingDetails] = useState({
    date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
    startTime: "09:00",
    endTime: "09:00", // Will be updated based on pricing type
    duration: 8,
    numberOfDays: 1,
    autoExtend: true,
    maxExtension: 2 // hours
  });

  // Load spot data and user profile
  useEffect(() => {
    const loadData = async () => {
      console.log('BookSpot - Loading data:', { id, isQRCodeBooking, user: !!user });
      
      // For QR code bookings, allow guest users (don't redirect to auth)
      if (!user && !isQRCodeBooking) {
        navigate('/auth');
        return;
      }

      if (!id) {
        console.error('BookSpot - No spot ID provided');
        toast.error("No parking spot ID provided");
        navigate('/');
        return;
      }

      try {
        // Load parking spot data
        console.log('BookSpot - Attempting to load spot with ID:', id);
        const { data: spot, error: spotError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('id', id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors if not found

        console.log('BookSpot - Supabase response:', { spot, spotError });

        if (spotError) {
          console.error('BookSpot - Error loading spot:', spotError);
          toast.error("Failed to load parking spot");
          navigate('/');
          return;
        }

        if (!spot) {
          console.error('BookSpot - No spot found with ID:', id);
          toast.error("Parking spot not found");
          navigate('/');
          return;
        }

        console.log('BookSpot - Spot loaded successfully:', spot);
        setSpotData(spot);

        // Load user profile and vehicles (only if user is logged in)
        if (user) {
          // Load user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (profileError) {
            // Create basic profile if it doesn't exist
            setUserProfile({
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              email: user.email,
              phone: '',
              paymentMethod: {
                type: 'Card',
                lastFour: '****',
                expiry: ''
              }
            });
          } else {
            setUserProfile({
              name: profile.full_name || user.email?.split('@')[0] || 'User',
              email: profile.email || user.email,
              phone: profile.phone || '',
              paymentMethod: {
                type: 'Card',
                lastFour: '****',
                expiry: ''
              }
            });
          }

          // Load user vehicles
          const { data: userVehicles, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false });

          if (!vehiclesError && userVehicles) {
            setVehicles(userVehicles);
            // Set default vehicle as selected
            const defaultVehicle = userVehicles.find(v => v.is_default) || userVehicles[0];
            setSelectedVehicle(defaultVehicle);
          }
        } else {
          // For QR code bookings without user, create empty profile
          setUserProfile({
            name: '',
            email: '',
            phone: '',
            paymentMethod: {
              type: 'Card',
              lastFour: '****',
              expiry: ''
            }
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error("Failed to load data");
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, user, navigate]);

  // Pricing calculation - 7% upcharge for renters, 7% deduction for listers
  const isPricingHourly = spotData?.pricing_type === 'hourly';
  const isPricingDaily = spotData?.pricing_type === 'daily';

  // Update end time to match start time for daily spots
  useEffect(() => {
    if (isPricingDaily) {
      setBookingDetails(prev => ({ ...prev, endTime: prev.startTime }));
    } else if (bookingDetails.endTime === bookingDetails.startTime) {
      // Reset to default end time for hourly spots
      setBookingDetails(prev => ({ ...prev, endTime: "17:00" }));
    }
  }, [isPricingDaily, bookingDetails.startTime]);

  const basePrice = isPricingHourly 
    ? (spotData?.price_per_hour || 8)
    : isPricingDaily
    ? (spotData?.daily_price || 25)
    : (spotData?.one_time_price || 25);
  const duration = isPricingDaily ? bookingDetails.numberOfDays : bookingDetails.duration;
  const subtotal = (isPricingHourly || isPricingDaily) ? basePrice * duration : basePrice;
  const platformFee = Math.round(subtotal * 0.07 * 100) / 100; // 7% platform fee
  const renterTotal = Math.round((subtotal + platformFee) * 100) / 100; // Renter pays 7% more
  const ownerPayout = Math.round((subtotal - platformFee) * 100) / 100; // Owner gets 7% less
  const tax = Math.round(renterTotal * 0.0875 * 100) / 100; // 8.75% tax on total amount
  const total = Math.round((renterTotal + tax) * 100) / 100; // Final total rounded to nearest cent

  // Auto-extension settings (would come from spot host settings)
  const [hostSettings] = useState({
    allowAutoExtend: true,
    maxAutoExtend: 4, // hours
    extensionRate: basePrice * 1.2 // 20% premium for extensions
  });

  const handleTimeChange = (field: string, value: string) => {
    const newDetails = { ...bookingDetails, [field]: value };
    
    if (field === 'startTime' || field === 'endTime') {
      const start = new Date(`2000-01-01T${newDetails.startTime}`);
      const end = new Date(`2000-01-01T${newDetails.endTime}`);
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      newDetails.duration = Math.max(1, diffHours);
    }
    
    setBookingDetails(newDetails);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      // Ensure we use the date as-is without any time component conversion
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      console.log('🗓️ [DATE_CHANGE] Selected date:', {
        originalDate: date,
        originalToString: date.toString(),
        localDate: localDate,
        localToString: localDate.toString(),
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate()
      });
      setBookingDetails(prev => ({ ...prev, date: localDate }));
    }
  };

  // Generate time options for the time picker
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const handleBooking = async () => {
    if (!spotData) {
      toast.error("Missing required data");
      return;
    }

    // For QR code bookings, validate guest details
    if (isQRCodeBooking && (!guestDetails.name || !guestDetails.email)) {
      toast.error("Please fill in your contact information");
      return;
    }

    // For logged in users, require user and vehicle selection
    if (!isQRCodeBooking && !user) {
      toast.error("Missing required data");
      return;
    }

    // Require vehicle selection for logged in users
    if (!isQRCodeBooking && !selectedVehicle) {
      toast.error("Please select a vehicle before proceeding to payment");
      return;
    }

    // Just proceed to payment without creating booking first
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (sessionId?: string) => {
    // Booking will be created by webhook after payment success
    // Navigate directly to confirmation page with session_id
    console.log("💰 [PAYMENT_SUCCESS] Payment completed, redirecting to confirmation...");
    
    if (sessionId) {
      // Navigate with session_id so confirmation page can fetch webhook-created booking
      navigate(`/booking-confirmed?session_id=${sessionId}`);
    } else {
      // Fallback navigation for edge cases
      navigate('/booking-confirmed');
    }
  };

  const handlePaymentError = (error: string) => {
    toast.error(`Payment failed: ${error}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!spotData || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load booking details</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold flex-1">Complete Your Booking</h1>
          {user && (
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => secureSignOut(supabase)}
                className="ml-4"
              >
                Force Sign Out
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
                className=""
              >
                Sign Out ({user.email?.split('@')[0]})
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Booking Details */}
          <div className="space-y-4">
            {/* Spot Information */}
            <Card>
              <CardHeader className="pb-3">
                 <CardTitle className="text-lg">{spotData.title}</CardTitle>
                 <div className="flex items-center text-gray-600">
                   <MapPin className="w-4 h-4 mr-1" />
                   <span className="text-sm">{spotData.address}</span>
                 </div>
              </CardHeader>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="w-5 h-5 mr-2" />
                  When
                </CardTitle>
              </CardHeader>
               <CardContent className="space-y-4">
                 {isPricingDaily ? (
                   // Daily pricing interface
                   <div className="grid grid-cols-3 gap-3">
                     <div>
                       <Label>Start Date</Label>
                       <Popover>
                         <PopoverTrigger asChild>
                           <Button
                             variant="outline"
                             className={cn(
                               "w-full justify-center text-center font-normal",
                               !bookingDetails.date && "text-muted-foreground"
                             )}
                           >
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {bookingDetails.date ? (
                               format(bookingDetails.date, "MMM d, yyyy")
                             ) : (
                               <span>Pick a date</span>
                             )}
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                           <CalendarComponent
                             mode="single"
                             selected={bookingDetails.date}
                             onSelect={handleDateChange}
                              disabled={(date) => date < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())}
                             initialFocus
                             className={cn("p-3 pointer-events-auto")}
                           />
                         </PopoverContent>
                       </Popover>
                     </div>
                     <div>
                       <Label>Start Time</Label>
                       <Select value={bookingDetails.startTime} onValueChange={(value) => setBookingDetails(prev => ({ ...prev, startTime: value }))}>
                         <SelectTrigger className="w-full">
                           <div className="flex items-center">
                             <ClockIcon className="mr-2 h-4 w-4" />
                             <SelectValue placeholder="Select time" />
                           </div>
                         </SelectTrigger>
                         <SelectContent className="max-h-[200px]">
                           {timeOptions.map((option) => (
                             <SelectItem key={option.value} value={option.value}>
                               {option.label}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div>
                       <Label>Number of Days</Label>
                       <Input
                         type="number"
                         min="1"
                         max="30"
                         value={bookingDetails.numberOfDays}
                         onChange={(e) => setBookingDetails(prev => ({ 
                           ...prev, 
                           numberOfDays: Math.max(1, parseInt(e.target.value) || 1)
                         }))}
                         className="w-full"
                       />
                     </div>
                   </div>
                 ) : (
                   // Hourly pricing interface
                   <div className="grid grid-cols-3 gap-3">
                     <div>
                       <Label>Date</Label>
                       <Popover>
                         <PopoverTrigger asChild>
                           <Button
                             variant="outline"
                             className={cn(
                               "w-full justify-center text-center font-normal",
                               !bookingDetails.date && "text-muted-foreground"
                             )}
                           >
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {bookingDetails.date ? (
                               format(bookingDetails.date, "MMM d, yyyy")
                             ) : (
                               <span>Pick a date</span>
                             )}
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                           <CalendarComponent
                             mode="single"
                             selected={bookingDetails.date}
                             onSelect={handleDateChange}
                             disabled={(date) => date < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())}
                             initialFocus
                             className={cn("p-3 pointer-events-auto")}
                           />
                         </PopoverContent>
                       </Popover>
                     </div>
                     <div>
                       <Label>Start Time</Label>
                       <Select value={bookingDetails.startTime} onValueChange={(value) => handleTimeChange('startTime', value)}>
                         <SelectTrigger className="w-full">
                           <div className="flex items-center">
                             <ClockIcon className="mr-2 h-4 w-4" />
                             <SelectValue placeholder="Select time" />
                           </div>
                         </SelectTrigger>
                         <SelectContent className="max-h-[200px]">
                           {timeOptions.map((option) => (
                             <SelectItem key={option.value} value={option.value}>
                               {option.label}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div>
                       <Label>End Time</Label>
                       <Select value={bookingDetails.endTime} onValueChange={(value) => handleTimeChange('endTime', value)}>
                         <SelectTrigger className="w-full">
                           <div className="flex items-center">
                             <ClockIcon className="mr-2 h-4 w-4" />
                             <SelectValue placeholder="Select time" />
                           </div>
                         </SelectTrigger>
                         <SelectContent className="max-h-[200px]">
                           {timeOptions.map((option) => (
                             <SelectItem key={option.value} value={option.value}>
                               {option.label}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                 )}
                 
                 <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                   {isPricingDaily 
                     ? `Duration: ${bookingDetails.numberOfDays} day${bookingDetails.numberOfDays !== 1 ? 's' : ''} (starts at ${new Date(`2000-01-01T${bookingDetails.startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })})`
                     : `Duration: ${bookingDetails.duration} hours`
                   }
                 </div>
              </CardContent>
            </Card>

            {/* Auto-Extension */}
            {hostSettings.allowAutoExtend && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Zap className="w-5 h-5 mr-2" />
                    Smart Extensions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Auto-extend if running late</div>
                      <div className="text-sm text-gray-600">
                        Automatically extend up to {hostSettings.maxAutoExtend} hours at ${hostSettings.extensionRate}/hr
                      </div>
                    </div>
                    <Switch
                      checked={bookingDetails.autoExtend}
                      onCheckedChange={(checked) => 
                        setBookingDetails(prev => ({ ...prev, autoExtend: checked }))
                      }
                    />
                  </div>
                  {bookingDetails.autoExtend && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      <Shield className="w-3 h-3 inline mr-1" />
                      We'll only charge you for the time you actually use
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Car className="w-5 h-5 mr-2" />
                  Vehicle
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user && selectedVehicle ? (
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">
                      {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedVehicle.color || 'Color not specified'} • License: {selectedVehicle.license_plate}
                    </div>
                  </div>
                ) : user && vehicles.length === 0 ? (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <div className="font-medium text-yellow-800">No vehicle added</div>
                    <div className="text-sm text-yellow-700">Add a vehicle to complete your booking</div>
                  </div>
                ) : !user ? (
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">Vehicle information</div>
                    <div className="text-sm text-gray-600">Will be collected during checkout</div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">Loading vehicle...</div>
                  </div>
                )}
                
                {user && (
                  <VehicleManagementDialog 
                    onVehicleSelect={(vehicle) => setSelectedVehicle(vehicle)}
                    selectedVehicle={selectedVehicle}
                  >
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 p-0 h-auto text-blue-600"
                    >
                      {vehicles.length === 0 ? 'Add vehicle' : 'Use different vehicle'}
                    </Button>
                  </VehicleManagementDialog>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Payment */}
          <div className="space-y-4">
            {/* Pricing Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
                <CardContent className="space-y-3">
                   <div className="flex justify-between">
                     <span>
                       {isPricingHourly 
                         ? `$${basePrice}/hr × ${duration} hours`
                         : isPricingDaily
                         ? `$${basePrice}/day × ${duration} day${duration !== 1 ? 's' : ''}`
                         : `$${basePrice} (flat rate)`
                       }
                     </span>
                     <span>${subtotal.toFixed(2)}</span>
                   </div>
                 <div className="flex justify-between text-sm text-gray-600">
                   <span>Platform fee</span>
                   <span>${platformFee.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm text-gray-600">
                   <span>Tax</span>
                   <span>${tax.toFixed(2)}</span>
                 </div>
                 <Separator />
                 <div className="flex justify-between font-semibold text-lg">
                   <span>Total</span>
                   <span>${total.toFixed(2)}</span>
                 </div>
                 
                 {bookingDetails.autoExtend && (
                  <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                    Auto-extensions: ${hostSettings.extensionRate}/hr (if needed)
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isQRCodeBooking ? (
                  // Guest booking form
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="guestName">Full Name *</Label>
                      <Input
                        id="guestName"
                        value={guestDetails.name}
                        onChange={(e) => setGuestDetails(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="guestEmail">Email Address *</Label>
                      <Input
                        id="guestEmail"
                        type="email"
                        value={guestDetails.email}
                        onChange={(e) => setGuestDetails(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="guestPhone">Phone Number</Label>
                      <Input
                        id="guestPhone"
                        type="tel"
                        value={guestDetails.phone}
                        onChange={(e) => setGuestDetails(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                ) : (
                  // Logged in user info
                  <div className="text-sm">
                    <div className="font-medium">{userProfile.name}</div>
                    <div className="text-gray-600">{userProfile.email}</div>
                    <div className="text-gray-600">{userProfile.phone}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Book Button or Payment */}
            <Card>
              <CardContent className="pt-6">
                {!showPayment ? (
                  <>
                    <Button 
                      onClick={handleBooking}
                      className="w-full h-12 text-lg font-semibold"
                      size="lg"
                    >
                      Create Booking - ${total}
                    </Button>
                    <div className="flex items-center justify-center mt-3 text-xs text-gray-500">
                      <Shield className="w-3 h-3 mr-1" />
                      Secure payment • Instant confirmation
                    </div>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Cancellation Policy</h4>
                      <div className="text-xs text-blue-700 space-y-1">
                        <div>• 24+ hours: 100% refund</div>
                        <div>• 3-24 hours: 90% refund (10% fee, max $5)</div>
                        <div>• Less than 3 hours: No refund</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <MarketplacePaymentIntegration
                    bookingData={{
                      spotData,
                      bookingDetails,
                      user,
                      isQRCodeBooking,
                      guestDetails,
                      timeOptions,
                      isPricingDaily
                    }}
                    totalAmount={total}
                    onSuccess={handlePaymentSuccess}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookSpot;
