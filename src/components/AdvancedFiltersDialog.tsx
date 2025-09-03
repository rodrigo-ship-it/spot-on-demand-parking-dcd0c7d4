import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, Calendar as CalendarIcon, MapPin, DollarSign, Car, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdvancedFilters {
  dateRange: {
    from?: Date;
    to?: Date;
  };
  pricePerHour: {
    min: number;
    max: number;
  };
  totalPrice: {
    min: number;
    max: number;
  };
  location: string;
  radius: number;
  spotTypes: string[];
  amenities: string[];
  availability: string;
  sortBy: string;
}

interface AdvancedFiltersDialogProps {
  onFiltersApply: (filters: AdvancedFilters) => void;
  currentFilters?: Partial<AdvancedFilters>;
  children: React.ReactNode;
}

const SPOT_TYPES = [
  'driveway', 'garage', 'street', 'lot', 'covered', 'outdoor'
];

const AMENITIES = [
  'ev_charging', 'security_camera', 'lighting', 'covered', 'attendant', 
  'wheelchair_accessible', 'motorcycle_friendly', 'height_clearance',
  'bigger_parking_spots', 'compound_spots'
];

export const AdvancedFiltersDialog = ({ onFiltersApply, currentFilters, children }: AdvancedFiltersDialogProps) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({
    dateRange: currentFilters?.dateRange || {},
    pricePerHour: currentFilters?.pricePerHour || { min: 0, max: 50 },
    totalPrice: currentFilters?.totalPrice || { min: 0, max: 500 },
    location: currentFilters?.location || '',
    radius: currentFilters?.radius || 5,
    spotTypes: currentFilters?.spotTypes || [],
    amenities: currentFilters?.amenities || [],
    availability: currentFilters?.availability || 'all',
    sortBy: currentFilters?.sortBy || 'distance'
  });

  const handleApplyFilters = () => {
    onFiltersApply(filters);
    setOpen(false);
    toast.success('Filters applied successfully');
  };

  const handleClearFilters = () => {
    const clearedFilters: AdvancedFilters = {
      dateRange: {},
      pricePerHour: { min: 0, max: 50 },
      totalPrice: { min: 0, max: 500 },
      location: '',
      radius: 5,
      spotTypes: [],
      amenities: [],
      availability: 'all',
      sortBy: 'distance'
    };
    setFilters(clearedFilters);
    onFiltersApply(clearedFilters);
    toast.success('Filters cleared');
  };

  const toggleSpotType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      spotTypes: prev.spotTypes.includes(type)
        ? prev.spotTypes.filter(t => t !== type)
        : [...prev.spotTypes, type]
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.dateRange.from) count++;
    if (filters.location) count++;
    if (filters.spotTypes.length > 0) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.availability !== 'all') count++;
    if (filters.pricePerHour.min > 0 || filters.pricePerHour.max < 50) count++;
    if (filters.totalPrice.min > 0 || filters.totalPrice.max < 500) count++;
    return count;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Advanced Filters
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary">{getActiveFiltersCount()} active</Badge>
              )}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear All
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Date & Time */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Date & Time</h3>
            
            <div>
              <Label>Date Range</Label>
              <div className="flex gap-2 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? format(filters.dateRange.from, "PPP") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from}
                      onSelect={(date) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, from: date }
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.to ? format(filters.dateRange.to, "PPP") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to}
                      onSelect={(date) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, to: date }
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label>Availability</Label>
              <Select 
                value={filters.availability} 
                onValueChange={(value) => setFilters(prev => ({...prev, availability: value}))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Spots</SelectItem>
                  <SelectItem value="available">Available Now</SelectItem>
                  <SelectItem value="available_soon">Available Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location & Distance */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Location</h3>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <div className="relative mt-2">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="location"
                  placeholder="Enter city, address, or landmark"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({...prev, location: e.target.value}))}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Search Radius: {filters.radius} miles</Label>
              <Slider
                value={[filters.radius]}
                onValueChange={(value) => setFilters(prev => ({...prev, radius: value[0]}))}
                max={50}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>
          </div>

          {/* Price Filters */}
          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-lg font-semibold">Price Filters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Per Hour Price */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Per Hour Price
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.pricePerHour.min || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      pricePerHour: { ...prev.pricePerHour, min: Number(e.target.value) || 0 }
                    }))}
                    className="w-20"
                    min="0"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.pricePerHour.max || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      pricePerHour: { ...prev.pricePerHour, max: Number(e.target.value) || 50 }
                    }))}
                    className="w-20"
                    min="0"
                  />
                  <span className="text-sm text-muted-foreground">/hr</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Range: ${filters.pricePerHour.min} - ${filters.pricePerHour.max}
                </div>
              </div>

              {/* Total Price */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Total Session Price
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.totalPrice.min || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      totalPrice: { ...prev.totalPrice, min: Number(e.target.value) || 0 }
                    }))}
                    className="w-20"
                    min="0"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.totalPrice.max || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      totalPrice: { ...prev.totalPrice, max: Number(e.target.value) || 500 }
                    }))}
                    className="w-20"
                    min="0"
                  />
                  <span className="text-sm text-muted-foreground">total</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Range: ${filters.totalPrice.min} - ${filters.totalPrice.max}
                </div>
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sort By</h3>
            
            <Select 
              value={filters.sortBy} 
              onValueChange={(value) => setFilters(prev => ({...prev, sortBy: value}))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="availability">Availability</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Spot Types */}
          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-lg font-semibold">Spot Types</h3>
            <div className="flex flex-wrap gap-2">
              {SPOT_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={filters.spotTypes.includes(type) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleSpotType(type)}
                >
                  <Car className="w-3 h-3 mr-1" />
                  {type.replace('_', ' ')}
                  {filters.spotTypes.includes(type) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-lg font-semibold">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(amenity => (
                <Badge
                  key={amenity}
                  variant={filters.amenities.includes(amenity) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleAmenity(amenity)}
                >
                  {amenity.replace('_', ' ')}
                  {filters.amenities.includes(amenity) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleApplyFilters} className="flex-1">
            Apply Filters ({getActiveFiltersCount()} active)
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};