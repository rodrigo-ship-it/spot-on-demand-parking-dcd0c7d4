import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, MapPin, Filter, X } from "lucide-react";

interface FilterOptions {
  status?: string[];
  dateRange?: { start: string; end: string };
  priceRange?: { min: number; max: number };
  spotType?: string[];
  location?: string;
}

interface FilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export const FilterDialog = ({ isOpen, onClose, onApplyFilters, currentFilters }: FilterDialogProps) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  const statusOptions = ["Confirmed", "Pending", "Active", "Completed", "Cancelled"];
  const spotTypeOptions = ["Driveway", "Garage", "Street", "Lot", "Covered"];

  const applyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  const clearFilters = () => {
    setFilters({});
    onApplyFilters({});
    onClose();
  };

  const removeFilter = (type: string, value?: string) => {
    const newFilters = { ...filters };
    if (type === "status" && value) {
      newFilters.status = newFilters.status?.filter(s => s !== value);
      if (newFilters.status?.length === 0) delete newFilters.status;
    } else if (type === "spotType" && value) {
      newFilters.spotType = newFilters.spotType?.filter(s => s !== value);
      if (newFilters.spotType?.length === 0) delete newFilters.spotType;
    } else if (type === "dateRange") {
      delete newFilters.dateRange;
    } else if (type === "priceRange") {
      delete newFilters.priceRange;
    } else if (type === "location") {
      delete newFilters.location;
    }
    setFilters(newFilters);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Advanced Filters
          </DialogTitle>
          <DialogDescription>
            Filter your results to find exactly what you're looking for
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Active Filters */}
          {hasActiveFilters && (
            <div>
              <Label className="text-sm font-medium">Active Filters</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.status?.map(status => (
                  <Badge key={status} variant="secondary" className="flex items-center gap-1">
                    {status}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter("status", status)} />
                  </Badge>
                ))}
                {filters.spotType?.map(type => (
                  <Badge key={type} variant="secondary" className="flex items-center gap-1">
                    {type}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter("spotType", type)} />
                  </Badge>
                ))}
                {filters.dateRange && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Date Range
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter("dateRange")} />
                  </Badge>
                )}
                {filters.priceRange && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Price Range
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter("priceRange")} />
                  </Badge>
                )}
                {filters.location && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Location
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter("location")} />
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={status}
                    checked={filters.status?.includes(status) || false}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters({
                          ...filters,
                          status: [...(filters.status || []), status]
                        });
                      } else {
                        setFilters({
                          ...filters,
                          status: filters.status?.filter(s => s !== status)
                        });
                      }
                    }}
                  />
                  <Label htmlFor={status} className="text-sm">{status}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="startDate" className="text-xs">From</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.dateRange?.start || ""}
                  onChange={(e) => setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange, start: e.target.value, end: filters.dateRange?.end || "" }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-xs">To</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.dateRange?.end || ""}
                  onChange={(e) => setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange, end: e.target.value, start: filters.dateRange?.start || "" }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Price Range (per hour)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="minPrice" className="text-xs">Min $</Label>
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="0"
                  value={filters.priceRange?.min || ""}
                  onChange={(e) => setFilters({
                    ...filters,
                    priceRange: { ...filters.priceRange, min: Number(e.target.value), max: filters.priceRange?.max || 0 }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="maxPrice" className="text-xs">Max $</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="100"
                  value={filters.priceRange?.max || ""}
                  onChange={(e) => setFilters({
                    ...filters,
                    priceRange: { ...filters.priceRange, max: Number(e.target.value), min: filters.priceRange?.min || 0 }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Spot Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Spot Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {spotTypeOptions.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={filters.spotType?.includes(type) || false}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters({
                          ...filters,
                          spotType: [...(filters.spotType || []), type]
                        });
                      } else {
                        setFilters({
                          ...filters,
                          spotType: filters.spotType?.filter(s => s !== type)
                        });
                      }
                    }}
                  />
                  <Label htmlFor={type} className="text-sm">{type}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium">Location</Label>
            <Input
              id="location"
              placeholder="Enter city, state, or zip code"
              value={filters.location || ""}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={clearFilters}>
            Clear All
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};