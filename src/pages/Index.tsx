
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, DollarSign, Car, Search, Plus, Menu, Star } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  console.log("Index component is rendering");
  
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
                    className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 border-none outline-none"
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

        {/* Featured Spots */}
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Parking Spots</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="aspect-video bg-gray-200 relative flex items-center justify-center">
              <div className="text-gray-500">Parking Image</div>
              <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full text-sm font-semibold">
                $8/hour
              </div>
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Downtown Garage Spot</CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    123 Main St, Downtown
                  </CardDescription>
                </div>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600 ml-1">4.8</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600">Covered Garage</span>
                <span className="text-sm text-gray-600">0.2 miles</span>
              </div>
              <Button className="w-full">Book Now</Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="aspect-video bg-gray-200 relative flex items-center justify-center">
              <div className="text-gray-500">Parking Image</div>
              <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full text-sm font-semibold">
                $25/event
              </div>
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Stadium Parking</CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    456 Sports Ave
                  </CardDescription>
                </div>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600 ml-1">4.6</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600">Outdoor Lot</span>
                <span className="text-sm text-gray-600">0.5 miles</span>
              </div>
              <Button className="w-full">Book Now</Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="aspect-video bg-gray-200 relative flex items-center justify-center">
              <div className="text-gray-500">Parking Image</div>
              <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full text-sm font-semibold">
                $5/hour
              </div>
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Residential Driveway</CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    789 Oak Street
                  </CardDescription>
                </div>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600 ml-1">4.9</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600">Private Driveway</span>
                <span className="text-sm text-gray-600">0.3 miles</span>
              </div>
              <Button className="w-full">Book Now</Button>
            </CardContent>
          </Card>
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
