import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, Edit, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  is_default: boolean;
}

interface VehicleManagementDialogProps {
  onVehicleSelect?: (vehicle: Vehicle) => void;
  selectedVehicle?: Vehicle | null;
  children: React.ReactNode;
}

export const VehicleManagementDialog = ({ onVehicleSelect, selectedVehicle, children }: VehicleManagementDialogProps) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    license_plate: "",
    is_default: false
  });

  useEffect(() => {
    if (open && user) {
      loadVehicles();
    }
  }, [open, user]);

  const loadVehicles = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error: any) {
      toast.error('Failed to load vehicles');
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVehicle = async () => {
    if (!user) return;

    if (!formData.make || !formData.model || !formData.license_plate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const vehicleData = {
        ...formData,
        user_id: user.id
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);
        
        if (error) throw error;
        toast.success('Vehicle updated successfully');
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert([vehicleData]);
        
        if (error) throw error;
        toast.success('Vehicle added successfully');
      }

      await loadVehicles();
      resetForm();
    } catch (error: any) {
      toast.error(editingVehicle ? 'Failed to update vehicle' : 'Failed to add vehicle');
      console.error('Error saving vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;
      
      toast.success('Vehicle deleted successfully');
      await loadVehicles();
    } catch (error: any) {
      toast.error('Failed to delete vehicle');
      console.error('Error deleting vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (vehicleId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // First, unset all defaults
      await supabase
        .from('vehicles')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from('vehicles')
        .update({ is_default: true })
        .eq('id', vehicleId);

      if (error) throw error;
      
      toast.success('Default vehicle updated');
      await loadVehicles();
    } catch (error: any) {
      toast.error('Failed to set default vehicle');
      console.error('Error setting default vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      license_plate: "",
      is_default: false
    });
    setEditingVehicle(null);
  };

  const startEdit = (vehicle: Vehicle) => {
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      license_plate: vehicle.license_plate,
      is_default: vehicle.is_default
    });
    setEditingVehicle(vehicle);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Vehicle Management
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vehicle List */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Your Vehicles</h3>
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id} className={`cursor-pointer transition-all ${selectedVehicle?.id === vehicle.id ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1"
                        onClick={() => onVehicleSelect?.(vehicle)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </h4>
                          {vehicle.is_default && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                          {selectedVehicle?.id === vehicle.id && (
                            <Badge variant="secondary" className="text-xs">Selected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.color} • {vehicle.license_plate}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!vehicle.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(vehicle.id)}
                            disabled={loading}
                            title="Set as default"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(vehicle)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {vehicles.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No vehicles added yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Add/Edit Vehicle Form */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Year *</Label>
                  <Select 
                    value={formData.year.toString()} 
                    onValueChange={(value) => setFormData({...formData, year: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 30}, (_, i) => new Date().getFullYear() - i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="make">Make *</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => setFormData({...formData, make: e.target.value})}
                    placeholder="Toyota"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="Camry"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    placeholder="Blue"
                  />
                </div>
                
                <div>
                  <Label htmlFor="license_plate">License Plate *</Label>
                  <Input
                    id="license_plate"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({...formData, license_plate: e.target.value.toUpperCase()})}
                    placeholder="ABC123"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="is_default">Set as default vehicle</Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveVehicle} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </Button>
                
                {editingVehicle && (
                  <Button 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};