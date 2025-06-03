
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, DollarSign, Clock, Car, Edit, Eye, MoreHorizontal, ArrowLeft, Search, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const ManageSpots = () => {
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredSpots = parkingSpots.filter(spot =>
    spot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spot.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEarnings = parkingSpots.reduce((sum, spot) => sum + spot.monthlyEarnings, 0);
  const totalBookings = parkingSpots.reduce((sum, spot) => sum + spot.totalBookings, 0);
  const activeSpots = parkingSpots.filter(spot => spot.status === "Active").length;

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
              <Link to="/list-spot">
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Monthly Earnings</CardDescription>
              <CardTitle className="text-2xl text-green-600">${totalEarnings}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Spots</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{activeSpots}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Out of {parkingSpots.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Bookings</CardDescription>
              <CardTitle className="text-2xl text-purple-600">{totalBookings}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Rating</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">4.8</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Based on 26 reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
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
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
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
                <Button className="w-full bg-green-600 hover:bg-green-700">
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
              <Button variant="outline" className="w-full">
                Update Payment Info
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManageSpots;
