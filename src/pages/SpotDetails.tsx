import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Star, Clock, Shield, Car, Calendar, DollarSign, User, Phone, Mail, MessageSquare, Flag, Camera, Timer, CheckCircle, XCircle, AlertCircle, Eye, Edit, MoreHorizontal, TrendingUp, BarChart3 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RatingSystem } from "@/components/RatingSystem";
import { ReviewDialog } from "@/components/ReviewDialog";
import { DisputeCamera } from "@/components/DisputeCamera";
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

  const [spotData, setSpotData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch spot data from database
  useEffect(() => {
    const fetchSpotData = async () => {
      if (!id) {
        setError("No spot ID provided");
        setLoading(false);
        return;
      }

      try {
        const { data: spot, error: spotError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (spotError) {
          throw spotError;
        }

        if (!spot) {
          setError("Parking spot not found");
          setLoading(false);
          return;
        }

        setSpotData(spot);
      } catch (err: any) {
        console.error('Error fetching spot data:', err);
        setError(err.message || "Failed to load spot data");
        toast.error("Failed to load parking spot details");
      } finally {
        setLoading(false);
      }
    };

    fetchSpotData();
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

  // Check Out System
  const [isCheckOutSystemOpen, setIsCheckOutSystemOpen] = useState(false);

  // Extension System
  const [isExtensionSystemOpen, setIsExtensionSystemOpen] = useState(false);

  // Penalty System
  const [isPenaltySystemOpen, setIsPenaltySystemOpen] = useState(false);

  // Time Management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  // Handle continue to book button click
  const handleContinueToBook = () => {
    if (!spotData) return;
    
    // Navigate to new single-page booking flow
    navigate('/book-spot/' + id, { 
      state: { 
        spotData: {
          id: id,
          title: spotData.title,
          price: Number(spotData.price_per_hour),
          address: spotData.address,
          type: spotData.spot_type,
          features: spotData.amenities || [],
          description: spotData.description
        }
      }
    });
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
              <Button variant="outline" size="sm">Help</Button>
              <Link to="/auth">
                <Button size="sm">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
                  <span>Reviews ({spotData.total_reviews || 0})</span>
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-400 mr-1" />
                    <span className="font-medium">{spotData.rating || 0}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample Reviews */}
                  <div className="border-b pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                          M
                        </div>
                        <div>
                          <p className="font-medium">Mike Chen</p>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">2 days ago</span>
                    </div>
                    <p className="text-gray-700">Perfect spot for my daily commute. Always clean and well-lit. The owner is very responsive.</p>
                  </div>

                  <div className="border-b pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                          J
                        </div>
                        <div>
                          <p className="font-medium">Jessica Park</p>
                          <div className="flex items-center">
                            {[1, 2, 3, 4].map((star) => (
                              <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                            ))}
                            <Star className="w-4 h-4 text-gray-300" />
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">1 week ago</span>
                    </div>
                    <p className="text-gray-700">Great location and easy to access. Only issue was finding the exact spot initially, but instructions were helpful.</p>
                  </div>
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
                      <div className="text-3xl font-bold text-gray-900">${Number(spotData.price_per_hour).toFixed(2)}</div>
                      <div className="text-sm text-gray-600">per hour</div>
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
                    <span>{spotData.owner}</span>
                  </div>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Owner
                  </Button>
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
                  <Button variant="outline" className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Spot Details
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    View as Customer
                  </Button>
                  <Button variant="outline" className="w-full">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                  <Button variant="destructive" className="w-full">
                    Pause Listing
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
                  <Button variant="outline" size="sm" className="w-full">
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
    </div>
  );
};

export default SpotDetails;
