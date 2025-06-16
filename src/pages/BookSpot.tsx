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
import { toast } from "sonner";

const BookSpot = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const spotData = location.state?.spotData;

  // Pre-filled user data (would come from user profile in real app)
  const [userProfile] = useState({
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+1 (555) 123-4567",
    vehicle: {
      make: "Toyota",
      model: "Camry",
      year: "2022",
      color: "Silver",
      licensePlate: "ABC123"
    },
    paymentMethod: {
      type: "Visa",
      lastFour: "4242",
      expiry: "12/25"
    }
  });

  // Booking state
  const [bookingDetails, setBookingDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    endTime: "17:00",
    duration: 8,
    autoExtend: true,
    maxExtension: 2 // hours
  });

  // Pricing calculation
  const basePrice = spotData?.price || 8;
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
    // Simulate booking process
    toast.loading("Processing your booking...");
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success("Booking confirmed!");
    
    // Navigate to confirmation page
    navigate('/booking-confirmed', { 
      state: { 
        ...bookingDetails,
        spotData,
        total,
        confirmationNumber: `PS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      }
    });
  };

  if (!spotData) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg shadow-sm border-b border-gray-200/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mr-4 text-slate-600 hover:text-violet-600 hover:bg-violet-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold text-slate-900">Complete Your Booking</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Booking Details */}
          <div className="space-y-4">
            {/* Spot Information */}
            <Card className="border-0 shadow-lg shadow-slate-900/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900">{spotData.title}</CardTitle>
                <div className="flex items-center text-slate-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{spotData.address}</span>
                </div>
              </CardHeader>
            </Card>

            {/* Date & Time */}
            <Card className="border-0 shadow-lg shadow-slate-900/5">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-slate-900">
                  <Calendar className="w-5 h-5 mr-2" />
                  When
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="date" className="text-slate-700">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={bookingDetails.date}
                      onChange={(e) => handleTimeChange('date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startTime" className="text-slate-700">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={bookingDetails.startTime}
                      onChange={(e) => handleTimeChange('startTime', e.target.value)}
                      className="border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime" className="text-slate-700">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={bookingDetails.endTime}
                      onChange={(e) => handleTimeChange('endTime', e.target.value)}
                      className="border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                    />
                  </div>
                </div>
                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  Duration: {bookingDetails.duration} hours
                </div>
              </CardContent>
            </Card>

            {/* Auto-Extension */}
            {hostSettings.allowAutoExtend && (
              <Card className="border-0 shadow-lg shadow-slate-900/5">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg text-slate-900">
                    <Zap className="w-5 h-5 mr-2" />
                    Smart Extensions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">Auto-extend if running late</div>
                      <div className="text-sm text-slate-600">
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
                    <div className="text-xs text-violet-700 bg-violet-50 p-2 rounded-lg">
                      <Shield className="w-3 h-3 inline mr-1" />
                      We'll only charge you for the time you actually use
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Vehicle Information */}
            <Card className="border-0 shadow-lg shadow-slate-900/5">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-slate-900">
                  <Car className="w-5 h-5 mr-2" />
                  Vehicle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="font-medium text-slate-900">
                    {userProfile.vehicle.year} {userProfile.vehicle.make} {userProfile.vehicle.model}
                  </div>
                  <div className="text-sm text-slate-600">
                    {userProfile.vehicle.color} • License: {userProfile.vehicle.licensePlate}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-violet-600 hover:text-violet-700">
                  Use different vehicle
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Payment */}
          <div className="space-y-4">
            {/* Pricing Summary */}
            <Card className="border-0 shadow-lg shadow-slate-900/5">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-slate-900">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-slate-900">
                  <span>${basePrice}/hr × {duration} hours</span>
                  <span>${subtotal}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Service fee</span>
                  <span>${serviceFee}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tax</span>
                  <span>${tax}</span>
                </div>
                <Separator className="bg-slate-200" />
                <div className="flex justify-between font-semibold text-lg text-slate-900">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
                
                {bookingDetails.autoExtend && (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                    Auto-extensions: ${hostSettings.extensionRate}/hr (if needed)
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="border-0 shadow-lg shadow-slate-900/5">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-slate-900">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded mr-3"></div>
                    <div>
                      <div className="font-medium text-slate-900">{userProfile.paymentMethod.type} ****{userProfile.paymentMethod.lastFour}</div>
                      <div className="text-sm text-slate-600">Expires {userProfile.paymentMethod.expiry}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50">Change</Button>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="border-0 shadow-lg shadow-slate-900/5">
              <CardHeader>
                <CardTitle className="text-slate-900">Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <div className="font-medium text-slate-900">{userProfile.name}</div>
                  <div className="text-slate-600">{userProfile.email}</div>
                  <div className="text-slate-600">{userProfile.phone}</div>
                </div>
              </CardContent>
            </Card>

            {/* Book Button */}
            <Card className="border-0 shadow-lg shadow-slate-900/5">
              <CardContent className="pt-6">
                <Button 
                  onClick={handleBooking}
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                  size="lg"
                >
                  Book for ${total}
                </Button>
                <div className="flex items-center justify-center mt-3 text-xs text-slate-500">
                  <Shield className="w-3 h-3 mr-1" />
                  Secure payment • Instant confirmation • Free cancellation
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookSpot;
