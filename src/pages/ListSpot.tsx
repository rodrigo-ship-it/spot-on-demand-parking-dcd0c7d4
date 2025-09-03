import { useState, useEffect } from "react";
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
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUpload } from "@/components/ImageUpload";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";

const ListSpot = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editSpotId = searchParams.get('edit');
  const isEditMode = !!editSpotId;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(isEditMode);
  const [dataLoaded, setDataLoaded] = useState(!isEditMode); // Track if initial data loading is complete
  const [formData, setFormData] = useState({
    // Basic Information
    title: "",
    description: "",
    type: "",
    totalSpots: "1", // New field for garage/lot capacity
    
    // Location
    address: "",
    latitude: null as number | null,
    longitude: null as number | null,
    city: "",
    state: "",
    zipCode: "",
    
    // Pricing & Availability
    pricingType: "hourly", // New field for pricing type
    pricePerHour: "",
    oneTimePrice: "", // New field for one-time pricing
    dailyPrice: "", // New field for daily pricing
    monthlyPrice: "", // New field for monthly pricing
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
    accessRequirements: "", // New field for required passes/codes
    accessInstructions: "", // New field for detailed access instructions
    
    // Photos
    photos: [],
    
    // Settings
    minimumBooking: "1",
    maximumBooking: "24"
  });

  const availableFeatures = [
    "Covered/Garage", "Security Camera", "EV Charging", "24/7 Access", 
    "Gated Entry", "Well Lit", "Wheelchair Accessible", "Car Wash Available",
    "Bigger Parking Spots", "Compound Spots"
  ];

  // Load existing spot data when in edit mode
  useEffect(() => {
    if (isEditMode && editSpotId && user) {
      loadExistingSpot();
    }
  }, [isEditMode, editSpotId, user]);

  const loadExistingSpot = async () => {
    if (!editSpotId) return;
    
    try {
      const { data, error } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('id', editSpotId)
        .eq('owner_id', user?.id)
        .single();

      if (error) {
        console.error('Error loading spot:', error);
        toast.error("Failed to load spot data");
        navigate('/manage-spots');
        return;
      }

      if (data) {
        // Parse the address to separate components
        const addressParts = data.address.split(', ');
        const zipState = addressParts[addressParts.length - 1]?.split(' ') || [];
        const state = zipState.length > 1 ? zipState.slice(0, -1).join(' ') : '';
        const zipCode = zipState[zipState.length - 1] || '';
        const city = addressParts[addressParts.length - 2] || '';
        const address = addressParts.slice(0, -2).join(', ');

        setFormData({
          title: data.title || '',
          description: data.description || '',
          type: data.spot_type || '',
          totalSpots: data.total_spots?.toString() || '1',
          address: data.address || '',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          city: city,
          state: state,
          zipCode: zipCode,
          pricingType: data.pricing_type || 'hourly',
          pricePerHour: data.pricing_type === 'hourly' ? data.price_per_hour?.toString() || '' : '',
          dailyPrice: data.pricing_type === 'daily' ? data.daily_price?.toString() || '' : '',
          monthlyPrice: data.pricing_type === 'monthly' ? data.monthly_price?.toString() || '' : '',
          oneTimePrice: data.one_time_price?.toString() || '',
          availabilityType: data.availability_schedule ? 'custom' : 'always',
          customSchedule: (data.availability_schedule as any) || {
            monday: { enabled: false, startTime: "09:00", endTime: "17:00" },
            tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
            wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
            thursday: { enabled: false, startTime: "09:00", endTime: "17:00" },
            friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
            saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
            sunday: { enabled: false, startTime: "09:00", endTime: "17:00" }
          },
          features: data.amenities || [],
          specialInstructions: data.access_instructions || '',
          accessRequirements: data.access_requirements || '',
          accessInstructions: '', // Keep this empty for backward compatibility
          photos: data.images || [],
          minimumBooking: "1",
          maximumBooking: "24"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred while loading spot data");
      navigate('/manage-spots');
    } finally {
      setLoading(false);
      setDataLoaded(true); // Mark data as loaded
    }
  };

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
    console.log('handleNextStep called', { currentStep });
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('handleSubmit called', { loading, currentStep, isEditMode });
    
    // Only allow submission on the final step - early exit for all other steps
    if (currentStep !== 4) {
      console.log('Not on final step, navigating to next step');
      handleNextStep();
      return; // Absolutely stop here
    }
    
    // Prevent submission during loading or if data hasn't finished loading yet
    if (loading || isSubmitting || !dataLoaded) {
      console.log('Submission blocked:', { loading, isSubmitting, dataLoaded });
      return;
    }
    
    if (!user) {
      toast.error("Please log in to list a parking spot");
      navigate('/auth');
      return;
    }
    
    // Validate required fields
    if (!formData.title || !formData.address || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate pricing based on type
    if (formData.pricingType === 'hourly' && !formData.pricePerHour) {
      toast.error("Please enter an hourly rate");
      return;
    }
    
    if (formData.pricingType === 'daily' && !formData.dailyPrice) {
      toast.error("Please enter a daily rate");
      return;
    }
    
    if (formData.pricingType === 'monthly' && !formData.monthlyPrice) {
      toast.error("Please enter a monthly rate");
      return;
    }
    
    if (formData.pricingType === 'one_time' && !formData.oneTimePrice) {
      toast.error("Please enter a one-time price");
      return;
    }

    // Validate total spots for garage/lot types
    if ((formData.type === "entire-garage" || formData.type === "entire-lot") && !formData.totalSpots) {
      toast.error("Please specify the number of spots available");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the full address
      const fullAddress = formData.address;
      
      // Validate that we have coordinates
      if (!formData.latitude || !formData.longitude) {
        toast.error("Please select a location from the suggestions to get accurate coordinates");
        return;
      }
      
      // Prepare availability schedule
      const availabilitySchedule = formData.availabilityType === 'custom' 
        ? formData.customSchedule 
        : null;

      // Determine spot type and count
      const spotType = formData.type === 'entire-garage' || formData.type === 'entire-lot' 
        ? formData.type 
        : 'single-spot';
      
      const totalSpots = spotType === 'single-spot' ? 1 : parseInt(formData.totalSpots);

      const spotData = {
        owner_id: user.id,
        title: formData.title,
        description: formData.description,
        address: fullAddress,
        latitude: formData.latitude,
        longitude: formData.longitude,
        spot_type: spotType,
        pricing_type: formData.pricingType,
        price_per_hour: formData.pricingType === 'hourly' ? parseFloat(formData.pricePerHour) : 
                        formData.pricingType === 'one_time' ? parseFloat(formData.oneTimePrice) : null,
        daily_price: formData.pricingType === 'daily' ? parseFloat(formData.dailyPrice) : null,
        monthly_price: formData.pricingType === 'monthly' ? parseFloat(formData.monthlyPrice) : null,
        one_time_price: formData.pricingType === 'one_time' ? parseFloat(formData.oneTimePrice) : null,
        total_spots: totalSpots,
        available_spots: totalSpots, // Initially all spots are available
        availability_schedule: availabilitySchedule,
        amenities: formData.features,
        images: formData.photos.length > 0 ? formData.photos : null,
        access_requirements: formData.accessRequirements || null,
        access_instructions: formData.specialInstructions || null,
        is_active: true
      };

      if (isEditMode && editSpotId) {
        // Update existing spot
        const { error } = await supabase
          .from('parking_spots')
          .update(spotData)
          .eq('id', editSpotId)
          .eq('owner_id', user.id);

        if (error) {
          console.error('Error updating parking spot:', error);
          toast.error("Failed to update parking spot. Please try again.");
          return;
        }

        toast.success("Parking spot updated successfully!");
      } else {
        // Create new spot
        const { data, error } = await supabase
          .from('parking_spots')
          .insert([spotData])
          .select()
          .single();

        if (error) {
          console.error('Error creating parking spot:', error);
          toast.error("Failed to list parking spot. Please try again.");
          return;
        }

        const spotText = (spotType === "entire-garage" || spotType === "entire-lot") 
          ? `with ${totalSpots} spots` 
          : "";
        
        toast.success(`Parking ${spotType.includes("entire") ? "facility" : "spot"} listed successfully! ${spotText}`);
      }
      
      // Redirect to manage spots page
      setTimeout(() => {
        navigate('/manage-spots');
      }, 1500);

    } catch (error) {
      console.error('Error:', error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
                  <SelectItem value="entire-garage">Entire Garage</SelectItem>
                  <SelectItem value="entire-lot">Entire Outdoor Lot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.type === "entire-garage" || formData.type === "entire-lot") && (
              <div>
                <Label htmlFor="totalSpots">Total Number of Spots *</Label>
                <Input
                  id="totalSpots"
                  type="number"
                  min="1"
                  placeholder="e.g., 10"
                  value={formData.totalSpots}
                  onChange={(e) => setFormData({...formData, totalSpots: e.target.value})}
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  How many parking spots are available in your {formData.type === "entire-garage" ? "garage" : "lot"}?
                </p>
              </div>
            )}

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
              <Label htmlFor="address">Address *</Label>
              <GooglePlacesAutocomplete
                value={formData.address}
                onChange={(value) => setFormData({...formData, address: value})}
                onLocationSelect={(location) => {
                  setFormData({
                    ...formData,
                    address: location.description,
                    latitude: location.latitude,
                    longitude: location.longitude
                  });
                }}
                placeholder="Search for the parking spot address..."
                className="w-full"
              />
              <p className="text-sm text-gray-600 mt-1">
                Use the search to select your exact address for accurate map positioning
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label>Pricing Type *</Label>
              <Select value={formData.pricingType} onValueChange={(value) => setFormData({...formData, pricingType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                  <SelectItem value="daily">Daily Rate</SelectItem>
                  <SelectItem value="monthly">Monthly Rate</SelectItem>
                  <SelectItem value="one_time">One-Time Charge</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-1">
                {formData.pricingType === 'hourly' 
                  ? "Charge renters based on the number of hours they park"
                  : formData.pricingType === 'daily'
                  ? "Charge renters based on the number of days they park"
                  : formData.pricingType === 'monthly'
                  ? "Charge renters a fixed monthly rate regardless of usage"
                  : "Charge a flat fee regardless of parking duration"
                }
              </p>
            </div>

            {formData.pricingType === 'hourly' ? (
              <div>
                <Label htmlFor="price">Price per Hour ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="8.00"
                  value={formData.pricePerHour}
                  onChange={(e) => setFormData({...formData, pricePerHour: e.target.value})}
                  required
                />
                {(formData.type === "entire-garage" || formData.type === "entire-lot") && (
                  <p className="text-sm text-gray-600 mt-1">
                    This is the price per spot per hour. Total revenue will be multiplied by occupied spots.
                  </p>
                )}
              </div>
            ) : formData.pricingType === 'daily' ? (
              <div>
                <Label htmlFor="dailyPrice">Price per Day ($) *</Label>
                <Input
                  id="dailyPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="40.00"
                  value={formData.dailyPrice}
                  onChange={(e) => setFormData({...formData, dailyPrice: e.target.value})}
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  Set a competitive daily rate for your parking spot
                </p>
              </div>
            ) : formData.pricingType === 'monthly' ? (
              <div>
                <Label htmlFor="monthlyPrice">Price per Month ($) *</Label>
                <Input
                  id="monthlyPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="300.00"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({...formData, monthlyPrice: e.target.value})}
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  Set a monthly rate for long-term parking arrangements
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="oneTimePrice">One-Time Price ($) *</Label>
                <Input
                  id="oneTimePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="25.00"
                  value={formData.oneTimePrice}
                  onChange={(e) => setFormData({...formData, oneTimePrice: e.target.value})}
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  Renters will pay this amount regardless of how long they park (up to your maximum booking duration).
                </p>
                {(formData.type === "entire-garage" || formData.type === "entire-lot") && (
                  <p className="text-sm text-gray-600 mt-1">
                    This is the price per spot. Total revenue will be multiplied by number of spots rented.
                  </p>
                )}
              </div>
            )}

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
                <Label htmlFor="minBooking">
                  Minimum Booking ({formData.pricingType === 'daily' ? 'days' : formData.pricingType === 'monthly' ? 'months' : 'hours'})
                </Label>
                <Input
                  id="minBooking"
                  type="number"
                  value={formData.minimumBooking}
                  onChange={(e) => setFormData({...formData, minimumBooking: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="maxBooking">
                  Maximum Booking ({formData.pricingType === 'daily' ? 'days' : formData.pricingType === 'monthly' ? 'months' : 'hours'})
                </Label>
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
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-medium">{feature}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="access">Access Requirements</Label>
              <Textarea
                id="access"
                placeholder="e.g., Gate code: 1234, Parking pass required, Contact at arrival..."
                value={formData.accessRequirements}
                onChange={(e) => setFormData({...formData, accessRequirements: e.target.value})}
                rows={2}
              />
              <p className="text-sm text-gray-600 mt-1">
                Specify any codes, passes, or special requirements renters need to access the parking spot
              </p>
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


            <div>
              <Label>Photos</Label>
              <ImageUpload
                images={formData.photos}
                onImagesChange={(images) => setFormData({...formData, photos: images})}
                maxImages={5}
                spotId="temp"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading spot data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-4">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
                <img 
                  src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
                  alt="Arriv Logo" 
                  className="w-16 h-16 hover:drop-shadow-lg transition-all duration-200"
                />
                <h1 className="text-xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Your Parking Spot' : 'List Your Parking Spot'}
                </h1>
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
              className="bg-primary h-2 rounded-full transition-all duration-300"
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
                  ? "bg-primary/10 border-2 border-primary"
                  : currentStep > num
                  ? "bg-green-100 border-2 border-green-500"
                  : "bg-gray-100 border-2 border-gray-200"
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${
                currentStep === num
                  ? "text-primary"
                  : currentStep > num
                  ? "text-green-600"
                  : "text-gray-400"
              }`} />
              <div className={`text-sm font-medium ${
                currentStep === num
                  ? "text-primary"
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
                  className="bg-primary hover:bg-secondary text-primary-foreground"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-secondary text-primary-foreground"
                >
                  {isSubmitting 
                    ? (isEditMode ? "Updating..." : "Listing...") 
                    : (isEditMode ? "Update Spot" : "List My Spot")
                  }
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ListSpot;
