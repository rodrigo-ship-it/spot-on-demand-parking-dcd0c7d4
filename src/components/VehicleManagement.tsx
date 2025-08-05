import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Car, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Vehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  isDefault: boolean;
}

interface VehicleManagementProps {
  vehicles: Vehicle[];
  onVehicleChange: (vehicleId: string) => void;
  selectedVehicleId?: string;
}

export const VehicleManagement = ({ vehicles: initialVehicles, onVehicleChange, selectedVehicleId }: VehicleManagementProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    year: "",
    make: "",
    model: "",
    color: "",
    licensePlate: ""
  });

  const addVehicle = () => {
    if (!newVehicle.year || !newVehicle.make || !newVehicle.model || !newVehicle.licensePlate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const vehicle: Vehicle = {
      id: Date.now().toString(),
      ...newVehicle,
      isDefault: vehicles.length === 0
    };

    setVehicles([...vehicles, vehicle]);
    setNewVehicle({ year: "", make: "", model: "", color: "", licensePlate: "" });
    setIsAddingVehicle(false);
    toast.success("Vehicle added successfully");
  };

  const removeVehicle = (vehicleId: string) => {
    const vehicleToRemove = vehicles.find(v => v.id === vehicleId);
    if (vehicleToRemove?.isDefault && vehicles.length > 1) {
      toast.error("Cannot remove default vehicle. Set another vehicle as default first.");
      return;
    }
    
    setVehicles(vehicles.filter(v => v.id !== vehicleId));
    toast.success("Vehicle removed successfully");
  };

  const setAsDefault = (vehicleId: string) => {
    setVehicles(vehicles.map(v => ({ ...v, isDefault: v.id === vehicleId })));
    toast.success("Default vehicle updated");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Car className="w-5 h-5 mr-2" />
            Vehicle Information
          </span>
          <Dialog open={isAddingVehicle} onOpenChange={setIsAddingVehicle}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Add a new vehicle to your account for booking parking spots.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      value={newVehicle.year}
                      onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                      placeholder="2023"
                    />
                  </div>
                  <div>
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      value={newVehicle.make}
                      onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                      placeholder="Toyota"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                      placeholder="Camry"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={newVehicle.color}
                      onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                      placeholder="Blue"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="licensePlate">License Plate</Label>
                  <Input
                    id="licensePlate"
                    value={newVehicle.licensePlate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value })}
                    placeholder="ABC123"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddingVehicle(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addVehicle}>Add Vehicle</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className={`p-3 rounded border cursor-pointer transition-colors ${
              selectedVehicleId === vehicle.id
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onVehicleChange(vehicle.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                  {vehicle.isDefault && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {vehicle.color} • License: {vehicle.licensePlate}
                </div>
              </div>
              <div className="flex space-x-1">
                {!vehicle.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAsDefault(vehicle.id);
                    }}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeVehicle(vehicle.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No vehicles added yet. Add your first vehicle to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};