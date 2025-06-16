
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Clock, DollarSign, Star, Car, Shield, Zap, Calendar, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Index = () => {
  const [searchLocation, setSearchLocation] = useState("");
  const navigate = useNavigate();

  // Mock data for parking spots
  const parkingSpots = [
    {
      id: 1,
      title: "Downtown Garage Spot",
      address: "123 Main St, Downtown",
      price: 8,
      rating: 4.8,
      reviews: 124,
      image: "/placeholder.svg",
      features: ["Covered", "24/7 Access", "EV Charging"],
      distance: "0.2 miles",
      availability: "Available now"
    },
    {
      id: 2,
      title: "Office Building Parking",
      address: "456 Business Ave",
      price: 6,
      rating: 4.6,
      reviews: 89,
      image: "/placeholder.svg",
      features: ["Security Camera", "Well Lit"],
      distance: "0.4 miles",
      availability: "Available in 30 min"
    },
    {
      id: 3,
      title: "Residential Driveway",
      address: "789 Oak Street",
      price: 5,
      rating: 4.9,
      reviews: 67,
      image: "/placeholder.svg",
      features: ["Private", "Easy Access"],
      distance: "0.6 miles",
      availability: "Available now"
    }
  ];

  const handleSearch = () => {
    // Handle search functionality
    console.log("Searching for:", searchLocation);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
      {/* Modern Navigation */}
      <nav className="bg-white/90 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  ParkSpot
                </h1>
              </Link>
              <div className="hidden md:flex items-center space-x-6">
                <Link to="/how-it-works" className="text-slate-600 hover:text-violet-600 transition-colors font-medium">
                  How it Works
                </Link>
                <Link to="/manage-spots" className="text-slate-600 hover:text-violet-600 transition-colors font-medium">
                  My Spots
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/list-spot">
                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white">
                  List Your Spot
                </Button>
              </Link>
              <Button variant="outline" className="border-slate-300 hover:border-violet-300 hover:bg-violet-50">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Find Perfect
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              {" "}Parking
            </span>
            <br />
            Anywhere, Anytime
          </h1>
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
            Discover available parking spots in your area. Book instantly, park confidently.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Where do you need parking?"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="pl-12 border-0 bg-transparent text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 h-12"
                />
              </div>
              <Button 
                onClick={handleSearch}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 h-12"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                10,000+
              </div>
              <div className="text-slate-600">Parking Spots</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                50,000+
              </div>
              <div className="text-slate-600">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                24/7
              </div>
              <div className="text-slate-600">Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Available Spots */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Available Nearby</h2>
            <Button variant="outline" className="border-slate-300 hover:border-violet-300 hover:bg-violet-50">
              View All
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parkingSpots.map((spot) => (
              <Card key={spot.id} className="group cursor-pointer border-0 shadow-lg shadow-slate-900/5 hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="relative">
                  <img
                    src={spot.image}
                    alt={spot.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
                      {spot.availability}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-white/90 text-slate-900">
                      {spot.distance}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-slate-900 mb-1">
                        {spot.title}
                      </CardTitle>
                      <div className="flex items-center text-slate-600 mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-sm">{spot.address}</span>
                      </div>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-amber-400 fill-current" />
                        <span className="text-sm font-medium text-slate-900 ml-1">
                          {spot.rating}
                        </span>
                        <span className="text-sm text-slate-600 ml-1">
                          ({spot.reviews} reviews)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-violet-600">
                        ${spot.price}
                      </div>
                      <div className="text-sm text-slate-600">per hour</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {spot.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs border-slate-300 text-slate-700">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  
                  <Link to={`/spot/${spot.id}`} state={{ spotData: spot }}>
                    <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Choose ParkSpot?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Experience the future of parking with our smart, secure, and convenient platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Instant Booking</h3>
              <p className="text-sm text-slate-600">Book and pay in seconds with our streamlined process</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Secure & Safe</h3>
              <p className="text-sm text-slate-600">All spots verified with secure payment processing</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">24/7 Available</h3>
              <p className="text-sm text-slate-600">Find parking any time, day or night</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Best Prices</h3>
              <p className="text-sm text-slate-600">Competitive rates with transparent pricing</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Parking Smarter Today
            </h2>
            <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">
              Join thousands of drivers who have discovered stress-free parking with ParkSpot
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-violet-600 hover:bg-gray-50 font-semibold px-8">
                Find Parking Now
              </Button>
              <Link to="/list-spot">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-violet-600 px-8">
                  List Your Spot
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
