
import { useLocation, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, MapPin, DollarSign, Clock, ArrowLeft, Phone, MessageSquare, Zap, Shield, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      // If we already have booking data from navigation state, use it directly
      if (bookingData) {
        setBookingData(bookingData);
        return;
      }

      // If we have sessionId from Stripe redirect, find the booking
      if (sessionId) {
        setLoading(true);
        try {
          // First get the checkout session to find the payment intent
          let { data: sessionData, error: sessionError } = await supabase.functions.invoke('get-session-details', {
            body: { session_id: sessionId }
          });

          if (sessionError || !sessionData?.payment_intent_id) {
            console.error('❌ [SESSION_ERROR] Failed to get session details:', sessionError);
            console.error('🔍 [SESSION_DATA] Received session data:', sessionData);
            
            // Wait a bit and retry session details (webhook might be processing)
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const { data: retrySessionData, error: retrySessionError } = await supabase.functions.invoke('get-session-details', {
              body: { session_id: sessionId }
            });
            
            if (retrySessionError || !retrySessionData?.payment_intent_id) {
              console.error('❌ [RETRY_SESSION_ERROR] Still failed to get session details:', retrySessionError);
              console.error('🔍 [RETRY_SESSION_DATA] Received retry session data:', retrySessionData);
              
              // As final fallback, check for recent bookings with this session_id or payment_intent
              // But wait a bit more for webhook to process
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Try to find booking by session_id stored somewhere or recent confirmed booking
              const { data: recentBookings, error: recentError } = await supabase
                .from('bookings')
                .select('*')
                .eq('status', 'confirmed')
                .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
                .order('created_at', { ascending: false })
                .limit(1);

              if (!recentError && recentBookings && recentBookings.length > 0) {
                // Use the most recent confirmed booking
                const booking = recentBookings[0];
                
                // Fetch spot details
                const { data: spot, error: spotError } = await supabase
                  .from('parking_spots')
                  .select('*')
                  .eq('id', booking.spot_id)
                  .single();

                if (!spotError && spot) {
                  const durationInHours = Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60));
                  const isDaily = durationInHours >= 24;
                  
                  const formattedData = {
                    date: booking.display_date || "Your selected date",
                    startTime: booking.display_start_time || "Your selected start time", 
                    endTime: booking.display_end_time || "Your selected end time",
                    duration: isDaily ? Math.ceil(durationInHours / 24) : durationInHours,
                    total: booking.total_amount,
                    confirmationNumber: booking.id.slice(0, 8).toUpperCase(),
                    bookingId: booking.id,
                    autoExtend: false,
                    isDaily: isDaily,
                    numberOfDays: isDaily ? Math.ceil(durationInHours / 24) : 1,
                    spotData: {
                      title: spot.title,
                      address: spot.address,
                      price: isDaily ? (spot.daily_price || spot.one_time_price) : spot.price_per_hour,
                      pricing_type: spot.pricing_type
                    }
                  };

                  setBookingData(formattedData);
                  return;
                }
              }
              
              throw new Error('Could not retrieve session details or find recent booking');
            } else {
              // Use retry session data
              sessionData = retrySessionData;
            }
          }

          // Find booking by payment_intent_id
          console.log('🔍 [BOOKING_LOOKUP] Looking for booking with payment_intent_id:', sessionData.payment_intent_id);
          
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('payment_intent_id', sessionData.payment_intent_id)
            .single();

          if (bookingError) {
            console.error('❌ [BOOKING_ERROR] Failed to find booking:', bookingError);
            console.error('🔍 [BOOKING_ERROR_DETAILS] Payment intent ID used:', sessionData.payment_intent_id);
            throw bookingError;
          }

          // Fetch spot details
          const { data: spot, error: spotError } = await supabase
            .from('parking_spots')
            .select('*')
            .eq('id', booking.spot_id)
            .single();

          if (spotError) throw spotError;

          // Use the stored display values - exactly what the user originally saw
          const durationInHours = Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60));
          const isDaily = durationInHours >= 24;
          
          const formattedData = {
            date: booking.display_date || "Your selected date",
            startTime: booking.display_start_time || "Your selected start time", 
            endTime: booking.display_end_time || "Your selected end time",
            duration: isDaily ? Math.ceil(durationInHours / 24) : durationInHours,
            total: booking.total_amount,
            confirmationNumber: booking.id.slice(0, 8).toUpperCase(),
            bookingId: booking.id,
            autoExtend: false,
            isDaily: isDaily,
            numberOfDays: isDaily ? Math.ceil(durationInHours / 24) : 1,
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
      } else if (bookingId) {
        // If we only have booking_id, fetch directly
        setLoading(true);
        try {
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

          const durationInHours = Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60));
          const isDaily = durationInHours >= 24;
          
          const formattedData = {
            date: booking.display_date || "Your selected date",
            startTime: booking.display_start_time || "Your selected start time", 
            endTime: booking.display_end_time || "Your selected end time",
            duration: isDaily ? Math.ceil(durationInHours / 24) : durationInHours,
            total: booking.total_amount,
            confirmationNumber: booking.id.slice(0, 8).toUpperCase(),
            bookingId: booking.id,
            autoExtend: false,
            isDaily: isDaily,
            numberOfDays: isDaily ? Math.ceil(durationInHours / 24) : 1,
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

      // Send confirmation email with display values (not database values)
      const { error: emailError } = await supabase.functions.invoke('send-booking-confirmation', {
        body: {
          email: user.email,
          booking: {
            id: booking.id,
            total_amount: booking.total_amount,
            confirmation_number: booking.id.slice(0, 8).toUpperCase(),
            // Use the stored display values from the database
            display_date: booking.display_date || bookingData?.date || 'Date not available',
            display_start_time: booking.display_start_time || bookingData?.startTime || 'Time not available',
            display_end_time: booking.display_end_time || bookingData?.endTime || 'Time not available',
            number_of_days: bookingData?.numberOfDays || 1,
            is_daily: bookingData?.isDaily || false
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

        {/* Important Checkout Warning */}
        <Card className="mb-6 border-2 border-red-200 bg-red-50">
          <CardContent className="py-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800 mb-2">
                  ⚠️ Important: You Must Check Out When Leaving
                </h3>
                <div className="space-y-2 text-red-700">
                  <p className="font-medium">
                    Failure to check out upon leaving your parking spot will result in late fee charges:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><strong>0-30 minutes late:</strong> No penalty (grace period)</li>
                    <li><strong>31-60 minutes late:</strong> $8 penalty + hourly overage charges</li>
                    <li><strong>61-120 minutes late:</strong> $12 penalty + hourly overage charges</li>
                    <li><strong>120+ minutes late:</strong> $20 penalty + hourly overage charges</li>
                  </ul>
                  <div className="mt-3 p-3 bg-red-100 rounded-md">
                    <p className="font-semibold text-red-800">
                      💳 Late fees are automatically charged to your payment method on file.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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

        {/* Cancellation Policy */}
        <Card className="mb-6 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Clock className="w-5 h-5" />
              Cancellation Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 mt-1 flex-shrink-0"></div>
                <div>
                  <p className="text-sm"><strong>24+ hours before booking:</strong> 100% refund, no cancellation fee</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3 mt-1 flex-shrink-0"></div>
                <div>
                  <p className="text-sm"><strong>3-24 hours before booking:</strong> 90% refund, 10% cancellation fee (max $5)</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3 mt-1 flex-shrink-0"></div>
                <div>
                  <p className="text-sm"><strong>Less than 3 hours before:</strong> No refund available, but you can still cancel the booking</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-orange-700 mt-3 bg-orange-100 p-2 rounded-md">
              You can manage your bookings and cancellations in the "My Bookings" section.
            </p>
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
