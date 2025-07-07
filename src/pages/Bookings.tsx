import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, Search, Filter, Download, ArrowLeft, MapPin, Navigation, Phone, Mail, Star, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReviewDialog } from "@/components/ReviewDialog";
import { TimeManagement } from "@/components/TimeManagement";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const Bookings = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  // Mock data showing customer's reservations
  const myReservations = [
    {
      id: "BK001",
      spotTitle: "Downtown Garage Spot",
      spotAddress: "123 Main St, Downtown",
      spotOwner: "Jane Smith",
      ownerPhone: "+1 (555) 111-2222",
      date: "2024-06-05",
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      duration: "8 hours",
      pricePerHour: 8,
      totalCost: 64,
      status: "Upcoming",
      paymentStatus: "Paid"
    },
    {
      id: "BK002",
      spotTitle: "Residential Driveway",
      spotAddress: "456 Oak Avenue",
      spotOwner: "Bob Johnson",
      ownerPhone: "+1 (555) 333-4444",
      date: "2024-06-03",
      startTime: "8:00 AM",
      endTime: "6:00 PM",
      duration: "10 hours",
      pricePerHour: 6,
      totalCost: 60,
      status: "Active",
      paymentStatus: "Paid"
    },
    {
      id: "BK003",
      spotTitle: "Stadium Event Parking",
      spotAddress: "789 Sports Way",
      spotOwner: "Alice Wilson",
      ownerPhone: "+1 (555) 555-6666",
      date: "2024-05-30",
      startTime: "6:00 PM",
      endTime: "11:00 PM",
      duration: "5 hours",
      pricePerHour: 25,
      totalCost: 125,
      status: "Completed",
      paymentStatus: "Paid"
    }
  ];

  const filteredReservations = myReservations.filter(reservation => {
    const matchesSearch = reservation.spotTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.spotAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || reservation.status.toLowerCase() === statusFilter;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <ArrowLeft className="w-5 h-5 mr-2 text-gray-600" />
                <img 
                  src="/lovable-uploads/f37e97a8-1656-47c7-98b1-8da25e95fa8b.png" 
                  alt="Arriv Logo" 
                  className="w-8 h-8 mr-2"
                />
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Arriv
                </h1>
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">My Parking Reservations</h1>
          <p className="text-xl text-gray-600">
            View and manage all your parking reservations in one place.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reservations</CardDescription>
              <CardTitle className="text-2xl text-green-600">{filteredReservations.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl text-purple-600">{completedReservations}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Finished reservations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Upcoming</CardDescription>
              <CardTitle className="text-2xl text-orange-600">{upcomingReservations}</CardTitle>
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
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
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
                          <Button variant="outline" size="sm">
                            <Navigation className="w-3 h-3 mr-1" />
                            Directions
                          </Button>
                          <Button variant="outline" size="sm">
                            <Phone className="w-3 h-3 mr-1" />
                            Contact
                          </Button>
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
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Time Management - {reservation.id}</DialogTitle>
                              </DialogHeader>
                              <TimeManagement
                                bookingId={reservation.id}
                                endTime={`${reservation.date} ${reservation.endTime}`}
                                pricePerHour={reservation.pricePerHour}
                                userViolations={userViolations}
                                accountStatus="good"
                                isActive={reservation.status === "Active"}
                              />
                            </DialogContent>
                          </Dialog>
                        )}
                        {reservation.status === "Completed" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleLeaveReview(reservation.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Star className="w-3 h-3 mr-1" />
                            Leave Review
                          </Button>
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
                      <div className="flex items-center font-medium text-blue-600">
                        <DollarSign className="w-4 h-4" />
                        {reservation.totalCost}
                      </div>
                      <div className="text-sm text-gray-600">
                        ${reservation.pricePerHour}/hr
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
    </div>
  );
};

export default Bookings;
