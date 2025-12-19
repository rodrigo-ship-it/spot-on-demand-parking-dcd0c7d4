import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, Search, Filter, Download, ArrowLeft, MapPin, Navigation, Phone, Mail, Star, Camera } from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReviewDialog } from "@/components/ReviewDialog";
import { TimeManagement } from "@/components/TimeManagement";
import { NotificationSystem } from "@/components/NotificationSystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AdvancedFiltersDialog } from "@/components/AdvancedFiltersDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RefundRequestDialog from "@/components/RefundRequestDialog";
import { CancellationPolicyDialog } from "@/components/CancellationPolicyDialog";
import { ContactButtons } from "@/components/ContactButtons";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const Bookings = () => {
  const { user } = useAuth();
  const { getUnreadCount } = useUnreadMessages();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingReviews, setExistingReviews] = useState<Set<string>>(new Set());
  const [reviewDialog, setReviewDialog] = useState<{
    isOpen: boolean;
    type: "rating" | "dispute";
    bookingId: string;
    disputeType?: "overstay" | "occupied";
  }>({
    isOpen: false,
    type: "rating",
    bookingId: "",
  });

  const [timeManagementDialog, setTimeManagementDialog] = useState<{
    isOpen: boolean;
    bookingId: string;
  }>({
    isOpen: false,
    bookingId: "",
  });

  const [refundDialog, setRefundDialog] = useState<{
    isOpen: boolean;
    booking: any;
  }>({
    isOpen: false,
    booking: null,
  });

  const [cancellationDialog, setCancellationDialog] = useState<{
    isOpen: boolean;
    booking: any;
  }>({
    isOpen: false,
    booking: null,
  });

  // Load user bookings function
  const loadBookings = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            parking_spots!inner (
              id,
              title,
              address,
              price_per_hour,
              daily_price,
              monthly_price,
              pricing_type,
              owner_id,
              timezone
            )
          `)
          .eq('renter_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Transform data to match UI expectations
        const transformedBookings = await Promise.all(data?.map(async booking => {
          try {
            // Get the spot's timezone - default to user's timezone if not set
            const spotTimezone = booking.spot_timezone || booking.parking_spots?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            // Get current time in the SPOT's timezone (same pattern as BookSpot.tsx)
            const now = new Date();
            const spotNow = new Date(now.toLocaleString('en-US', { timeZone: spotTimezone }));
            
            // Parse the stored times as local times in the spot's timezone
            // The database stores times like "2024-01-15 09:00:00" without timezone info
            // These represent the LOCAL time at the spot
            const startTimeStr = booking.start_time;
            const endTimeStr = booking.end_time;
            
            // Parse the date/time strings - they're stored as local times
            const startDate = new Date(startTimeStr);
            const endDate = new Date(endTimeStr);
            
            console.log('📅 [TIMEZONE_STATUS_DEBUG]', {
              id: booking.id.substring(0, 8),
              spotTimezone,
              spotNowLocal: spotNow.toLocaleString(),
              start_time_raw: startTimeStr,
              end_time_raw: endTimeStr,
              startDate: startDate.toLocaleString(),
              endDate: endDate.toLocaleString()
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
              return null;
            }
            
            const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
            const isMonthly = booking.parking_spots?.pricing_type === 'monthly';
            
            // Determine status based on spot's local time
            let status = 'Upcoming';
            
            // Use the spot's current time for comparison
            const spotNowTime = spotNow.getTime();
            const startTime = startDate.getTime();
            const endTime = endDate.getTime();
            
            console.log('🕐 [SPOT_TIMEZONE_STATUS]', {
              bookingId: booking.id.substring(0, 8),
              spotTimezone,
              spotNow: spotNow.toLocaleString(),
              startDate: startDate.toLocaleString(),
              endDate: endDate.toLocaleString(),
              spotNowTime,
              startTime,
              endTime,
              dbStatus: booking.status
            });
            
            // Determine status with spot's timezone
            if (booking.status === 'cancelled') {
              status = 'Cancelled';
              console.log('❌ [STATUS] Setting as Cancelled - booking was cancelled');
            } else if (booking.status === 'completed') {
              status = 'Completed';
              console.log('✅ [STATUS] Setting as Completed - database shows completed');
            } else if (spotNowTime >= startTime && spotNowTime <= endTime) {
              status = 'Active';
              console.log('🟢 [STATUS] Setting as Active - spot\'s current time is between start and end');
            } else if (spotNowTime < startTime) {
              status = 'Upcoming';
              console.log('🟡 [STATUS] Setting as Upcoming - spot\'s current time is before start time');
            } else if (spotNowTime > endTime) {
              // Past end time but not marked completed - check grace period
              const gracePeriodHours = 3;
              const gracePeriodEndTime = endTime + (gracePeriodHours * 60 * 60 * 1000);
              
              if (spotNowTime <= gracePeriodEndTime) {
                status = 'Active';
                console.log('🟡 [STATUS] Setting as Active - past end time but within 3-hour grace period (spot timezone)');
              } else {
                status = 'Completed';
                console.log('🔴 [STATUS] Setting as Completed - past grace period in spot timezone');
              }
            } else {
              status = 'Completed';
              console.log('🔴 [STATUS] Setting as Completed - fallback status');
            }

            // Get owner profile using secure function
            let ownerName = 'Unknown Owner';
            let ownerPhone = 'No phone';
            let ownerId = null;
            if (booking.parking_spots?.owner_id) {
              ownerId = booking.parking_spots.owner_id;
              try {
                const { data: ownerData, error: ownerError } = await supabase.rpc('get_booking_owner_info', {
                  booking_id_param: booking.id
                });
                
                if (!ownerError && ownerData && ownerData.length > 0) {
                  const owner = ownerData[0];
                  ownerName = owner.owner_name || 'Unknown Owner';
                  ownerPhone = owner.owner_phone || 'No phone';
                  ownerId = owner.owner_id;
                }
              } catch (err) {
                console.warn('Could not fetch owner info for booking:', booking.id, err);
              }
            }

            return {
              id: booking.id,
              spotId: booking.spot_id,
              spotTitle: booking.parking_spots?.title || 'Unknown Spot',
              spotAddress: booking.parking_spots?.address || 'Unknown Address',
              spotOwner: ownerName,
              ownerName: ownerName,
              ownerId: ownerId,
              ownerPhone: ownerPhone,
              date: booking.display_date || startDate.toLocaleDateString('en-US', { 
                month: '2-digit', 
                day: '2-digit', 
                year: 'numeric' 
              }),
              startTime: isMonthly ? null : (booking.display_start_time || startDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
              })),
              endTime: isMonthly ? null : (booking.display_end_time || endDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
              })),
              startDate: isMonthly ? startDate.toLocaleDateString('en-US') : null,
              endDate: isMonthly ? endDate.toLocaleDateString('en-US') : null,
              duration: isMonthly 
                ? (booking.display_duration_text || "1 month") // Use stored duration for monthly
                : `${duration} hours`,
              isMonthly: isMonthly,
              pricePerHour: booking.parking_spots?.price_per_hour || 0,
              totalCost: Number(booking.total_amount) || 0,
              status,
              paymentStatus: booking.status === 'pending' ? 'Pending' : 'Paid',
              // Include full booking data for dialogs
              fullBookingData: booking
            };
          } catch (error) {
            console.error('Error processing booking:', booking.id, error);
            return null; // Skip this booking if there's an error
          }
        }) || []);

        // Filter out null entries (invalid bookings)
        const validBookings = transformedBookings.filter(booking => booking !== null);

        setBookings(validBookings);

        // Load existing reviews for completed bookings
        const completedBookingIds = validBookings
          .filter(booking => booking.status === "Completed")
          .map(booking => booking.id);

        if (completedBookingIds.length > 0) {
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('booking_id')
            .eq('reviewer_id', user.id)
            .in('booking_id', completedBookingIds);

          const reviewedBookingIds = new Set(reviewsData?.map(review => review.booking_id) || []);
          setExistingReviews(reviewedBookingIds);
        }
      } catch (error) {
        console.error('Error loading bookings:', error);
        toast.error('Failed to load bookings. Please try again.');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

  // Load bookings on mount
  useEffect(() => {
    loadBookings();
  }, [user, navigate]);

  // Mock user violations data
  const userViolations = [
    {
      id: "V001",
      type: "late_checkout",
      date: "2024-05-25",
      penalty: 25,
      description: "Late check-out (45 minutes over)"
    }
  ];

  const filteredReservations = bookings.filter(reservation => {
    const matchesSearch = reservation.spotTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.spotAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || reservation.status.toLowerCase() === statusFilter.toLowerCase();
    
    // Advanced filters
    if (advancedFilters.dateRange) {
      const reservationDate = new Date(reservation.date);
      if (advancedFilters.dateRange.from && reservationDate < advancedFilters.dateRange.from) return false;
      if (advancedFilters.dateRange.to && reservationDate > advancedFilters.dateRange.to) return false;
    }
    
    if (advancedFilters.pricePerHour) {
      const hourlyRate = reservation.pricePerHour || 0;
      if (advancedFilters.pricePerHour.min && hourlyRate < advancedFilters.pricePerHour.min) return false;
      if (advancedFilters.pricePerHour.max && hourlyRate > advancedFilters.pricePerHour.max) return false;
    }
    
    if (advancedFilters.totalPrice) {
      if (advancedFilters.totalPrice.min && reservation.totalCost < advancedFilters.totalPrice.min) return false;
      if (advancedFilters.totalPrice.max && reservation.totalCost > advancedFilters.totalPrice.max) return false;
    }
    
    if (advancedFilters.location && !reservation.spotAddress.toLowerCase().includes(advancedFilters.location.toLowerCase())) {
      return false;
    }
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed": return "bg-green-100 text-green-800";
      case "active": return "bg-blue-100 text-blue-800";
      case "upcoming": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const completedReservations = filteredReservations.filter(r => r.status === "Completed").length;
  const upcomingReservations = filteredReservations.filter(r => r.status === "Upcoming").length;

  const handleLeaveReview = (bookingId: string) => {
    setReviewDialog({
      isOpen: true,
      type: "rating",
      bookingId,
    });
  };

  const handleReportIssue = (bookingId: string, disputeType: "overstay" | "occupied") => {
    setReviewDialog({
      isOpen: true,
      type: "dispute",
      bookingId,
      disputeType,
    });
  };

  const handleManageTime = (bookingId: string) => {
    setTimeManagementDialog({
      isOpen: true,
      bookingId,
    });
  };

  const handleSubmitRating = (rating: number, comment: string, photo?: string) => {
    console.log("Rating submitted:", { rating, comment, photo });
    // Refresh bookings data to show updated status
    loadBookings();
    // Close the review dialog
    closeReviewDialog();
  };

  const handlePhotoTaken = (photo: string, disputeType: string) => {
    console.log("Dispute photo taken:", { photo, disputeType });
  };

  const closeReviewDialog = () => {
    setReviewDialog(prev => ({ ...prev, isOpen: false }));
  };

  const closeTimeManagementDialog = () => {
    setTimeManagementDialog(prev => ({ ...prev, isOpen: false }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
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
              <Link to="/help-support">
                <Button size="sm">Help</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">My Parking Reservations</h1>
          <p className="text-xl text-gray-600">
            View and manage all your parking reservations in one place.
          </p>
        </div>

        {/* Notifications */}
        <div className="mb-8">
          <NotificationSystem bookings={bookings} />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reservations</CardDescription>
              <CardTitle className="text-2xl text-gray-900">{filteredReservations.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl text-gray-900">{completedReservations}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Finished reservations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Upcoming</CardDescription>
              <CardTitle className="text-2xl text-gray-900">{upcomingReservations}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Future reservations</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by spot name, address, or reservation ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <AdvancedFiltersDialog 
            onFiltersApply={setAdvancedFilters} 
            currentFilters={advancedFilters}
          >
            <Button 
              variant="outline"
            >
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </AdvancedFiltersDialog>
        </div>

        {/* Reservations Table */}
        <Card>
          <CardHeader>
            <CardTitle>My Reservations</CardTitle>
            <CardDescription>
              All your parking spot reservations and their details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actions</TableHead>
                  <TableHead>Reservation ID</TableHead>
                  <TableHead>Parking Spot</TableHead>
                  <TableHead>Spot Owner</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(reservation.spotAddress)}`, '_blank')}
                          >
                            <Navigation className="w-3 h-3 mr-1" />
                            Directions
                          </Button>
                          {user && (
                            <ContactButtons
                              bookingId={reservation.id}
                              recipientId={reservation.ownerId}
                              recipientName={reservation.ownerName}
                              showCallButton={true}
                              showChatButton={true}
                              unreadCount={getUnreadCount(reservation.id)}
                            />
                          )}
                        </div>
                        {reservation.status === "Active" && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleManageTime(reservation.id)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                Manage Time
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Time Management - {reservation.id}</DialogTitle>
                              </DialogHeader>
                              <TimeManagement
                                bookingId={reservation.id}
                                spotId={reservation.spotId || ""}
                                endTime={(() => {
                                  try {
                                    // Safely construct the end time
                                    if (!reservation.date || !reservation.endTime) {
                                      console.error("Missing date/endTime for reservation:", reservation.id);
                                      return new Date().toISOString();
                                    }
                                    const endDate = new Date(`${reservation.date}T${reservation.endTime}`);
                                    if (isNaN(endDate.getTime())) {
                                      console.error("Invalid date format:", reservation.date, reservation.endTime);
                                      return new Date().toISOString();
                                    }
                                    return endDate.toISOString();
                                  } catch (error) {
                                    console.error("Error constructing endTime:", error);
                                    return new Date().toISOString();
                                  }
                                })()}
                                pricePerHour={reservation.pricePerHour}
                                userViolations={userViolations}
                                accountStatus="good"
                                isActive={reservation.status === "Active"}
                              />
                            </DialogContent>
                          </Dialog>
                        )}
                        {reservation.status === "Completed" && (
                          existingReviews.has(reservation.id) ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled
                              className="text-gray-500"
                            >
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Reviewed
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleLeaveReview(reservation.id)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Star className="w-3 h-3 mr-1" />
                              Leave Review
                            </Button>
                          )
                        )}
                        {reservation.status === "Active" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReportIssue(reservation.id, "occupied")}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Camera className="w-3 h-3 mr-1" />
                            Report Issue
                          </Button>
                        )}
                        {(reservation.status === "Upcoming") && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setCancellationDialog({
                              isOpen: true,
                              booking: reservation.fullBookingData || {
                                id: reservation.id,
                                start_time: `${reservation.date} ${reservation.startTime}`,
                                total_amount: reservation.totalCost,
                                payment_intent_id: null, // fallback if fullBookingData is missing
                                parking_spots: {
                                  title: reservation.spotTitle
                                }
                              }
                            })}
                            className="text-red-600 hover:text-red-700"
                          >
                            Cancel Booking
                          </Button>
                        )}
                        {(reservation.status === "Completed" || reservation.status === "Active") && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setRefundDialog({
                              isOpen: true,
                              booking: {
                                id: reservation.id,
                                total_amount: reservation.totalCost,
                                spot_id: reservation.spotId
                              }
                            })}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            Request Refund
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{reservation.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reservation.spotTitle}</div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {reservation.spotAddress}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reservation.spotOwner}</div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {reservation.ownerPhone}
                        </div>
                      </div>
                    </TableCell>
                     <TableCell>
                       <div>
                         <div className="flex items-center">
                           <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                           {reservation.isMonthly ? (
                             <>
                               <span>{reservation.startDate} - {reservation.endDate}</span>
                             </>
                           ) : (
                             <span>{reservation.date}</span>
                           )}
                         </div>
                         {!reservation.isMonthly && (
                           <div className="flex items-center text-sm text-gray-600">
                             <Clock className="w-3 h-3 mr-1" />
                             {reservation.startTime} - {reservation.endTime}
                           </div>
                         )}
                       </div>
                     </TableCell>
                    <TableCell>{reservation.duration}</TableCell>
                    <TableCell>
                      <div className="flex items-center font-medium text-blue-600">
                        <DollarSign className="w-4 h-4" />
                        {reservation.totalCost}
                      </div>
                       <div className="text-sm text-gray-600">
                         {reservation.isMonthly ? 'Monthly Rate' : `$${reservation.pricePerHour}/hr`}
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(reservation.status)}>
                        {reservation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(reservation.paymentStatus)}>
                        {reservation.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ReviewDialog
        isOpen={reviewDialog.isOpen}
        onClose={closeReviewDialog}
        type={reviewDialog.type}
        bookingId={reviewDialog.bookingId}
        userType="renter"
        disputeType={reviewDialog.disputeType}
        onSubmitRating={handleSubmitRating}
        onPhotoTaken={handlePhotoTaken}
      />

      <RefundRequestDialog
        isOpen={refundDialog.isOpen}
        onClose={() => setRefundDialog({ isOpen: false, booking: null })}
        booking={refundDialog.booking}
      />

      <CancellationPolicyDialog
        isOpen={cancellationDialog.isOpen}
        onClose={() => setCancellationDialog({ isOpen: false, booking: null })}
        booking={cancellationDialog.booking}
        onCancellationSuccess={() => {
          // Close the dialog and refresh bookings data
          setCancellationDialog({ isOpen: false, booking: null });
          // Refresh the bookings data without full page reload
          loadBookings();
        }}
      />
    </div>
  );
};

export default Bookings;
