import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, MapPin, DollarSign, Car, CreditCard } from "lucide-react";
import { PaymentIntegration } from "@/components/PaymentIntegration";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ParkingSpot {
  id: string;
  title: string;
  location: string;
  image: string;
  description: string;
  hourlyRate: number;
  timeOptions: string[];
  maxDuration: number;
}

// Mock data - replace with actual data fetching
const mockSpots: ParkingSpot[] = [
  {
    id: "1",
    title: "Downtown Business District",
    location: "123 Main St, Downtown",
    image: "/lovable-uploads/settld-logo.png",
    description: "Secure covered parking in the heart of downtown",
    hourlyRate: 8,
    timeOptions: ["1 hour", "2 hours", "4 hours", "8 hours"],
    maxDuration: 8
  }
];

const RentQR = () => {
  const { spotId } = useParams();
  const navigate = useNavigate();
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [selectedDuration, setSelectedDuration] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingId, setBookingId] = useState<string>("");

  useEffect(() => {
    // Redirect to the new booking flow with QR parameter
    if (spotId) {
      navigate(`/book-spot/${spotId}?action=book&qr=true`);
    } else {
      toast.error("Invalid QR code");
      navigate("/");
    }
  }, [spotId, navigate]);

  const calculateTotal = () => {
    if (!spot || !selectedDuration) return 0;
    const hours = parseInt(selectedDuration.split(" ")[0]);
    return spot.hourlyRate * hours;
  };

  const handleRentNow = async () => {
    if (!customerEmail || !customerName || !selectedDuration) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create booking record
      const hours = parseInt(selectedDuration.split(" ")[0]);
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
      
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          spot_id: spotId,
          renter_id: null, // Guest booking
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_amount: calculateTotal(),
          status: 'pending',
          qr_code_used: true
        })
        .select()
        .single();

      if (error) throw error;

      setBookingId(booking.id);
      setShowPayment(true);
      toast.success("Booking created! Please complete payment.");
    } catch (error) {
      console.error('Booking error:', error);
      toast.error("Failed to create booking. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = (paymentData: any) => {
    toast.success("Payment successful! Booking confirmed.");
    navigate("/booking-confirmed", { 
      state: { 
        bookingId,
        paymentData,
        customerEmail,
        customerName
      }
    });
  };

  const handlePaymentError = (error: string) => {
    toast.error(`Payment failed: ${error}`);
  };

  if (!spot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading parking spot...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Rental</h1>
          <p className="text-gray-600">Book this parking spot instantly - no account required</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start space-x-4">
              <img 
                src={spot.image} 
                alt={spot.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <CardTitle className="text-xl">{spot.title}</CardTitle>
                <CardDescription className="flex items-center mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  {spot.location}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{spot.description}</p>
            <div className="flex items-center text-lg font-semibold text-primary">
              <DollarSign className="w-5 h-5 mr-1" />
              ${spot.hourlyRate}/hour
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Rental Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="duration">How long do you need the spot?</Label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {spot.timeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDuration && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Cost:</span>
                  <span className="text-2xl font-bold text-primary">${calculateTotal()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>We'll send your booking confirmation here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Enter your email address"
                required
              />
            </div>
          </CardContent>
        </Card>

        {!showPayment ? (
          <Button 
            onClick={handleRentNow}
            disabled={isProcessing || !selectedDuration || !customerEmail || !customerName}
            className="w-full h-12 text-lg bg-primary hover:bg-secondary"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            {isProcessing ? "Processing..." : `Create Booking - $${calculateTotal()}`}
          </Button>
        ) : (
          <PaymentIntegration
            bookingId={bookingId}
            baseAmount={calculateTotal()}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        )}

        <p className="text-sm text-gray-500 text-center mt-4">
          Secure payment powered by Stripe. Your information is protected.
        </p>
      </div>
    </div>
  );
};

export default RentQR;