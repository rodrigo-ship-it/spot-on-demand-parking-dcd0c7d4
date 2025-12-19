
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, DollarSign, Clock, Car, Edit, Eye, MoreHorizontal, ArrowLeft, Search, Plus, Calendar, User, Phone, Mail, QrCode, Filter, Trash2, Crown, ExternalLink, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { BookingDetailsDialog } from "@/components/BookingDetailsDialog";
import { FilterDialog } from "@/components/FilterDialog";
import { StripeConnectOnboarding } from "@/components/StripeConnectOnboarding";
import { ContactButtons } from "@/components/ContactButtons";
import { PremiumSubscriptionDialog } from "@/components/PremiumSubscriptionDialog";
import { PremiumBadge } from "@/components/PremiumBadge";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ManageSpots = () => {
  const { user } = useAuth();
  const { getUnreadCount } = useUnreadMessages();
  const { isPremium, subscription, loading: premiumLoading, refetch: refetchPremium } = usePremiumStatus();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpotForQR, setSelectedSpotForQR] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<any>({});
  const [parkingSpots, setParkingSpots] = useState<any[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserSpots();
      fetchUpcomingReservations();
    }
    
    // Check for premium subscription success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('premium') === 'success') {
      toast.success('Premium subscription activated! Your spots now have premium badges.');
      refetchPremium();
      // Clean up URL
      navigate('/manage-spots', { replace: true });
    }
  }, [user]);

  const fetchUserSpots = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_spots')
        .select(`
          *,
          bookings(
            id,
            status,
            total_amount,
            created_at,
            start_time,
            end_time
          )
        `)
        .eq('owner_id', user?.id);

      if (error) {
        console.error('Error fetching spots:', error);
        toast.error("Failed to load your parking spots");
        return;
      }

      // Get current date for monthly calculations
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Process the data to calculate earnings and bookings
      const processedSpots = data?.map(spot => {
        const completedBookings = spot.bookings?.filter((b: any) => b.status === 'confirmed' || b.status === 'completed') || [];
        
        const thisMonthBookings = completedBookings.filter((b: any) => {
          const bookingDate = new Date(b.created_at);
          return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
        });

        const lastMonthBookings = completedBookings.filter((b: any) => {
          const bookingDate = new Date(b.created_at);
          return bookingDate.getMonth() === lastMonth && bookingDate.getFullYear() === lastMonthYear;
        });

        const thisMonthEarnings = thisMonthBookings.reduce((sum: number, booking: any) => 
          sum + Number(booking.total_amount), 0);
        
        const lastMonthEarnings = lastMonthBookings.reduce((sum: number, booking: any) => 
          sum + Number(booking.total_amount), 0);

        return {
          id: spot.id,
          title: spot.title,
          address: spot.address,
          type: spot.spot_type || 'Standard',
          price: spot.pricing_type === 'hourly' ? Number(spot.price_per_hour) :
                 spot.pricing_type === 'daily' ? Number(spot.daily_price) :
                 spot.pricing_type === 'monthly' ? Number(spot.monthly_price) :
                 Number(spot.one_time_price),
          pricingType: spot.pricing_type,
          status: spot.is_active ? "Active" : "Paused",
          totalBookings: spot.bookings?.length || 0,
          monthlyEarnings: thisMonthEarnings,
          lastMonthEarnings: lastMonthEarnings,
          lastBooked: spot.bookings?.length > 0 
            ? new Date(Math.max(...spot.bookings.map((b: any) => new Date(b.created_at).getTime()))).toLocaleDateString()
            : "Never",
          availability: spot.availability_schedule ? "Custom Schedule" : "24/7",
          totalSpots: spot.total_spots || 1,
          availableSpots: spot.available_spots || 1,
          rating: Number(spot.rating) || 0,
          totalReviews: spot.total_reviews || 0
        };
      }) || [];

      setParkingSpots(processedSpots);
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred while loading your spots");
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingReservations = async () => {
    try {
      if (!user?.id) return;

      // Get user's spots first
      const { data: spots, error: spotsError } = await supabase
        .from('parking_spots')
        .select('id')
        .eq('owner_id', user.id);

      if (spotsError) {
        console.error('Error fetching user spots:', spotsError);
        return;
      }

      if (!spots || spots.length === 0) {
        setUpcomingReservations([]);
        return;
      }

      const spotIds = spots.map(spot => spot.id);

      // Get reservations from the past 24 hours
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          parking_spots (
            title,
            address,
            price_per_hour,
            daily_price,
            monthly_price,
            one_time_price,
            pricing_type
          )
        `)
        .in('spot_id', spotIds)
        .in('status', ['confirmed', 'active', 'pending', 'completed'])
        .gte('start_time', twentyFourHoursAgo.toISOString())
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching reservations:', error);
        return;
      }

      const processedReservations = data?.map(booking => {
        try {
          // Parse dates as local times (same logic as Bookings page)
          const startDate = booking.start_time ? new Date(booking.start_time + (booking.start_time.includes('T') && !booking.start_time.includes('Z') ? '' : '')) : null;
          const endDate = booking.end_time ? new Date(booking.end_time + (booking.end_time.includes('T') && !booking.end_time.includes('Z') ? '' : '')) : null;
          
          console.log('📅 [MY_SPOTS_BOOKING_DEBUG]', {
            id: booking.id.substring(0, 8),
            start_time_raw: booking.start_time,
            end_time_raw: booking.end_time,
            startDate: startDate?.toString(),
            endDate: endDate?.toString(),
            currentTime: new Date().toString()
          });
          
          // Check if dates are valid
          const isStartDateValid = startDate && !isNaN(startDate.getTime());
          const isEndDateValid = endDate && !isNaN(endDate.getTime());
          
          if (!isStartDateValid || !isEndDateValid) {
            console.error('Invalid date in booking:', booking.id, {
              start_time: booking.start_time,
              end_time: booking.end_time,
              startDateValid: isStartDateValid,
              endDateValid: isEndDateValid
            });
            return null; // Skip this booking
          }
          
          const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
          
          // Determine status based on times first, then booking status (same logic as Bookings page)
          let status = 'Upcoming';
          const now = new Date();
          const nowTime = now.getTime();
          const startTime = startDate.getTime();
          const endTime = endDate.getTime();
          
          console.log('🕐 [MY_SPOTS_STATUS_DEBUG]', {
            bookingId: booking.id.substring(0, 8),
            now: now.toLocaleString(),
            startDate: startDate.toLocaleString(),
            endDate: endDate.toLocaleString(),
            nowTime,
            startTime,
            endTime,
            dbStatus: booking.status,
            currentHour: now.getHours(),
            currentMinute: now.getMinutes()
          });
          
          // Time-based status takes priority over database status (except for cancelled)
          if (booking.status === 'cancelled') {
            status = 'Cancelled';
          } else if (nowTime >= startTime && nowTime <= endTime) {
            status = 'Active';
            console.log('🟢 [MY_SPOTS_STATUS] Setting as Active - current time is between start and end');
          } else if (nowTime > endTime && (booking.status === 'confirmed' || booking.status === 'active')) {
            // Booking is past end time but still not checked out - keep as Active until 3-hour limit or manual checkout
            status = 'Active';
            console.log('🟡 [MY_SPOTS_STATUS] Setting as Active - past end time but within 3-hour grace period');
          } else if (nowTime < startTime) {
            status = 'Upcoming';
            console.log('🟡 [MY_SPOTS_STATUS] Setting as Upcoming - current time is before start time');
          } else {
            status = 'Completed';
            console.log('🔴 [MY_SPOTS_STATUS] Setting as Completed - fallback status');
          }
          
          return {
            id: booking.id,
            renterId: booking.renter_id,
            spotTitle: booking.parking_spots?.title || 'Unknown Spot',
            customer: 'Guest User', // We'll fetch user details separately if needed
            email: 'Not provided',
            phone: 'Not provided',
            date: booking.display_date || (() => {
              // Use the raw date components without timezone conversion
              const year = startDate.getFullYear();
              const month = String(startDate.getMonth() + 1).padStart(2, '0');
              const day = String(startDate.getDate()).padStart(2, '0');
              return `${month}/${day}/${year}`;
            })(),
            startTime: booking.display_start_time || startDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: 'America/Chicago'
            }),
            endTime: booking.display_end_time || endDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: 'America/Chicago'
            }),
            duration: `${duration} hour${duration !== 1 ? 's' : ''}`,
            pricePerHour: booking.parking_spots?.pricing_type === 'hourly' 
              ? Number(booking.parking_spots.price_per_hour) : 0,
            dailyPrice: booking.parking_spots?.pricing_type === 'daily' 
              ? Number(booking.parking_spots.daily_price) : 0,
            monthlyPrice: booking.parking_spots?.pricing_type === 'monthly' 
              ? Number(booking.parking_spots.monthly_price) : 0,
            oneTimePrice: booking.parking_spots?.pricing_type === 'one_time'
              ? Number(booking.parking_spots.one_time_price) : 0,
            totalEarnings: Number(booking.total_amount) || 0,
            status,
            originalBooking: booking
          };
        } catch (error) {
          console.error('Error processing booking:', booking.id, error);
          return null; // Skip this booking if there's an error
        }
      }).filter(booking => booking !== null) || [];

      setUpcomingReservations(processedReservations);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteSpot = async (spotId: string, spotTitle: string) => {
    try {
      const { error } = await supabase
        .from('parking_spots')
        .delete()
        .eq('id', spotId)
        .eq('owner_id', user?.id);

      if (error) {
        console.error('Error deleting spot:', error);
        toast.error("Failed to delete parking spot");
        return;
      }

      toast.success(`"${spotTitle}" has been deleted successfully`);
      fetchUserSpots(); // Refresh the list
    } catch (error) {
      console.error('Error:', error);
      toast.error("An unexpected error occurred");
    }
  };

  const filteredSpots = parkingSpots.filter(spot =>
    spot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spot.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReservations = upcomingReservations.filter(reservation => {
    const matchesSearch = reservation.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.spotTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterOptions.status?.length && !filterOptions.status.includes(reservation.status)) {
      return false;
    }
    
    return matchesSearch;
  });

  const totalEarnings = parkingSpots.reduce((sum, spot) => sum + spot.monthlyEarnings, 0);
  const lastMonthTotalEarnings = parkingSpots.reduce((sum, spot) => sum + (spot.lastMonthEarnings || 0), 0);
  const earningsChange = lastMonthTotalEarnings > 0 
    ? ((totalEarnings - lastMonthTotalEarnings) / lastMonthTotalEarnings * 100).toFixed(0)
    : totalEarnings > 0 ? '100' : '0';
  const earningsChangeText = lastMonthTotalEarnings === 0 && totalEarnings > 0 
    ? 'First month earnings!' 
    : lastMonthTotalEarnings === 0 && totalEarnings === 0
    ? 'No earnings yet'
    : `${Math.abs(Number(earningsChange))}% ${Number(earningsChange) >= 0 ? 'up' : 'down'} from last month`;
    
  const totalBookings = parkingSpots.reduce((sum, spot) => sum + spot.totalBookings, 0);
  const activeSpots = parkingSpots.filter(spot => spot.status === "Active").length;
  const totalReviews = parkingSpots.reduce((sum, spot) => sum + spot.totalReviews, 0);
  const averageRating = totalReviews > 0 
    ? (parkingSpots.reduce((sum, spot) => sum + (spot.rating * spot.totalReviews), 0) / totalReviews).toFixed(1)
    : "0.0";

  const getReservationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your parking spots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-4">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
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
                  <Calendar className="w-4 h-4 mr-2" />
                  Bookings
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Link to="/list-spot">
                <Button size="sm" className="bg-primary hover:bg-secondary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  List New Spot
                </Button>
              </Link>
              <Link to="/help-support">
                <Button variant="outline" size="sm">Help</Button>
              </Link>
              {user ? (
                <Button size="sm" onClick={() => navigate('/auth')}>Sign Out</Button>
              ) : (
                <Link to="/auth">
                  <Button size="sm">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Manage Your Parking Spots</h1>
          <p className="text-xl text-gray-600">
            Track earnings, manage availability, and monitor bookings for all your listed spots.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Monthly Earnings</CardDescription>
              <CardTitle className="text-2xl text-primary">${totalEarnings.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{earningsChangeText}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Spots</CardDescription>
              <CardTitle className="text-2xl text-primary">{activeSpots}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Out of {parkingSpots.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Bookings</CardDescription>
              <CardTitle className="text-2xl text-primary">{totalBookings}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Rating</CardDescription>
              <CardTitle className="text-2xl text-primary">{averageRating}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        </div>

        {/* QR Codes Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Codes for Your Spots
            </CardTitle>
            <CardDescription>
              Generate QR codes for each parking spot to enable instant rentals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parkingSpots.length === 0 ? (
              <div className="text-center py-8">
                <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No parking spots listed yet</p>
                <Link to="/list-spot">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    List Your First Spot
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {parkingSpots.map((spot) => (
                  <Card key={spot.id} className="border-2 hover:border-primary/20 transition-colors">
                    <CardHeader className="pb-3">
                     <CardTitle className="text-lg">{spot.title}</CardTitle>
                      <CardDescription className="text-sm">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {spot.address}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={spot.status === "Active" ? "default" : "secondary"}
                          >
                            {spot.status}
                          </Badge>
                          {isPremium && <PremiumBadge size="sm" />}
                        </div>
                          <p className="text-sm text-gray-600">
                            ${spot.price}{spot.pricingType === 'hourly' ? '/hr' : 
                                         spot.pricingType === 'daily' ? '/day' : 
                                         spot.pricingType === 'monthly' ? '/month' : ' flat'} • {spot.totalSpots} spot{spot.totalSpots !== 1 ? 's' : ''}
                          </p>
                          {spot.rating > 0 ? (
                            <div className="flex items-center mt-2">
                              <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
                              <span className="text-sm font-medium">{spot.rating}</span>
                              <span className="text-xs text-gray-500 ml-1">({spot.totalReviews || 0} reviews)</span>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 mt-2">No rating yet</div>
                          )}
                      </div>
                      <Button
                        onClick={() => setSelectedSpotForQR(selectedSpotForQR === spot.id ? null : spot.id)}
                        variant={selectedSpotForQR === spot.id ? "default" : "outline"}
                        className="w-full"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        {selectedSpotForQR === spot.id ? "Hide QR Code" : "Generate QR Code"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* QR Code Display */}
            {selectedSpotForQR && (
              <div className="mt-8 pt-8 border-t">
                {(() => {
                  const selectedSpot = parkingSpots.find(spot => spot.id === selectedSpotForQR);
                  return selectedSpot ? (
                    <QRCodeGenerator
                      spotId={selectedSpot.id}
                      spotTitle={selectedSpot.title}
                      spotAddress={selectedSpot.address}
                    />
                  ) : null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Reservations Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upcoming Reservations</CardTitle>
            <CardDescription>
              Recent bookings for your parking spots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reservation ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Parking Spot</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">{reservation.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center font-medium">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          {reservation.customer}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {reservation.email}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {reservation.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        {reservation.spotTitle}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {reservation.date}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-3 h-3 mr-1" />
                          {reservation.startTime} - {reservation.endTime}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{reservation.duration}</TableCell>
                    <TableCell>
                      <div className="flex items-center font-medium text-green-600">
                        <DollarSign className="w-4 h-4" />
                        {reservation.totalEarnings}
                      </div>
                       <div className="text-sm text-gray-600">
                         {reservation.pricePerHour > 0 ? `$${reservation.pricePerHour}/hr` : 
                          reservation.dailyPrice > 0 ? `$${reservation.dailyPrice}/day` :
                          reservation.monthlyPrice > 0 ? `$${reservation.monthlyPrice}/month` :
                          reservation.oneTimePrice > 0 ? `$${reservation.oneTimePrice} flat` : 'N/A'}
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getReservationStatusColor(reservation.status)}>
                        {reservation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedBooking(reservation)}
                        >
                          View
                        </Button>
                        <ContactButtons
                          bookingId={reservation.id}
                          recipientId={reservation.renterId}
                          recipientName={reservation.renterName || reservation.email}
                          showCallButton={true}
                          showChatButton={true}
                          unreadCount={getUnreadCount(reservation.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by spot title or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline"
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Spots Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Parking Spots</CardTitle>
            <CardDescription>
              Manage and track performance of all your listed spots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spot Details</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Monthly Earnings</TableHead>
                  <TableHead>Last Booked</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSpots.map((spot) => (
                  <TableRow key={spot.id}>
                     <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{spot.title}</p>
                          {isPremium && <PremiumBadge size="sm" />}
                        </div>
                        <p className="text-sm text-gray-600 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {spot.address}
                        </p>
                        <p className="text-xs text-gray-500">{spot.availability}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Car className="w-4 h-4 mr-2 text-gray-400" />
                        {spot.type}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="mr-2">{spot.price}</span>
                         <Badge variant="outline" className="text-xs">
                           {spot.pricingType === 'hourly' ? 'Hourly' : 
                            spot.pricingType === 'daily' ? 'Daily' : 
                            spot.pricingType === 'monthly' ? 'Monthly' :
                            'Once'}
                         </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        spot.status === "Active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {spot.status}
                      </span>
                    </TableCell>
                    <TableCell>{spot.totalBookings}</TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">${spot.monthlyEarnings}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-3 h-3 mr-1" />
                        {spot.lastBooked}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link to={`/spot/${spot.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/list-spot?edit=${spot.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedSpotForQR(selectedSpotForQR === spot.id ? null : spot.id)}
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Parking Spot</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{spot.title}"? This action cannot be undone and will remove all associated data including bookings and reviews.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteSpot(spot.id, spot.title)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                 ))}
               </TableBody>
             </Table>
           </CardContent>
         </Card>

         {/* QR Code Display */}
         {selectedSpotForQR && (
           <div className="mt-6">
             {(() => {
               const selectedSpot = parkingSpots.find(spot => spot.id === selectedSpotForQR);
                return selectedSpot ? (
                  <QRCodeGenerator 
                    spotId={selectedSpot.id.toString()} 
                    spotTitle={selectedSpot.title}
                    spotAddress={selectedSpot.address}
                  />
                ) : null;
             })()}
           </div>
         )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        </div>
        
        {/* Payout Setup Section */}
        <div className="mt-8">
          <StripeConnectOnboarding />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="w-5 h-5 mr-2 text-green-600" />
                Ready to List Another Spot?
              </CardTitle>
              <CardDescription>
                Add more parking spaces to increase your earning potential
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <Link to="/list-spot">
                <Button className="w-full bg-primary hover:bg-secondary text-primary-foreground">
                  List New Parking Spot
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="w-5 h-5 mr-2 text-amber-600" />
                Premium Lister
              </CardTitle>
              <CardDescription>
                {isPremium 
                  ? "You're a premium lister! Your spots have priority placement."
                  : "Stand out with a premium badge and get priority placement for just $5/month"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              {isPremium ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <PremiumBadge />
                    <span className="text-sm text-green-600 font-medium">Active</span>
                  </div>
                  {subscription && (
                    <p className="text-sm text-gray-600">
                      Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.functions.invoke('premium-portal');
                        if (error) throw error;
                        if (data?.url) {
                          window.open(data.url, '_blank');
                        }
                      } catch (error: any) {
                        toast.error(error.message || 'Failed to open billing portal');
                      }
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <PremiumSubscriptionDialog>
                  <Button className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                </PremiumSubscriptionDialog>
              )}
            </CardContent>
          </Card>

        </div>
        
        <BookingDetailsDialog 
          booking={selectedBooking}
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
        
        <FilterDialog
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApplyFilters={setFilterOptions}
          currentFilters={filterOptions}
        />
      </div>
    </div>
  );
};

export default ManageSpots;
