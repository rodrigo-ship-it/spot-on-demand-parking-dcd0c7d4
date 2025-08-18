
import { useLocation, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, MapPin, DollarSign, Clock, ArrowLeft, Phone, MessageSquare, Zap, Shield, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handlePaymentSuccess } from "@/components/WebhookHandler";

const BookingConfirmed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bookingData, setBookingData] = useState(location.state);
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Get URL parameters from Stripe redirect
  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');

  // Fetch booking data if coming from Stripe redirect
  useEffect(() => {
    const fetchBookingData = async () => {
      console.log('=== BOOKING CONFIRMATION DEBUG ===');
      console.log('Initial bookingData from location.state:', bookingData);
      
      // If we already have booking data from navigation state, format it properly
      if (bookingData) {
        console.log('Using navigation state data - raw times:');
        console.log('startTime (raw):', bookingData.startTime);
        console.log('endTime (raw):', bookingData.endTime);
        
        // Convert 24-hour format (like "09:00") to 12-hour format
        const formatTimeFrom24Hour = (timeString: string) => {
          console.log('Converting 24-hour time:', timeString);
          const [hours24, minutes] = timeString.split(':');
          const hours = parseInt(hours24);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          const result = `${displayHours}:${minutes} ${ampm}`;
          console.log('Converted to:', result);
          return result;
        };

        const formattedData = {
          ...bookingData,
          date: new Date(bookingData.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          startTime: formatTimeFrom24Hour(bookingData.startTime),
          endTime: bookingData.endTime ? formatTimeFrom24Hour(bookingData.endTime) : formatTimeFrom24Hour(bookingData.startTime)
        };
        
        console.log('Final formatted data for display:', formattedData);
        setBookingData(formattedData);
        return;
      }

      // If we have URL parameters from Stripe, handle payment success and fetch the booking data
      if (bookingId && sessionId) {
        setLoading(true);
        try {
          // Call the webhook handler to process payment success
          await handlePaymentSuccess(sessionId);
          
          // Fetch booking details
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

          if (bookingError) throw bookingError;

          // Fetch spot details
          const { data: spot, error: spotError } = await supabase
            .from('parking_spots')
            .select('*')
            .eq('id', booking.spot_id)
            .single();

          if (spotError) throw spotError;

          // Get timezone for the spot location
          let spotTimezone = 'UTC'; // fallback
          if (spot.latitude && spot.longitude) {
            try {
              // Use Google's Timezone API
              const response = await supabase.functions.invoke('get-mapbox-token');
              const { google_places_key } = response.data || {};
              
              if (google_places_key) {
                const timezoneResponse = await fetch(
                  `https://maps.googleapis.com/maps/api/timezone/json?location=${spot.latitude},${spot.longitude}&timestamp=${Math.floor(Date.now() / 1000)}&key=${google_places_key}`
                );
                const timezoneData = await timezoneResponse.json();
                if (timezoneData.status === 'OK') {
                  spotTimezone = timezoneData.timeZoneId;
                }
              }
            } catch (error) {
              console.error('Error getting timezone:', error);
            }
          }

          // Calculate duration in hours
          const durationInHours = Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60));
          const isDaily = durationInHours >= 24;
          
          // Extract just the time portion from the stored datetime - no conversion
          const extractTime = (dateString: string) => {
            // Extract time portion (HH:MM) from ISO string and format as 12-hour
            const time = dateString.split('T')[1].split(':');
            const hours = parseInt(time[0]);
            const minutes = time[1];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours}:${minutes} ${ampm}`;
          };

          const extractDate = (dateString: string) => {
            // Extract date portion and format nicely
            const date = new Date(dateString.split('T')[0]);
            return date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          };
          
          const formattedData = {
            date: extractDate(booking.start_time),
            startTime: extractTime(booking.start_time),
            endTime: extractTime(booking.end_time),
            duration: durationInHours,
            total: booking.total_amount,
            confirmationNumber: booking.id.slice(0, 8).toUpperCase(),
            bookingId: booking.id,
            autoExtend: false, // Default value
            isDaily: isDaily,
            spotData: {
              title: spot.title,
              address: spot.address,
              price: isDaily ? (spot.daily_price || spot.one_time_price) : spot.price_per_hour,
              pricing_type: spot.pricing_type
            }
          };

          setBookingData(formattedData);
        } catch (error) {
          console.error('Error fetching booking data:', error);
          toast.error('Failed to load booking details');
          navigate('/');
        } finally {
          setLoading(false);
        }
      } else {
        // No booking data and no URL parameters - redirect to home
        navigate('/');
      }
    };

    fetchBookingData();
  }, [bookingId, bookingData, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return null;
  }


  const sendConfirmationEmail = async () => {
    if (!bookingData?.bookingId) {
      toast.error('Booking information not available');
      return;
    }

    setEmailLoading(true);
    try {
      // Get user profile to send email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('User email not found');
        return;
      }

      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingData.bookingId)
        .single();

      if (bookingError) {
        toast.error('Failed to fetch booking details');
        return;
      }

      // Get spot details
      const { data: spot, error: spotError } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('id', booking.spot_id)
        .single();

      if (spotError) {
        toast.error('Failed to fetch spot details');
        return;
      }

      // Send confirmation email
      const { error: emailError } = await supabase.functions.invoke('send-booking-confirmation', {
        body: {
          email: user.email,
          booking: {
            id: booking.id,
            total_amount: booking.total_amount,
            start_time: booking.start_time,
            end_time: booking.end_time,
            confirmation_number: booking.id.slice(0, 8).toUpperCase()
          },
          spot: {
            title: spot.title,
            address: spot.address,
            price_per_hour: spot.price_per_hour,
            one_time_price: spot.one_time_price,
            daily_price: spot.daily_price,
            pricing_type: spot.pricing_type
          },
          renter: {
            full_name: user.user_metadata?.full_name || 'Customer'
          }
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        toast.error('Failed to send confirmation email');
      } else {
        toast.success('Confirmation email sent successfully!');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send confirmation email');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="hover:scale-105 transition-transform duration-200">
                <img 
                  src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
                  alt="Arriv Logo" 
                  className="w-16 h-16 hover:drop-shadow-lg transition-all duration-200"
                />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/bookings">
                <Button variant="outline" size="sm">
                  My Bookings
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600">
            Your parking spot has been successfully reserved
          </p>
        </div>

        {/* Booking Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{bookingData.spotData?.title}</h3>
                <div className="flex items-center text-gray-600 mt-1">
                  <MapPin className="w-4 h-4 mr-2" />
                  {bookingData.spotData?.address}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  ${bookingData.spotData?.price}/{bookingData.isDaily ? 'day' : 'hr'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-gray-600">{bookingData.date}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <p className="font-medium">Time</p>
                   <p className="text-gray-600">
                     {bookingData.startTime} - {bookingData.endTime}
                   </p>
                </div>
              </div>
            </div>

            {bookingData.autoExtend && (
              <div className="pt-4 border-t">
                <div className="flex items-center text-green-600 bg-green-50 p-3 rounded">
                  <Zap className="w-4 h-4 mr-2" />
                  <span className="text-sm">Auto-extension enabled - No overtime fees if you run late!</span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Paid</span>
                <span className="text-xl font-bold text-green-600">
                  ${bookingData.total}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {bookingData.isDaily 
                  ? `${Math.ceil(bookingData.duration / 24)} day${Math.ceil(bookingData.duration / 24) > 1 ? 's' : ''} × $${bookingData.spotData?.price}/day (includes fees & tax)`
                  : `${bookingData.duration} hours × $${bookingData.spotData?.price}/hour (includes fees & tax)`
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Number */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Confirmation Number</p>
              <p className="text-lg font-mono font-bold text-blue-600">
                {bookingData.confirmationNumber}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Check your email</p>
                  <p className="text-gray-600 text-sm">
                    We've sent you a confirmation email with parking instructions
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Arrive at your spot</p>
                  <p className="text-gray-600 text-sm">
                    Follow the parking instructions in your confirmation email
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Relax & enjoy</p>
                  <p className="text-gray-600 text-sm">
                    {bookingData.autoExtend ? "Auto-extension will handle any delays automatically" : "Remember to return by your end time"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Confirmation Button */}
        <div className="mb-6">
          <Button 
            onClick={sendConfirmationEmail}
            disabled={emailLoading}
            className="w-full"
            variant="outline"
          >
            <Mail className="w-4 h-4 mr-2" />
            {emailLoading ? "Sending Email..." : "Send Confirmation Email"}
          </Button>
          <p className="text-sm text-gray-600 text-center mt-2">
            Click to receive your booking confirmation via email
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Owner
          </Button>
          <Button variant="outline" className="w-full">
            <Phone className="w-4 h-4 mr-2" />
            Get Support
          </Button>
          <Link to="/bookings">
            <Button className="w-full">
              View All Bookings
            </Button>
          </Link>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmed;
