
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Plus, X, Car, MapPin, DollarSign, Clock, Camera, Shield, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ListSpot = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Information
    title: "",
    description: "",
    type: "",
    
    // Location
    address: "",
    city: "",
    state: "",
    zipCode: "",
    
    // Pricing & Availability
    pricePerHour: "",
    availabilityType: "always",
    customSchedule: {
      monday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      thursday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      sunday: { enabled: false, startTime: "09:00", endTime: "17:00" }
    },
    
    // Features & Rules
    features: [],
    specialInstructions: "",
    
    // Photos
    photos: [],
    
    // Settings
    instantBooking: true,
    minimumBooking: "1",
    maximumBooking: "24"
  });

  const availableFeatures = [
    "Covered/Garage", "Security Camera", "EV Charging", "24/7 Access", 
    "Gated Entry", "Well Lit", "Wheelchair Accessible", "Car Wash Available"
  ];

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleScheduleChange = (day: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      customSchedule: {
        ...prev.customSchedule,
        [day]: {
          ...prev.customSchedule[day as keyof typeof prev.customSchedule],
          [field]: value
        }
      }
    }));
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting parking spot listing:", formData);
    
    // Validate required fields
    if (!formData.title || !formData.address || !formData.pricePerHour || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }

    toast.success("Parking spot listed successfully! You'll be redirected to your spots.");
    
    // Simulate API call and redirect
    setTimeout(() => {
      navigate('/manage-spots');
    }, 2000);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Spot Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Downtown Garage Spot"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Parking Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parking type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driveway">Private Driveway</SelectItem>
                  <SelectItem value="garage">Covered Garage</SelectItem>
                  <SelectItem value="lot">Outdoor Lot</SelectItem>
                  <SelectItem value="street">Street Parking</SelectItem>
                  <SelectItem value="commercial">Commercial Lot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your parking spot, any special features, or access instructions..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  placeholder="12345"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="price">Price per Hour ($) *</Label>
              <Input
                id="price"
                type="number"
                placeholder="8.00"
                value={formData.pricePerHour}
                onChange={(e) => setFormData({...formData, pricePerHour: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>Availability Type</Label>
              <Select value={formData.availabilityType} onValueChange={(value) => setFormData({...formData, availabilityType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always Available (24/7)</SelectItem>
                  <SelectItem value="business">Business Hours Only</SelectItem>
                  <SelectItem value="custom">Custom Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.availabilityType === "custom" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Custom Schedule</CardTitle>
                  <CardDescription>Set specific hours for each day of the week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 mb-4">Weekly Schedule</h4>
                    <div className="space-y-3">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <div key={day} className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Checkbox 
                                id={day.toLowerCase()} 
                                className="border-gray-300 w-5 h-5"
                                checked={formData.customSchedule[day.toLowerCase() as keyof typeof formData.customSchedule].enabled}
                                onCheckedChange={(checked) => handleScheduleChange(day.toLowerCase(), 'enabled', checked)}
                              />
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
                                  value={formData.customSchedule[day.toLowerCase() as keyof typeof formData.customSchedule].startTime}
                                  onChange={(e) => handleScheduleChange(day.toLowerCase(), 'startTime', e.target.value)}
                                  disabled={!formData.customSchedule[day.toLowerCase() as keyof typeof formData.customSchedule].enabled}
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700 block mb-2">Until</Label>
                                <Input 
                                  type="time" 
                                  className="w-full h-12 text-base border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  value={formData.customSchedule[day.toLowerCase() as keyof typeof formData.customSchedule].endTime}
                                  onChange={(e) => handleScheduleChange(day.toLowerCase(), 'endTime', e.target.value)}
                                  disabled={!formData.customSchedule[day.toLowerCase() as keyof typeof formData.customSchedule].enabled}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minBooking">Minimum Booking (hours)</Label>
                <Input
                  id="minBooking"
                  type="number"
                  value={formData.minimumBooking}
                  onChange={(e) => setFormData({...formData, minimumBooking: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="maxBooking">Maximum Booking (hours)</Label>
                <Input
                  id="maxBooking"
                  type="number"
                  value={formData.maximumBooking}
                  onChange={(e) => setFormData({...formData, maximumBooking: e.target.value})}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label>Features & Amenities</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {availableFeatures.map((feature) => (
                  <div
                    key={feature}
                    onClick={() => handleFeatureToggle(feature)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.features.includes(feature)
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-medium">{feature}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="instructions">Special Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Any special access instructions, gate codes, or important notes for renters..."
                value={formData.specialInstructions}
                onChange={(e) => setFormData({...formData, specialInstructions: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Instant Booking</h3>
                <p className="text-sm text-gray-600">Allow renters to book without approval</p>
              </div>
              <Switch
                checked={formData.instantBooking}
                onCheckedChange={(checked) => setFormData({...formData, instantBooking: checked})}
              />
            </div>

            <div>
              <Label>Photos</Label>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <Button variant="outline" onClick={() => toast.info("Photo upload functionality would be implemented here")}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photos
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Add photos to help renters find and identify your spot
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <ArrowLeft className="w-5 h-5 mr-2 text-gray-600" />
                <h1 className="text-2xl font-bold text-blue-600">List Your Parking Spot</h1>
              </Link>
            </div>
            <div className="text-sm text-gray-600">
              Step {currentStep} of 4
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Progress</span>
            <span className="text-sm font-medium text-gray-600">{currentStep}/4</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Headers */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { num: 1, title: "Basic Info", icon: Car },
            { num: 2, title: "Location", icon: MapPin },
            { num: 3, title: "Pricing", icon: DollarSign },
            { num: 4, title: "Details", icon: Shield }
          ].map(({ num, title, icon: Icon }) => (
            <div
              key={num}
              className={`text-center p-4 rounded-lg transition-colors ${
                currentStep === num
                  ? "bg-blue-100 border-2 border-blue-500"
                  : currentStep > num
                  ? "bg-green-100 border-2 border-green-500"
                  : "bg-gray-100 border-2 border-gray-200"
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${
                currentStep === num
                  ? "text-blue-600"
                  : currentStep > num
                  ? "text-green-600"
                  : "text-gray-400"
              }`} />
              <div className={`text-sm font-medium ${
                currentStep === num
                  ? "text-blue-600"
                  : currentStep > num
                  ? "text-green-600"
                  : "text-gray-400"
              }`}>
                {title}
              </div>
            </div>
          ))}
        </div>

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Tell us about your parking spot"}
              {currentStep === 2 && "Where is your parking spot located?"}
              {currentStep === 3 && "Set your pricing and availability"}
              {currentStep === 4 && "Add the finishing touches"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Start with the basic information about your parking space"}
              {currentStep === 2 && "Help renters find your exact location"}
              {currentStep === 3 && "Configure how much to charge and when it's available"}
              {currentStep === 4 && "Add features, photos, and special instructions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {renderStepContent()}
              
              <div className="flex justify-between pt-6 mt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    List My Spot
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ListSpot;
