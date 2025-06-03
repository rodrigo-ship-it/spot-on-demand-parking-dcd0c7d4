
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, DollarSign, Car, Search, Plus, Menu, Star } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const [viewMode, setViewMode] = useState<"map" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const featuredSpots = [
    {
      id: 1,
      title: "Downtown Garage Spot",
      location: "123 Main St, Downtown",
      price: 8,
      duration: "hour",
      distance: "0.2 miles",
      type: "Covered Garage",
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop"
    },
    {
      id: 2,
      title: "Stadium Parking",
      location: "456 Sports Ave",
      price: 25,
      duration: "event",
      distance: "0.5 miles",
      type: "Outdoor Lot",
      rating: 4.6,
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop"
    },
    {
      id: 3,
      title: "Residential Driveway",
      location: "789 Oak Street",
      price: 5,
      duration: "hour",
      distance: "0.3 miles",
      type: "Private Driveway",
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">ParkSpot</h1>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link to="/" className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Find Parking
                </Link>
                <Link to="/list-spot" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  List Your Spot
                </Link>
                <Link to="/how-it-works" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  How It Works
                </Link>
                <Button size="sm">Sign In</Button>
              </div>
            </div>
            <div className="md:hidden">
              <Button variant="outline" size="sm">
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Parking
              <span className="text-yellow-300"> Anywhere</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              Rent parking spots from garages, driveways, and lots. List your unused space and earn money.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-2 shadow-2xl">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                  <Input
                    type="text"
                    placeholder="Where do you need parking?"
                    className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 border-none outline-none focus-visible:ring-0"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 rounded-xl">
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">10,000+</h3>
            <p className="text-gray-600">Available Spots</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">$50+</h3>
            <p className="text-gray-600">Average Monthly Earnings</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">24/7</h3>
            <p className="text-gray-600">Booking Available</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Nearby Parking Spots</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="rounded-md"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Map
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-md"
            >
              List
            </Button>
          </div>
        </div>

        {/* Map View */}
        {viewMode === "map" && (
          <div className="h-96 mb-8 bg-gray-200 rounded-lg flex items-center justify-center border">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Interactive map view</p>
              <p className="text-gray-500 text-sm">Map integration coming soon</p>
            </div>
          </div>
        )}

        {/* Featured Spots */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {featuredSpots.map((spot) => (
            <Card key={spot.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="aspect-video bg-gray-200 relative">
                <img 
                  src={spot.image} 
                  alt={spot.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full text-sm font-semibold">
                  ${spot.price}/{spot.duration}
                </div>
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{spot.title}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {spot.location}
                    </CardDescription>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">{spot.rating}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">{spot.type}</span>
                  <span className="text-sm text-gray-600">{spot.distance}</span>
                </div>
                <Button className="w-full">Book Now</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-16">
          <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardTitle className="flex items-center text-2xl">
                <Search className="w-6 h-6 mr-3" />
                Need Parking?
              </CardTitle>
              <CardDescription className="text-blue-100">
                Find and book parking spots in seconds
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Real-time availability
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Instant booking confirmation
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  GPS directions to your spot
                </li>
              </ul>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Find Parking Now
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardTitle className="flex items-center text-2xl">
                <Plus className="w-6 h-6 mr-3" />
                Own a Parking Spot?
              </CardTitle>
              <CardDescription className="text-green-100">
                List your space and start earning money
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Set your own prices and schedule
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Automatic payments
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Full insurance coverage
                </li>
              </ul>
              <Link to="/list-spot">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  List Your Spot
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
