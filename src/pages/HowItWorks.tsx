
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, CreditCard, Car, DollarSign, Clock, Shield, Star } from "lucide-react";
import { Link } from "react-router-dom";

const HowItWorks = () => {
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
                <Link to="/" className="text-slate-600 hover:text-violet-600 transition-colors font-medium">
                  Home
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

      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            How ParkSpot
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              {" "}Works
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Whether you're looking for parking or wanting to earn money from your unused space, 
            ParkSpot makes it simple and secure.
          </p>
        </div>

        {/* For Renters */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">For Renters</h2>
            <p className="text-lg text-slate-600">Find and book parking in three simple steps</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-lg shadow-slate-900/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">1. Search</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Enter your destination and desired parking duration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Real-time availability</li>
                  <li>• Filter by price and type</li>
                  <li>• See photos and reviews</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg shadow-slate-900/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">2. Book & Pay</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Secure your spot with instant booking and payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Instant confirmation</li>
                  <li>• Secure payment processing</li>
                  <li>• Digital parking pass</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg shadow-slate-900/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">3. Park</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Navigate to your spot and park with confidence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• GPS directions included</li>
                  <li>• Contact spot owner if needed</li>
                  <li>• Rate your experience</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* For Spot Owners */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">For Spot Owners</h2>
            <p className="text-lg text-slate-600">Turn your unused space into income</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-lg shadow-slate-900/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">1. List Your Spot</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Create a listing with photos and details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Quick 5-minute setup</li>
                  <li>• Set your own pricing</li>
                  <li>• Choose availability times</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg shadow-slate-900/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">2. Get Bookings</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Receive booking requests and confirmations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Automatic booking system</li>
                  <li>• Instant notifications</li>
                  <li>• Guest screening included</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg shadow-slate-900/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">3. Earn Money</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Get paid automatically after each booking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Weekly payouts</li>
                  <li>• No hidden fees</li>
                  <li>• Earnings dashboard</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Choose ParkSpot?</h2>
            <p className="text-lg text-slate-600">Built with trust, security, and convenience in mind</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Secure & Safe</h3>
              <p className="text-sm text-slate-600">All transactions protected with bank-level security</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Trusted Community</h3>
              <p className="text-sm text-slate-600">Verified users with ratings and reviews</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">24/7 Support</h3>
              <p className="text-sm text-slate-600">Help available whenever you need it</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Fair Pricing</h3>
              <p className="text-sm text-slate-600">Competitive rates with transparent fees</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-violet-100 mb-8">
            Join thousands of users who trust ParkSpot for their parking needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button size="lg" className="bg-white text-violet-600 hover:bg-gray-50 font-semibold px-8">
                Find Parking
              </Button>
            </Link>
            <Link to="/list-spot">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-violet-600 px-8">
                List Your Spot
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HowItWorks;
