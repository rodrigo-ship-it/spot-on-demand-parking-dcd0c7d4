import { useState, useEffect } from "react";
import { ContactButtons } from "@/components/ContactButtons";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Star, Clock, Shield, Car, Calendar, DollarSign, User, Phone, Mail, MessageSquare, Flag, Camera, Timer, CheckCircle, XCircle, AlertCircle, Eye, Edit, MoreHorizontal, TrendingUp, BarChart3, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RatingSystem } from "@/components/RatingSystem";
import { ReviewDialog } from "@/components/ReviewDialog";
import { DisputeCamera } from "@/components/DisputeCamera";
import { SpotReportDialog } from "@/components/SpotReportDialog";
import { CheckOutSystem } from "@/components/CheckOutSystem";
import { ExtensionSystem } from "@/components/ExtensionSystem";
import { PenaltySystem } from "@/components/PenaltySystem";
import { TimeManagement } from "@/components/TimeManagement";
import { AvailabilityDisplay } from "@/components/AvailabilityDisplay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SpotDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const action = searchParams.get("action");
  const isBookingMode = action === "book";
  const isOwnerView = action === "manage";
  const isQRCodeScan = searchParams.get("qr") === "true";

  const [spotData, setSpotData] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fetch spot data from database with real-time updates
  useEffect(() => {
    const fetchSpotData = async () => {
      if (!id) {
        setError("No spot ID provided");
        setLoading(false);
        return;
      }

      try {
        // Load parking spot data - first get the spot, then the owner info separately
        const { data: spot, error: spotError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (spotError) {
          console.error('SpotDetails - Error loading spot:', spotError);
          toast.error("Failed to load parking spot");
          navigate('/');
          return;
        }

        if (!spot) {
          console.error('SpotDetails - No spot found with ID:', id);
          setError("Parking spot not found");
          setLoading(false);
          return;
        }

        // Now get the owner profile
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', spot.owner_id)
          .single();

        // Combine the data
        const spotWithOwner = {
          ...spot,
          profiles: ownerProfile
        };

        setSpotData(spotWithOwner);
        
        // Fetch reviews for this spot - get all bookings for this spot and their reviews
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id')
          .eq('spot_id', id);

        if (!bookingsError && bookingsData && bookingsData.length > 0) {
          const bookingIds = bookingsData.map(booking => booking.id);
          
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select(`
              *,
              profiles!reviews_reviewer_id_fkey(full_name)
            `)
            .in('booking_id', bookingIds)
            .order('created_at', { ascending: false });

          if (!reviewsError && reviewsData) {
            setReviews(reviewsData);
          }
        }
      } catch (err: any) {
        console.error('Error fetching spot data:', err);
        setError(err.message || "Failed to load spot data");
        toast.error("Failed to load parking spot details");
      } finally {
        setLoading(false);
      }
    };

    fetchSpotData();

    // Set up real-time subscription for this specific spot
    const channel = supabase
      .channel(`spot_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parking_spots',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Real-time spot update:', payload);
          setSpotData(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Mock booking data for active session
  const [mockBookingData] = useState({
    bookingId: "booking-123",
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    userViolations: [
      {
        id: "v1",
        type: "late_checkout" as const,
        date: "2024-06-10",
        penalty: 25,
        description: "Late check-out (30 minutes over)"
      }
    ],
    accountStatus: "good" as const,
    isActiveSession: false
  });

  const [reviewDialog, setReviewDialog] = useState({ isOpen: false, type: null });

  // Dispute Camera
  const [isDisputeCameraOpen, setIsDisputeCameraOpen] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Check Out System
  const [isCheckOutSystemOpen, setIsCheckOutSystemOpen] = useState(false);

  // Extension System
  const [isExtensionSystemOpen, setIsExtensionSystemOpen] = useState(false);

  // Penalty System
  const [isPenaltySystemOpen, setIsPenaltySystemOpen] = useState(false);

  // Time Management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:00"); // Will be updated based on pricing type

  // Handle continue to book button click
  const handleContinueToBook = () => {
    if (!spotData) return;
    
    // Navigate to new single-page booking flow
    navigate('/book-spot/' + id, { 
      state: { 
        spotData: {
          id: id,
          title: spotData.title,
          price: spotData.pricing_type === 'hourly' 
            ? Number(spotData.price_per_hour)
            : spotData.pricing_type === 'daily'
            ? Number(spotData.daily_price)
            : Number(spotData.one_time_price),
          address: spotData.address,
          type: spotData.spot_type,
          features: spotData.amenities || [],
          description: spotData.description
        }
      }
    });
  };

  // Handle pause/activate listing
  const handlePauseListing = async () => {
    if (!spotData || !id) return;
    
    const newActiveStatus = !spotData.is_active;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('parking_spots')
        .update({ is_active: newActiveStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setSpotData({ ...spotData, is_active: newActiveStatus });
      
      toast.success(
        newActiveStatus 
          ? 'Listing activated successfully!' 
          : 'Listing paused successfully!'
      );
    } catch (error: any) {
      console.error('Error updating listing status:', error);
      toast.error(error.message || 'Failed to update listing status');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading spot details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !spotData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Spot Not Found</h1>
          <p className="text-gray-600 mb-4">{error || "The parking spot you're looking for doesn't exist."}</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b">
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
              {!isBookingMode && (
                <>
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
                </>
              )}
              <Link to="/help-support">
                <Button variant="outline" size="sm">Help</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* QR Code Booking Banner */}
        {isQRCodeScan && (
          <Card className="mb-6 border-primary bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-primary mr-3" />
                  <div>
                    <h3 className="font-semibold text-primary">Quick Rental Available!</h3>
                    <p className="text-sm text-gray-600">Book this parking spot instantly - no account required</p>
                  </div>
                </div>
                <Button onClick={handleContinueToBook} size="lg" className="ml-4">
                  Book Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Spot Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl mb-2">{spotData.title}</CardTitle>
                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mr-2" />
                      {spotData.address}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="font-medium">{spotData.rating || 0}</span>
                        <span className="text-gray-600 ml-1">({spotData.total_reviews || 0} reviews)</span>
                      </div>
                      <Badge variant="secondary" className="flex items-center">
                        <Car className="w-3 h-3 mr-1" />
                        {spotData.spot_type}
                      </Badge>
                      <Badge variant={spotData.is_active ? "default" : "secondary"}>
                        {spotData.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {isOwnerView && (
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{spotData.description || "No description available."}</p>
                
                {/* Features */}
                {spotData.amenities && spotData.amenities.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {spotData.amenities.map((amenity: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Availability */}
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Availability</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Available Spots:</span>
                      <span className="font-medium">{spotData.available_spots}/{spotData.total_spots}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image Gallery */}
            {spotData.images && spotData.images.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={spotData.images[currentImageIndex]}
                      alt={`${spotData.title} - Image ${currentImageIndex + 1}`}
                      className="w-full h-96 object-cover rounded-t-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                    
                    {/* Navigation buttons */}
                    {spotData.images.length > 1 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                          onClick={() => setCurrentImageIndex(
                            currentImageIndex === 0 ? spotData.images.length - 1 : currentImageIndex - 1
                          )}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                          onClick={() => setCurrentImageIndex(
                            currentImageIndex === spotData.images.length - 1 ? 0 : currentImageIndex + 1
                          )}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    
                    {/* Image counter */}
                    <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                      {currentImageIndex + 1} / {spotData.images.length}
                    </div>
                  </div>
                  
                  {/* Thumbnail strip */}
                  {spotData.images.length > 1 && (
                    <div className="p-4 border-t">
                      <div className="flex gap-2 overflow-x-auto">
                        {spotData.images.map((image: string, index: number) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                              currentImageIndex === index ? 'border-primary' : 'border-gray-200'
                            }`}
                          >
                            <img
                              src={image}
                              alt={`Thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.svg';
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Availability Display */}
            <AvailabilityDisplay 
              spotType={spotData.spot_type}
              spotId={spotData.id}
            />

            {/* Time Management (only for booking mode with active session) */}
            {isBookingMode && mockBookingData.isActiveSession && (
              <TimeManagement 
                bookingId={mockBookingData.bookingId}
                endTime={mockBookingData.endTime}
                pricePerHour={Number(spotData.price_per_hour)}
                userViolations={mockBookingData.userViolations}
                accountStatus={mockBookingData.accountStatus}
                isActive={mockBookingData.isActiveSession}
              />
            )}

            {/* Reviews Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Reviews ({reviews.length})</span>
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-400 mr-1" />
                    <span className="font-medium">
                      {reviews.length > 0 
                        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
                        : '0.0'
                      }
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviews.length > 0 ? (
                    reviews.map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                              {review.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-medium">{review.profiles?.full_name || 'Anonymous User'}</p>
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star} 
                                    className={`w-4 h-4 ${
                                      star <= review.rating 
                                        ? 'text-yellow-400 fill-current' 
                                        : 'text-gray-300'
                                    }`} 
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700">{review.comment}</p>
                        )}
                        {review.photo_url && (
                          <div className="mt-2">
                            <img 
                              src={review.photo_url} 
                              alt="Review photo" 
                              className="w-32 h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Star className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p>No reviews yet</p>
                      <p className="text-sm">Be the first to review this parking spot!</p>
                    </div>
                  )}
                </div>

                {isBookingMode && (
                  <div className="mt-4 pt-4 border-t">
                    <Button onClick={() => setReviewDialog({ isOpen: true, type: 'create' })} variant="outline" className="w-full">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Write a Review
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Bookings (only for owner view) */}
            {isOwnerView && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>
                    Recent activity for this parking spot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <div>
                              <p className="font-medium">John Smith</p>
                              <p className="text-sm text-gray-600">john@email.com</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>June 1, 2024</p>
                            <p className="text-sm text-gray-600">9:00 AM - 5:00 PM</p>
                          </div>
                        </TableCell>
                        <TableCell>8 hours</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">Completed</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">$64</span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <div>
                              <p className="font-medium">Emma Davis</p>
                              <p className="text-sm text-gray-600">emma@email.com</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>May 30, 2024</p>
                            <p className="text-sm text-gray-600">7:00 AM - 7:00 PM</p>
                          </div>
                        </TableCell>
                        <TableCell>12 hours</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">Completed</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">$96</span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Book Now Card - Always show for regular visitors */}
            {!isOwnerView && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Pricing & Booking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Base Price Display */}
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-gray-900">
                      ${spotData.pricing_type === 'hourly' 
                        ? Number(spotData.price_per_hour).toFixed(2)
                        : spotData.pricing_type === 'daily'
                        ? Number(spotData.daily_price).toFixed(2)
                        : Number(spotData.one_time_price).toFixed(2)
                      }
                    </div>
                    <div className="text-sm text-gray-600">
                      {spotData.pricing_type === 'hourly' ? 'per hour' : spotData.pricing_type === 'daily' ? 'per day' : 'one-time fee'}
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm mb-2">Estimated Total Cost*</h4>
                    {(() => {
                      const isPricingHourly = spotData.pricing_type === 'hourly';
                      const isPricingDaily = spotData.pricing_type === 'daily';
                      const basePrice = spotData.pricing_type === 'hourly' 
                        ? Number(spotData.price_per_hour) 
                        : spotData.pricing_type === 'daily'
                        ? Number(spotData.daily_price)
                        : Number(spotData.one_time_price);
                      const estimatedDuration = isPricingHourly ? 4 : isPricingDaily ? 2 : 1; // Estimate 4 hours for hourly, 2 days for daily
                      const subtotal = (isPricingHourly || isPricingDaily) ? basePrice * estimatedDuration : basePrice;
                      const platformFee = Math.round(subtotal * 0.07 * 100) / 100; // 7% platform fee
                      const renterTotal = subtotal + platformFee;
                      const tax = Math.round(renterTotal * 0.0875 * 100) / 100; // 8.75% tax
                      const total = renterTotal + tax;

                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Base price {isPricingHourly ? `(${estimatedDuration}h)` : isPricingDaily ? `(${estimatedDuration} days)` : ''}</span>
                            <span>${subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Platform fee</span>
                            <span>${platformFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tax</span>
                            <span>${tax.toFixed(2)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between text-sm font-semibold">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                          </div>
                          {isPricingHourly && (
                            <p className="text-xs text-gray-500 mt-2">
                              *Based on {estimatedDuration}-hour booking. Final price depends on actual duration.
                            </p>
                          )}
                          {isPricingDaily && (
                            <p className="text-xs text-gray-500 mt-2">
                              *Based on {estimatedDuration}-day booking. Final price depends on actual duration.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available:</span>
                    <span className="font-medium">{spotData.available_spots}/{spotData.total_spots} spots</span>
                  </div>
                  
                  <Button onClick={handleContinueToBook} className="w-full" size="lg">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Now
                  </Button>
                  
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <Shield className="w-4 h-4 mr-1" />
                    Secure payment & instant confirmation
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Card - Only in booking mode */}
            {isBookingMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div>
                      <div className="text-3xl font-bold text-gray-900">
                        ${spotData.pricing_type === 'hourly' 
                          ? Number(spotData.price_per_hour).toFixed(2)
                          : spotData.pricing_type === 'daily'
                          ? Number(spotData.daily_price).toFixed(2)
                          : Number(spotData.one_time_price).toFixed(2)
                        }
                      </div>
                      <div className="text-sm text-gray-600">
                        {spotData.pricing_type === 'hourly' ? 'per hour' : spotData.pricing_type === 'daily' ? 'per day' : 'one-time fee'}
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-3xl font-bold text-gray-900">{spotData.total_spots}</div>
                      <div className="text-sm text-gray-600">total spots</div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-3xl font-bold text-gray-900">{spotData.available_spots}</div>
                      <div className="text-sm text-gray-600">available now</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Spot Performance - Only for owner view */}
            {isOwnerView && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Spot Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly Earnings</span>
                    <span className="font-bold text-green-600">${spotData.monthlyEarnings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Bookings</span>
                    <span className="font-bold">{spotData.totalBookings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Rating</span>
                    <span className="font-bold">{spotData.rating}/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Occupancy Rate</span>
                    <span className="font-bold text-blue-600">78%</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Book Now Card - Only in booking mode */}
            {isBookingMode && (
              <Card>
                <CardHeader>
                  <CardTitle>Book This Spot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={handleContinueToBook} className="w-full" size="lg">
                    <Calendar className="w-4 h-4 mr-2" />
                    Continue to Book
                  </Button>
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <Shield className="w-4 h-4 mr-1" />
                    Secure payment & instant confirmation
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Owner Contact - Only in booking mode */}
            {isBookingMode && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact Owner</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-3 text-gray-400" />
                    <span>{spotData.profiles?.full_name || 'Property Owner'}</span>
                  </div>
                  {spotData.profiles?.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-3 text-gray-400" />
                      <span>{spotData.profiles.phone}</span>
                    </div>
                  )}
                  <ContactButtons
                    bookingId="guest-inquiry"
                    recipientId={spotData.owner_id}
                    recipientName={spotData.profiles?.full_name || 'Property Owner'}
                    showCallButton={true}
                    showChatButton={true}
                  />
                </CardContent>
              </Card>
            )}

            {/* Quick Actions - Only for owner view */}
            {isOwnerView && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/list-spot?edit=${spotData.id}`)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Spot Details
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      // Reload the page in customer view mode
                      window.location.href = `/spot/${spotData.id}`;
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View as Customer
                  </Button>
                  <Button 
                    variant={spotData.is_active ? "destructive" : "default"}
                    className="w-full"
                    onClick={handlePauseListing}
                    disabled={loading}
                  >
                    {spotData.is_active ? (
                      <Pause className="w-4 h-4 mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Updating...' : (spotData.is_active ? 'Pause Listing' : 'Activate Listing')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Report Card - Only in booking mode */}
            {isBookingMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Report an Issue</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowReportDialog(true)}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Report This Spot
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Only render these components when there's an active booking session */}
      {mockBookingData.isActiveSession && (
        <>
          <RatingSystem 
            bookingId={mockBookingData.bookingId}
            userType="renter"
            onSubmitRating={(rating, review) => console.log('Rating submitted:', rating, review)}
            onClose={() => console.log('Rating dialog closed')}
          />

          <ReviewDialog 
            isOpen={reviewDialog.isOpen}
            onClose={() => setReviewDialog({ isOpen: false, type: null })}
            type={reviewDialog.type}
            bookingId={mockBookingData.bookingId}
          />

          <DisputeCamera 
            bookingId={mockBookingData.bookingId}
            disputeType="overstay"
            onPhotoTaken={(photo, description) => console.log('Dispute photo taken:', photo, description)}
            onClose={() => console.log('Dispute camera closed')}
          />

          <CheckOutSystem 
            bookingId={mockBookingData.bookingId}
            endTime={mockBookingData.endTime}
            onCheckOut={(photo, timestamp) => console.log('Check out completed:', photo, timestamp)}
            isOvertime={new Date() > new Date(mockBookingData.endTime)}
          />

          <ExtensionSystem 
            bookingId={mockBookingData.bookingId}
            endTime={mockBookingData.endTime}
            pricePerHour={spotData.price}
            isSpotAvailableAfter={true}
            onExtensionRequested={(hours, cost) => console.log('Extension requested:', hours, cost)}
          />

          <PenaltySystem 
            violations={mockBookingData.userViolations}
            accountStatus={mockBookingData.accountStatus}
            totalPenalties={mockBookingData.userViolations.reduce((sum, v) => sum + v.penalty, 0)}
          />
        </>
      )}

      {/* Spot Report Dialog */}
      <SpotReportDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        bookingId="guest-report"
        spotTitle={spotData?.title || "Parking Spot"}
        spotAddress={spotData?.address || "Unknown Address"}
      />
    </div>
  );
};

export default SpotDetails;
