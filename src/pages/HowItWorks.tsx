
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, CreditCard, Car, DollarSign, Clock, Shield, Star } from "lucide-react";
import { Link } from "react-router-dom";

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="hover:scale-105 transition-transform duration-200">
                <img 
                  src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
                  alt="Arriv Logo" 
                  className="w-16 h-16 hover:drop-shadow-lg transition-all duration-200"
                />
              </Link>
              <div className="hidden md:flex items-center space-x-6">
                <Link to="/" className="text-gray-600 hover:text-primary transition-colors font-medium">
                  Home
                </Link>
                <Link to="/manage-spots" className="text-gray-600 hover:text-primary transition-colors font-medium">
                  My Spots
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/list-spot">
                <Button className="bg-primary hover:bg-secondary text-primary-foreground">
                  List Your Spot
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Enhanced Header with SEO */}
        <header className="text-center mb-16" role="banner">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 animate-fade-in">
            How Arriv
            <span className="gradient-text">
              {" "}Works
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-slide-up">
            Whether you're looking for convenient parking or wanting to earn money from your unused space, 
            Arriv makes it simple, secure, and profitable for everyone.
          </p>
        </header>

        {/* For Renters */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">For Renters</h2>
            <p className="text-lg text-gray-600">Find and book parking in three simple steps</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-card hover:shadow-elegant transition-all duration-300 group hover-lift animate-scale-in">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300 shadow-glow">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl gradient-text">1. Search</CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Enter your destination and desired parking duration to find perfect spots
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Real-time availability</li>
                  <li>• Filter by price and type</li>
                  <li>• See photos and reviews</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-card hover:shadow-elegant transition-all duration-300 group hover-lift animate-scale-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300 shadow-glow">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl gradient-text">2. Book & Pay</CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Secure your spot with instant booking and safe payment processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Instant confirmation</li>
                  <li>• Secure payment processing</li>
                  <li>• Digital parking pass</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-card hover:shadow-elegant transition-all duration-300 group hover-lift animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300 shadow-glow">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl gradient-text">3. Park</CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Navigate to your spot and park with confidence using our detailed directions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">For Spot Owners</h2>
            <p className="text-lg text-gray-600">Turn your unused space into income</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-lg shadow-gray-900/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">1. List Your Spot</CardTitle>
                <CardDescription className="text-base">
                  Create a listing with photos and details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Quick 5-minute setup</li>
                  <li>• Set your own pricing</li>
                  <li>• Choose availability times</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg shadow-gray-900/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">2. Get Bookings</CardTitle>
                <CardDescription className="text-base">
                  Receive booking requests and confirmations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Automatic booking system</li>
                  <li>• Instant notifications</li>
                  <li>• Guest screening included</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg shadow-gray-900/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">3. Earn Money</CardTitle>
                <CardDescription className="text-base">
                  Get paid automatically after each booking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Arriv?</h2>
            <p className="text-lg text-gray-600">Built with trust, security, and convenience in mind</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center group">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure & Safe</h3>
              <p className="text-sm text-gray-600">All transactions protected with bank-level security</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Trusted Community</h3>
              <p className="text-sm text-gray-600">Verified users with ratings and reviews</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-sm text-gray-600">Help available whenever you need it</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Fair Pricing</h3>
              <p className="text-sm text-gray-600">Competitive rates with transparent fees</p>
            </div>
          </div>
        </section>

        {/* Enhanced CTA */}
        <section className="text-center bg-gradient-hero rounded-2xl p-12 shadow-elegant hover-lift animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of verified users who trust Arriv for their parking needs. 
            Start saving time and money today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button variant="glass" size="xl" className="font-semibold px-8">
                <Search className="w-5 h-5 mr-2" />
                Find Parking
              </Button>
            </Link>
            <Link to="/list-spot">
              <Button variant="glass" size="xl" className="font-semibold px-8">
                <DollarSign className="w-5 h-5 mr-2" />
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
