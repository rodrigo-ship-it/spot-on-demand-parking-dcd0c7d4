
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Clock, Car, Edit, Eye, MoreHorizontal, ArrowLeft, Search, Plus, Calendar, User, Phone, Mail, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import QRCodeDisplay from "@/components/QRCodeDisplay";

const ManageSpots = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpotForQR, setSelectedSpotForQR] = useState<number | null>(null);

  // Mock data for demonstration
  const parkingSpots = [
    {
      id: 1,
      title: "Downtown Garage Spot",
      address: "123 Main St, Downtown",
      type: "Covered Garage",
      price: 8,
      status: "Active",
      totalBookings: 15,
      monthlyEarnings: 240,
      lastBooked: "2024-06-01",
      availability: "24/7"
    },
    {
      id: 2,
      title: "Residential Driveway",
      address: "456 Oak Avenue",
      type: "Private Driveway",
      price: 6,
      status: "Active",
      totalBookings: 8,
      monthlyEarnings: 144,
      lastBooked: "2024-05-28",
      availability: "Weekdays Only"
    },
    {
      id: 3,
      title: "Stadium Event Parking",
      address: "789 Sports Way",
      type: "Outdoor Lot",
      price: 25,
      status: "Paused",
      totalBookings: 3,
      monthlyEarnings: 75,
      lastBooked: "2024-05-15",
      availability: "Specific Day & Hours"
    }
  ];

  // Mock upcoming reservations for the spot owner's properties
  const upcomingReservations = [
    {
      id: "BK004",
      spotTitle: "Downtown Garage Spot",
      customer: "Alice Johnson",
      email: "alice@email.com",
      phone: "+1 (555) 777-8888",
      date: "2024-06-06",
      startTime: "7:00 AM",
      endTime: "7:00 PM",
      duration: "12 hours",
      pricePerHour: 8,
      totalEarnings: 96,
      status: "Confirmed"
    },
    {
      id: "BK005",
      spotTitle: "Residential Driveway",
      customer: "David Lee",
      email: "david@email.com",
      phone: "+1 (555) 999-1111",
      date: "2024-06-07",
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      duration: "8 hours",
      pricePerHour: 6,
      totalEarnings: 48,
      status: "Confirmed"
    },
    {
      id: "BK006",
      spotTitle: "Downtown Garage Spot",
      customer: "Emma Wilson",
      email: "emma@email.com",
      phone: "+1 (555) 222-3333",
      date: "2024-06-08",
      startTime: "8:00 AM",
      endTime: "6:00 PM",
      duration: "10 hours",
      pricePerHour: 8,
      totalEarnings: 80,
      status: "Pending"
    }
  ];

  const filteredSpots = parkingSpots.filter(spot =>
    spot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spot.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEarnings = parkingSpots.reduce((sum, spot) => sum + spot.monthlyEarnings, 0);
  const totalBookings = parkingSpots.reduce((sum, spot) => sum + spot.totalBookings, 0);
  const activeSpots = parkingSpots.filter(spot => spot.status === "Active").length;

  const getReservationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

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
              <Button variant="outline" size="sm">Help</Button>
              <Button size="sm">Sign In</Button>
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
              <CardTitle className="text-2xl text-primary">${totalEarnings}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">+12% from last month</p>
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
              <CardTitle className="text-2xl text-primary">4.8</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Based on 26 reviews</p>
            </CardContent>
          </Card>
        </div>

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
                {upcomingReservations.map((reservation) => (
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
                        ${reservation.pricePerHour}/hr
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getReservationStatusColor(reservation.status)}>
                        {reservation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          Contact
                        </Button>
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
          <Button variant="outline">
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
                  <TableHead>Price/Hour</TableHead>
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
                        <p className="font-medium">{spot.title}</p>
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
                        {spot.price}
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
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedSpotForQR(selectedSpotForQR === spot.id ? null : spot.id)}
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
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
                 <QRCodeDisplay 
                   spotId={selectedSpot.id.toString()} 
                   spotTitle={selectedSpot.title}
                 />
               ) : null;
             })()}
           </div>
         )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="w-5 h-5 mr-2 text-green-600" />
                Ready to List Another Spot?
              </CardTitle>
              <CardDescription>
                Add more parking spaces to increase your earning potential
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/list-spot">
                <Button className="w-full bg-primary hover:bg-secondary text-primary-foreground">
                  List New Parking Spot
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Manage your payout preferences and banking information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/profile">
                <Button variant="outline" className="w-full">
                  Update Payment Info
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManageSpots;
