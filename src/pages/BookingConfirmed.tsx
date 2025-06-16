import { useLocation, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, MapPin, DollarSign, Clock, ArrowLeft, Phone, MessageSquare, Zap, Shield } from "lucide-react";
import { useEffect } from "react";

const BookingConfirmed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state;

  // Redirect to home if no booking data
  useEffect(() => {
    if (!bookingData) {
      navigate('/');
    }
  }, [bookingData, navigate]);

  if (!bookingData) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-lg shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">ParkSpot</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/bookings">
                <Button variant="outline" size="sm" className="border-gray-300 hover:border-violet-300 hover:bg-violet-50">
                  My Bookings
                </Button>
              </Link>
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">Sign In</Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-slate-600">
            Your parking spot has been successfully reserved
          </p>
        </div>

        {/* Booking Details */}
        <Card className="mb-6 border-0 shadow-lg shadow-slate-900/5">
          <CardHeader>
            <CardTitle className="text-slate-900">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-slate-900">{bookingData.spotData?.title}</h3>
                <div className="flex items-center text-slate-600 mt-1">
                  <MapPin className="w-4 h-4 mr-2" />
                  {bookingData.spotData?.address}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-violet-600">
                  ${bookingData.spotData?.price || 8}/hr
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-3 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-900">Date</p>
                  <p className="text-slate-600">{formatDate(bookingData.date)}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-3 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-900">Time</p>
                  <p className="text-slate-600">
                    {formatTime(bookingData.startTime)} - {formatTime(bookingData.endTime)}
                  </p>
                </div>
              </div>
            </div>

            {bookingData.autoExtend && (
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center text-emerald-700 bg-emerald-50 p-3 rounded-lg">
                  <Zap className="w-4 h-4 mr-2" />
                  <span className="text-sm">Auto-extension enabled - No overtime fees if you run late!</span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-900">Total Paid</span>
                <span className="text-xl font-bold text-emerald-600">
                  ${bookingData.total}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                {bookingData.duration} hours × ${bookingData.spotData?.price || 8}/hour (includes fees & tax)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Number */}
        <Card className="mb-6 border-0 shadow-lg shadow-slate-900/5">
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Confirmation Number</p>
              <p className="text-lg font-mono font-bold text-violet-600">
                {bookingData.confirmationNumber}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6 border-0 shadow-lg shadow-slate-900/5">
          <CardHeader>
            <CardTitle className="text-slate-900">What's Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-slate-900">Check your email</p>
                  <p className="text-slate-600 text-sm">
                    We've sent you a confirmation email with parking instructions
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-slate-900">Arrive at your spot</p>
                  <p className="text-slate-600 text-sm">
                    Follow the parking instructions in your confirmation email
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium text-slate-900">Relax & enjoy</p>
                  <p className="text-slate-600 text-sm">
                    {bookingData.autoExtend ? "Auto-extension will handle any delays automatically" : "Remember to return by your end time"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="w-full border-slate-300 hover:border-violet-300 hover:bg-violet-50">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Owner
          </Button>
          <Button variant="outline" className="w-full border-slate-300 hover:border-violet-300 hover:bg-violet-50">
            <Phone className="w-4 h-4 mr-2" />
            Get Support
          </Button>
          <Link to="/bookings">
            <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
              View All Bookings
            </Button>
          </Link>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link to="/">
            <Button variant="ghost" className="text-slate-600 hover:text-violet-600 hover:bg-violet-50">
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
