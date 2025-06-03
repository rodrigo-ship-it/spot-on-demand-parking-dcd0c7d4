
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, Search, Filter, Download, ArrowLeft, MapPin, User, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Bookings = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const bookings = [
    {
      id: "BK001",
      spotTitle: "Downtown Garage Spot",
      customer: "John Doe",
      email: "john@email.com",
      phone: "+1 (555) 123-4567",
      date: "2024-06-03",
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      duration: "8 hours",
      pricePerHour: 8,
      totalEarnings: 64,
      status: "Completed",
      paymentStatus: "Paid"
    },
    {
      id: "BK002",
      spotTitle: "Residential Driveway",
      customer: "Sarah Mitchell",
      email: "sarah@email.com",
      phone: "+1 (555) 987-6543",
      date: "2024-06-04",
      startTime: "8:00 AM",
      endTime: "6:00 PM",
      duration: "10 hours",
      pricePerHour: 6,
      totalEarnings: 60,
      status: "Active",
      paymentStatus: "Paid"
    },
    {
      id: "BK003",
      spotTitle: "Stadium Event Parking",
      customer: "Mike Rodriguez",
      email: "mike@email.com",
      phone: "+1 (555) 456-7890",
      date: "2024-06-05",
      startTime: "6:00 PM",
      endTime: "11:00 PM",
      duration: "5 hours",
      pricePerHour: 25,
      totalEarnings: 125,
      status: "Upcoming",
      paymentStatus: "Pending"
    }
  ];

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.spotTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status.toLowerCase() === statusFilter;
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

  const totalEarnings = filteredBookings.reduce((sum, booking) => sum + booking.totalEarnings, 0);
  const completedBookings = filteredBookings.filter(b => b.status === "Completed").length;
  const upcomingBookings = filteredBookings.filter(b => b.status === "Upcoming").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <ArrowLeft className="w-5 h-5 mr-2 text-gray-600" />
                <h1 className="text-2xl font-bold text-blue-600">ParkSpot</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button size="sm">Help</Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Booking Management</h1>
          <p className="text-xl text-gray-600">
            Track and manage all your parking spot bookings in one place.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Earnings</CardDescription>
              <CardTitle className="text-2xl text-green-600">${totalEarnings}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">From {filteredBookings.length} bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Bookings</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{filteredBookings.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">This period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl text-purple-600">{completedBookings}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Finished bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Upcoming</CardDescription>
              <CardTitle className="text-2xl text-orange-600">{upcomingBookings}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Future bookings</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by customer, spot, or booking ID..."
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
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Bookings</CardTitle>
            <CardDescription>
              Detailed view of all your parking spot bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Parking Spot</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center font-medium">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          {booking.customer}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {booking.email}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {booking.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        {booking.spotTitle}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {booking.date}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-3 h-3 mr-1" />
                          {booking.startTime} - {booking.endTime}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{booking.duration}</TableCell>
                    <TableCell>
                      <div className="flex items-center font-medium text-green-600">
                        <DollarSign className="w-4 h-4" />
                        {booking.totalEarnings}
                      </div>
                      <div className="text-sm text-gray-600">
                        ${booking.pricePerHour}/hr
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(booking.paymentStatus)}>
                        {booking.paymentStatus}
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
      </div>
    </div>
  );
};

export default Bookings;
