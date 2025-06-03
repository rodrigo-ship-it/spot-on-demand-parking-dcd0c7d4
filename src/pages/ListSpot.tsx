
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, DollarSign, Clock, Car, Camera, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const ListSpot = () => {
  const [formData, setFormData] = useState({
    title: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    description: "",
    spotType: "",
    price: "",
    availability: "",
    specificDate: "",
    startTime: "",
    endTime: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showSpecificTimeFields = formData.availability === "specific-day";

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
              <Link to="/manage-spots">
                <Button variant="outline" size="sm">Manage Spots</Button>
              </Link>
              <Button variant="outline" size="sm">Help</Button>
              <Button size="sm">Sign In</Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">List Your Parking Spot</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Turn your unused parking space into a source of income. It's free to list and easy to manage.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Tell us about your parking spot</CardTitle>
                <CardDescription>
                  Provide details about your parking space to attract renters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                    Location Details
                  </h3>
                  
                  <div>
                    <Label htmlFor="title">Spot Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Downtown garage spot, Driveway near stadium"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main Street"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="New York"
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        placeholder="NY"
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        placeholder="10001"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange("zipCode", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Spot Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Car className="w-5 h-5 mr-2 text-blue-600" />
                    Spot Details
                  </h3>

                  <div>
                    <Label htmlFor="spotType">Type of Parking</Label>
                    <Select value={formData.spotType} onValueChange={(value) => handleInputChange("spotType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parking type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="garage">Covered Garage</SelectItem>
                        <SelectItem value="driveway">Private Driveway</SelectItem>
                        <SelectItem value="lot">Outdoor Lot</SelectItem>
                        <SelectItem value="street">Street Parking</SelectItem>
                        <SelectItem value="carport">Carport</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your parking spot, any special instructions, nearby landmarks..."
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>

                {/* Pricing & Availability */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                    Pricing & Availability
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Hourly Rate ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="8.00"
                        value={formData.price}
                        onChange={(e) => handleInputChange("price", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="availability">Availability</Label>
                      <Select value={formData.availability} onValueChange={(value) => handleInputChange("availability", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="When is it available?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24/7">24/7</SelectItem>
                          <SelectItem value="weekdays">Weekdays Only</SelectItem>
                          <SelectItem value="weekends">Weekends Only</SelectItem>
                          <SelectItem value="evenings">Evenings & Weekends</SelectItem>
                          <SelectItem value="specific-day">Specific Day & Hours</SelectItem>
                          <SelectItem value="custom">Custom Schedule</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {showSpecificTimeFields && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900">Specific Day & Time Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="specificDate">Date</Label>
                          <Input
                            id="specificDate"
                            type="date"
                            value={formData.specificDate}
                            onChange={(e) => handleInputChange("specificDate", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="startTime">Start Time</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => handleInputChange("startTime", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endTime">End Time</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => handleInputChange("endTime", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Photos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Camera className="w-5 h-5 mr-2 text-blue-600" />
                    Photos
                  </h3>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Add photos of your parking spot</p>
                    <Button variant="outline">Upload Photos</Button>
                  </div>
                </div>

                <Button className="w-full bg-green-600 hover:bg-green-700 py-3">
                  List My Parking Spot
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Earning Potential</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">$240</div>
                  <p className="text-gray-600 mb-4">Estimated monthly earnings</p>
                  <div className="text-sm text-gray-500">
                    Based on $8/hour, 4 hours/day
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Why List With ParkSpot?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></div>
                  <div>
                    <p className="font-medium">Free to List</p>
                    <p className="text-sm text-gray-600">No upfront costs or monthly fees</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></div>
                  <div>
                    <p className="font-medium">Secure Payments</p>
                    <p className="text-sm text-gray-600">Automatic payments every week</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></div>
                  <div>
                    <p className="font-medium">Full Insurance</p>
                    <p className="text-sm text-gray-600">$1M liability coverage included</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></div>
                  <div>
                    <p className="font-medium">24/7 Support</p>
                    <p className="text-sm text-gray-600">We're here to help anytime</p>
                  </div>
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
