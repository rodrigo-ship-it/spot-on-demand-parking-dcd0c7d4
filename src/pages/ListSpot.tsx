
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, MapPin, DollarSign, Clock, Camera, Car, Upload } from "lucide-react";
import { Link } from "react-router-dom";

const ListSpot = () => {
  const [availabilityType, setAvailabilityType] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ParkSpot
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="border-gray-200 hover:bg-gray-50">Help</Button>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">List Your Parking Spot</h1>
          <p className="text-xl text-gray-600">
            Turn your unused parking space into a source of income. It only takes a few minutes to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form className="space-y-8">
              {/* Basic Information */}
              <Card className="border-0 shadow-lg shadow-gray-900/5">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="flex items-center text-gray-900">
                    <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                    Location Details
                  </CardTitle>
                  <CardDescription>
                    Tell us where your parking spot is located
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title" className="text-sm font-medium text-gray-700">Spot Title</Label>
                      <Input 
                        id="title" 
                        placeholder="e.g., Downtown Garage Spot" 
                        className="mt-1 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type" className="text-sm font-medium text-gray-700">Parking Type</Label>
                      <Select>
                        <SelectTrigger className="mt-1 border-gray-200">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="driveway">Private Driveway</SelectItem>
                          <SelectItem value="garage">Covered Garage</SelectItem>
                          <SelectItem value="lot">Parking Lot</SelectItem>
                          <SelectItem value="street">Street Parking</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">Full Address</Label>
                    <Input 
                      id="address" 
                      placeholder="123 Main Street, City, State, ZIP" 
                      className="mt-1 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Describe your parking spot, any special instructions, or nearby landmarks..."
                      className="mt-1 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card className="border-0 shadow-lg shadow-gray-900/5">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                  <CardTitle className="flex items-center text-gray-900">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Pricing
                  </CardTitle>
                  <CardDescription>
                    Set your hourly rate
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price" className="text-sm font-medium text-gray-700">Price per Hour</Label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input 
                          id="price" 
                          type="number" 
                          placeholder="0.00" 
                          className="pl-10 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="currency" className="text-sm font-medium text-gray-700">Currency</Label>
                      <Select>
                        <SelectTrigger className="mt-1 border-gray-200">
                          <SelectValue placeholder="USD" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usd">USD ($)</SelectItem>
                          <SelectItem value="eur">EUR (€)</SelectItem>
                          <SelectItem value="gbp">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Availability */}
              <Card className="border-0 shadow-lg shadow-gray-900/5">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                  <CardTitle className="flex items-center text-gray-900">
                    <Clock className="w-5 h-5 mr-2 text-purple-600" />
                    Availability
                  </CardTitle>
                  <CardDescription>
                    When is your parking spot available?
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Availability Type</Label>
                    <Select value={availabilityType} onValueChange={setAvailabilityType}>
                      <SelectTrigger className="mt-1 border-gray-200">
                        <SelectValue placeholder="Select availability type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24-7">24/7 - Always Available</SelectItem>
                        <SelectItem value="weekdays">Weekdays Only</SelectItem>
                        <SelectItem value="weekends">Weekends Only</SelectItem>
                        <SelectItem value="specific-day">Specific Day & Hours</SelectItem>
                        <SelectItem value="custom">Custom Schedule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {availabilityType === "specific-day" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                      <h4 className="font-medium text-blue-900">One-Day Availability</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="specific-date" className="text-sm font-medium text-gray-700">Date</Label>
                          <Input 
                            id="specific-date" 
                            type="date" 
                            className="mt-1 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <Label htmlFor="start-time" className="text-sm font-medium text-gray-700">Start Time</Label>
                          <Input 
                            id="start-time" 
                            type="time" 
                            className="mt-1 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <Label htmlFor="end-time" className="text-sm font-medium text-gray-700">End Time</Label>
                          <Input 
                            id="end-time" 
                            type="time" 
                            className="mt-1 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {availabilityType === "custom" && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Weekly Schedule</h4>
                      <div className="space-y-3">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                          <div key={day} className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="space-y-4">
                              <div className="flex items-center space-x-3">
                                <Checkbox id={day.toLowerCase()} className="border-gray-300 w-5 h-5" />
                                <Label htmlFor={day.toLowerCase()} className="font-medium text-gray-900 text-base">
                                  {day}
                                </Label>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 block mb-2">From</Label>
                                  <Input 
                                    type="time" 
                                    className="w-full h-12 text-base border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 block mb-2">Until</Label>
                                  <Input 
                                    type="time" 
                                    className="w-full h-12 text-base border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>Tip:</strong> Check the days you want to make available and set the time ranges for each day.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Photos */}
              <Card className="border-0 shadow-lg shadow-gray-900/5">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 rounded-t-lg">
                  <CardTitle className="flex items-center text-gray-900">
                    <Camera className="w-5 h-5 mr-2 text-orange-600" />
                    Photos
                  </CardTitle>
                  <CardDescription>
                    Add photos to help renters find your spot
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Drag and drop photos here, or click to select</p>
                    <p className="text-sm text-gray-500">Recommended: 3-5 high-quality photos</p>
                    <Button variant="outline" className="mt-4">
                      Choose Files
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex justify-end space-x-4">
                <Button variant="outline" size="lg" className="px-8">
                  Save as Draft
                </Button>
                <Button size="lg" className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                  List My Spot
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <Card className="border-0 shadow-lg shadow-gray-900/5">
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>How your listing will appear</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg h-32 mb-3 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900">Your Parking Spot Title</h3>
                <p className="text-sm text-gray-600 mb-2">Your address will appear here</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">$--</span>
                  <Button size="sm" disabled>Book Now</Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-0 shadow-lg shadow-gray-900/5">
              <CardHeader>
                <CardTitle className="text-lg">Listing Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-600">Use clear, well-lit photos</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-600">Be specific about location and access</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-600">Set competitive pricing for your area</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-600">Include any special instructions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListSpot;
