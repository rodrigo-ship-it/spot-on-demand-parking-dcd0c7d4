import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Edit, Save, Calendar, Clock, DollarSign, MapPin, Car, Users, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const SpotDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isBookingMode = searchParams.get('action') === 'book';
  const [isEditing, setIsEditing] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(isBookingMode);
  
  const [bookingData, setBookingData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    duration: "2",
    customerName: "",
    customerEmail: "",
    customerPhone: ""
  });

  const [spotData, setSpotData] = useState({
    title: "Downtown Garage Spot",
    description: "Secure covered parking spot in downtown garage. Perfect for daily commuters.",
    address: "123 Main St, Downtown",
    type: "Covered Garage",
    price: 8,
    isActive: true,
    availability: "24/7",
    features: ["Covered", "Security Camera", "EV Charging"],
    instructions: "Enter through main entrance, spot #42 on level 2"
  });

  const bookings = [
    { id: 1, date: "2024-06-03", time: "9:00 AM - 5:00 PM", customer: "John D.", earnings: 64, status: "Completed" },
    { id: 2, date: "2024-06-02", time: "10:00 AM - 2:00 PM", customer: "Sarah M.", earnings: 32, status: "Completed" },
    { id: 3, date: "2024-06-04", time: "8:00 AM - 6:00 PM", customer: "Mike R.", earnings: 80, status: "Upcoming" },
  ];

  const reviews = [
    { id: 1, customer: "John D.", rating: 5, comment: "Perfect location and very secure!", date: "2024-06-03" },
    { id: 2, customer: "Sarah M.", rating: 4, comment: "Easy access and great communication.", date: "2024-06-02" },
  ];

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Booking submitted:", bookingData);
    toast.success("Booking request submitted successfully! You'll receive a confirmation email shortly.");
    setShowBookingForm(false);
  };

  const calculateTotal = () => {
    const hours = parseInt(bookingData.duration);
    return spotData.price * hours;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to={isBookingMode ? "/" : "/manage-spots"} className="flex items-center">
                <ArrowLeft className="w-5 h-5 mr-2 text-gray-600" />
                <h1 className="text-2xl font-bold text-blue-600">
                  {isBookingMode ? "Back to Search" : "Back to My Spots"}
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {!isBookingMode && (
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant={isEditing ? "default" : "outline"}
                >
                  {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                  {isEditing ? "Save Changes" : "Edit Spot"}
                </Button>
              )}
              {isBookingMode && (
                <Button
                  onClick={() => setShowBookingForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Book This Spot
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {showBookingForm && (
          <Card className="mb-8 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-blue-900">Book This Parking Spot</CardTitle>
              <CardDescription>Fill in your details to reserve this spot</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={bookingData.date}
                      onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={bookingData.startTime}
                      onChange={(e) => setBookingData({...bookingData, startTime: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <Select value={bookingData.duration} onValueChange={(value) => setBookingData({...bookingData, duration: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="8">8 hours</SelectItem>
                        <SelectItem value="24">Full day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="customerName">Your Name</Label>
                    <Input
                      id="customerName"
                      value={bookingData.customerName}
                      onChange={(e) => setBookingData({...bookingData, customerName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={bookingData.customerEmail}
                      onChange={(e) => setBookingData({...bookingData, customerEmail: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={bookingData.customerPhone}
                      onChange={(e) => setBookingData({...bookingData, customerPhone: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-lg font-semibold">
                    Total: ${calculateTotal()}
                  </div>
                  <div className="flex space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowBookingForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Confirm Booking
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Spot Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Spot Information
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Active</span>
                    <Switch
                      checked={spotData.isActive}
                      onCheckedChange={(checked) => setSpotData({...spotData, isActive: checked})}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Spot Title</Label>
                    <Input
                      id="title"
                      value={spotData.title}
                      onChange={(e) => setSpotData({...spotData, title: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price per Hour ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={spotData.price}
                      onChange={(e) => setSpotData({...spotData, price: Number(e.target.value)})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={spotData.address}
                    onChange={(e) => setSpotData({...spotData, address: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Parking Type</Label>
                    <Select value={spotData.type} disabled={!isEditing}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Covered Garage">Covered Garage</SelectItem>
                        <SelectItem value="Private Driveway">Private Driveway</SelectItem>
                        <SelectItem value="Outdoor Lot">Outdoor Lot</SelectItem>
                        <SelectItem value="Street Parking">Street Parking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="availability">Availability</Label>
                    <Input
                      id="availability"
                      value={spotData.availability}
                      onChange={(e) => setSpotData({...spotData, availability: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={spotData.description}
                    onChange={(e) => setSpotData({...spotData, description: e.target.value})}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="instructions">Special Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={spotData.instructions}
                    onChange={(e) => setSpotData({...spotData, instructions: e.target.value})}
                    disabled={!isEditing}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>Latest bookings for this parking spot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-1" />
                            {booking.date}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="w-4 h-4 mr-1" />
                            {booking.time}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          <span className="font-medium">{booking.customer}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-green-600 font-medium">
                          <DollarSign className="w-4 h-4" />
                          {booking.earnings}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === "Completed" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Reviews</CardTitle>
                <CardDescription>Feedback from your customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{review.customer}</span>
                        <div className="flex items-center">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                          ))}
                          <span className="ml-2 text-sm text-gray-600">{review.date}</span>
                        </div>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Spot Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Monthly Earnings</span>
                  <span className="font-bold text-green-600">$240</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Bookings</span>
                  <span className="font-bold">15</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Average Rating</span>
                  <span className="font-bold">4.8 ⭐</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Occupancy Rate</span>
                  <span className="font-bold">78%</span>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">Map Preview</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{spotData.address}</p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Update Availability
                </Button>
                <Button variant="outline" className="w-full">
                  <Car className="w-4 h-4 mr-2" />
                  Duplicate Spot
                </Button>
                <Button variant="destructive" className="w-full">
                  Delete Spot
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpotDetails;
