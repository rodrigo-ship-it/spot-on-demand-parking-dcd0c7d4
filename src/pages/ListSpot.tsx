import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, DollarSign, Clock, Camera, Shield, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const ListSpot = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    type: "",
    hourlyRate: "",
    securityFeatures: [] as string[],
    images: [] as string[],
    minimumBooking: "1",
    maxBooking: "24",
    timeRestrictions: "",
    cancellationPolicy: "",
    additionalRules: ""
  });

  const parkingTypes = [
    { value: "driveway", label: "Private Driveway" },
    { value: "garage", label: "Covered Garage" },
    { value: "street", label: "Street Parking" },
    { value: "lot", label: "Open Parking Lot" },
    { value: "other", label: "Other" },
  ];

  const securityOptions = [
    { value: "camera", label: "Security Camera" },
    { value: "lights", label: "Good Lighting" },
    { value: "gate", label: "Gated Access" },
    { value: "security", label: "On-site Security" },
  ];

  const cancellationPolicies = [
    { value: "flexible", label: "Flexible: Full refund 24 hours before booking" },
    { value: "moderate", label: "Moderate: Full refund 48 hours before booking" },
    { value: "strict", label: "Strict: No refunds" },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSecurityFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      securityFeatures: prev.securityFeatures.includes(feature)
        ? prev.securityFeatures.filter(f => f !== feature)
        : [...prev.securityFeatures, feature]
    }));
  };

  const handleNextStep = () => {
    if (currentStep === 1 && (!formData.title || !formData.type)) {
      toast.error("Please fill in the required fields.");
      return;
    }

    if (currentStep === 2 && (!formData.address || !formData.city || !formData.state || !formData.zipCode)) {
      toast.error("Please fill in the required address fields.");
      return;
    }

    if (currentStep === 4 && !formData.hourlyRate) {
      toast.error("Please enter an hourly rate.");
      return;
    }

    if (currentStep === 4 && !formData.cancellationPolicy) {
      toast.error("Please select a cancellation policy.");
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    // Basic form validation
    if (!formData.title || !formData.description || !formData.address || !formData.city || !formData.state || !formData.zipCode || !formData.type || !formData.hourlyRate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Here you would typically send the form data to your backend
    console.log("Form Data Submitted:", formData);
    toast.success("Parking spot listed successfully!");
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Parking Spot Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Downtown Garage Spot, Driveway near Stadium"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your parking spot, any special instructions, or nearby landmarks..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="type">Parking Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parking type" />
                </SelectTrigger>
                <SelectContent>
                  {parkingTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                placeholder="123 Main St"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Anytown"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="CA"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input
                  id="zipCode"
                  placeholder="12345"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label>Security Features</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {securityOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={formData.securityFeatures.includes(option.value) ? "default" : "outline"}
                    className={formData.securityFeatures.includes(option.value) ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-200 hover:bg-gray-50"}
                    onClick={() => handleSecurityFeatureToggle(option.value)}
                  >
                    {option.label}
                    {formData.securityFeatures.includes(option.value) && <CheckCircle className="ml-2 w-4 h-4" />}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="images">Images (Optional)</Label>
              <Input
                id="images"
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    // Convert FileList to an array
                    const filesArray = Array.from(e.target.files);
                    // Update the state with the array of files
                    setFormData(prev => ({ ...prev, images: filesArray.map(file => file.name) }));
                  }
                }}
              />
              <p className="text-sm text-gray-500 mt-2">
                Upload images of your parking spot to give renters a better idea of the space.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate ($) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="hourlyRate"
                  type="number"
                  placeholder="15"
                  className="pl-10"
                  value={formData.hourlyRate}
                  onChange={(e) => handleInputChange("hourlyRate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minimumBooking">Minimum Booking (hours)</Label>
                <Input
                  id="minimumBooking"
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
                  value={formData.maxBooking}
                  onChange={(e) => setFormData({...formData, maxBooking: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="timeRestrictions">Time Restrictions (Optional)</Label>
              <Textarea
                id="timeRestrictions"
                placeholder="e.g., Available weekdays 9 AM - 6 PM only, No overnight parking"
                value={formData.timeRestrictions}
                onChange={(e) => handleInputChange("timeRestrictions", e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="cancellationPolicy">Cancellation Policy *</Label>
              <Select value={formData.cancellationPolicy} onValueChange={(value) => setFormData({...formData, cancellationPolicy: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cancellation policy" />
                </SelectTrigger>
                <SelectContent>
                  {cancellationPolicies.map((policy) => (
                    <SelectItem key={policy.value} value={policy.value}>
                      {policy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="additionalRules">Additional Rules (Optional)</Label>
              <Textarea
                id="additionalRules"
                placeholder="Any additional rules or requirements for renters..."
                value={formData.additionalRules}
                onChange={(e) => handleInputChange("additionalRules", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Review Your Listing</CardTitle>
                <CardDescription>Please review the information you've provided before submitting.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <Label>Title</Label>
                  <p className="font-medium">{formData.title}</p>
                </div>
                <div>
                  <Label>Description</Label>
                  <p>{formData.description || "No description provided."}</p>
                </div>
                <div>
                  <Label>Address</Label>
                  <p>{formData.address}, {formData.city}, {formData.state} {formData.zipCode}</p>
                </div>
                <div>
                  <Label>Parking Type</Label>
                  <p>{parkingTypes.find(type => type.value === formData.type)?.label || "Not specified"}</p>
                </div>
                <div>
                  <Label>Hourly Rate</Label>
                  <p>${formData.hourlyRate}</p>
                </div>
                <div>
                  <Label>Minimum Booking</Label>
                  <p>{formData.minimumBooking} hours</p>
                </div>
                <div>
                  <Label>Maximum Booking</Label>
                  <p>{formData.maxBooking} hours</p>
                </div>
                <div>
                  <Label>Time Restrictions</Label>
                  <p>{formData.timeRestrictions || "None"}</p>
                </div>
                <div>
                  <Label>Cancellation Policy</Label>
                  <p>{cancellationPolicies.find(policy => policy.value === formData.cancellationPolicy)?.label || "Not specified"}</p>
                </div>
                <div>
                  <Label>Additional Rules</Label>
                  <p>{formData.additionalRules || "None"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">List Your Parking Spot</h2>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((step) => (
            <div key={step} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}>
                {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
              <p className="text-sm text-gray-500 mt-1">Step {step}</p>
            </div>
          ))}
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handlePrevStep} disabled={currentStep === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          {currentStep === 5 ? (
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmit}>
              Submit Listing
            </Button>
          ) : (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleNextStep}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListSpot;
