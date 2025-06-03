
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, CreditCard, Car, DollarSign, Shield, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const HowItWorks = () => {
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
                <Button variant="outline" size="sm">List Your Spot</Button>
              </Link>
              <Button size="sm">Sign In</Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            How ParkSpot Works
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Whether you're looking for parking or have space to rent, ParkSpot makes it simple, secure, and profitable.
          </p>
        </div>

        {/* For Renters */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">For Renters</h2>
            <p className="text-lg text-gray-600">Find and book parking in just a few taps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle>1. Search</CardTitle>
                <CardDescription>
                  Enter your destination and find available parking spots nearby
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Real-time availability
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Filter by price and distance
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    See photos and reviews
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle>2. Book</CardTitle>
                <CardDescription>
                  Reserve your spot instantly with secure payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Instant confirmation
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Secure payment processing
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Mobile parking pass
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle>3. Park</CardTitle>
                <CardDescription>
                  Get directions and park with confidence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    GPS navigation to spot
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Contact spot owner if needed
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    24/7 customer support
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* For Hosts */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">For Spot Owners</h2>
            <p className="text-lg text-gray-600">Turn your unused space into income</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>1. List</CardTitle>
                <CardDescription>
                  Add your parking spot with photos and details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Free to list
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Set your own prices
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Control availability
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>2. Approve</CardTitle>
                <CardDescription>
                  Review booking requests and approve renters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Instant or manual approval
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    See renter profiles
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    $1M liability coverage
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>3. Earn</CardTitle>
                <CardDescription>
                  Get paid automatically every week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Automatic payments
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Keep 80% of earnings
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Track your income
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of people already using ParkSpot
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/">
                <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                  Find Parking
                </Button>
              </Link>
              <Link to="/list-spot">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                  List Your Spot
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
