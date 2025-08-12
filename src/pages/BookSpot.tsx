
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, Clock, DollarSign, Shield, Car, CreditCard, Calendar, Zap } from "lucide-react";
import { PaymentIntegration } from "@/components/PaymentIntegration";
import { MarketplacePaymentIntegration } from "@/components/MarketplacePaymentIntegration";
import { toast } from "sonner";
import { VehicleManagementDialog } from "@/components/VehicleManagementDialog";
import { PaymentMethodDialog } from "@/components/PaymentMethodDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BookSpot = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [spotData, setSpotData] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string>("");

  // Booking state
  const [bookingDetails, setBookingDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    endTime: "17:00",
    duration: 8,
    autoExtend: true,
    maxExtension: 2 // hours
  });

  // Load spot data and user profile
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        // Load parking spot data
        const { data: spot, error: spotError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('id', id)
          .single();

        if (spotError) {
          toast.error("Failed to load parking spot");
          navigate('/');
          return;
        }

        setSpotData(spot);

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
            vehicle: {
              make: '',
              model: '',
              year: '',
              color: '',
              licensePlate: ''
            },
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
            vehicle: {
              make: '',
              model: '',
              year: '',
              color: '',
              licensePlate: ''
            },
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

  // Pricing calculation
  const basePrice = spotData?.price_per_hour || 8;
  const duration = bookingDetails.duration;
  const subtotal = basePrice * duration;
  const serviceFee = Math.round(subtotal * 0.08); // 8% service fee
  const tax = Math.round(subtotal * 0.0875); // 8.75% tax
  const total = subtotal + serviceFee + tax;

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

  const handleBooking = async () => {
    if (!user || !spotData) {
      toast.error("Missing required data");
      return;
    }

    toast.loading("Creating your booking...");
    
    try {
      // Create booking start and end times
      const startDateTime = new Date(`${bookingDetails.date}T${bookingDetails.startTime}`);
      const endDateTime = new Date(`${bookingDetails.date}T${bookingDetails.endTime}`);

      // Create booking in database
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          spot_id: spotData.id,
          renter_id: user.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          total_amount: total,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setCreatedBookingId(booking.id);
      setShowPayment(true);
      toast.success("Booking created! Please complete payment.");
    } catch (error) {
      console.error('Booking error:', error);
      toast.error("Failed to create booking. Please try again.");
    }
  };

  const handlePaymentSuccess = () => {
    toast.success("Payment successful! The spot owner received their payout instantly.");
    navigate('/booking-confirmed', { 
      state: { 
        ...bookingDetails,
        spotData,
        total,
        confirmationNumber: createdBookingId.slice(0, 8).toUpperCase(),
        bookingId: createdBookingId
      }
    });
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
          <h1 className="text-xl font-semibold">Complete Your Booking</h1>
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
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={bookingDetails.date}
                      onChange={(e) => handleTimeChange('date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={bookingDetails.startTime}
                      onChange={(e) => handleTimeChange('startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={bookingDetails.endTime}
                      onChange={(e) => handleTimeChange('endTime', e.target.value)}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  Duration: {bookingDetails.duration} hours
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
                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-medium">
                    {userProfile.vehicle.year} {userProfile.vehicle.make} {userProfile.vehicle.model}
                  </div>
                  <div className="text-sm text-gray-600">
                    {userProfile.vehicle.color} • License: {userProfile.vehicle.licensePlate}
                  </div>
                </div>
                <VehicleManagementDialog onVehicleSelect={() => {}}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 p-0 h-auto text-blue-600"
                  >
                    Use different vehicle
                  </Button>
                </VehicleManagementDialog>
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
                  <span>${basePrice}/hr × {duration} hours</span>
                  <span>${subtotal}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Service fee</span>
                  <span>${serviceFee}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>${tax}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
                
                {bookingDetails.autoExtend && (
                  <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                    Auto-extensions: ${hostSettings.extensionRate}/hr (if needed)
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div className="flex items-center">
                    <div className="w-8 h-5 bg-blue-600 rounded mr-3"></div>
                    <div>
                      <div className="font-medium">{userProfile.paymentMethod.type} ****{userProfile.paymentMethod.lastFour}</div>
                      <div className="text-sm text-gray-600">Expires {userProfile.paymentMethod.expiry}</div>
                    </div>
                  </div>
                  <PaymentMethodDialog onPaymentMethodSelect={() => {}} selectedMethod={null}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                    >
                      Change
                    </Button>
                  </PaymentMethodDialog>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <div className="font-medium">{userProfile.name}</div>
                  <div className="text-gray-600">{userProfile.email}</div>
                  <div className="text-gray-600">{userProfile.phone}</div>
                </div>
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
                      Secure payment • Instant confirmation • Free cancellation
                    </div>
                  </>
                ) : (
                  <MarketplacePaymentIntegration
                    bookingId={createdBookingId}
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
