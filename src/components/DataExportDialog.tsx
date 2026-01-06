import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, Database } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DataExportDialogProps {
  children: React.ReactNode;
}

export const DataExportDialog = ({ children }: DataExportDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    profile: true,
    vehicles: true,
    bookings: true,
    parkingSpots: true,
    paymentMethods: false, // Sensitive data - opt-in
    reviews: true
  });

  const handleExport = async () => {
    if (!user) {
      toast.error('You must be logged in to export data');
      return;
    }

    setLoading(true);
    try {
      const exportData: any = {};
      const exportDate = new Date().toISOString();

      // Add metadata
      exportData.metadata = {
        exportDate,
        userId: user.id,
        userEmail: user.email
      };

      // Export profile data
      if (exportOptions.profile) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!error && profile) {
          exportData.profile = profile;
        }
      }

      // Export vehicles
      if (exportOptions.vehicles) {
        const { data: vehicles, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', user.id);
        
        if (!error && vehicles) {
          exportData.vehicles = vehicles;
        }
      }

      // Export bookings (as renter)
      if (exportOptions.bookings) {
        const { data: renterBookings, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('renter_id', user.id);
        
        if (!error && renterBookings) {
          exportData.bookingsAsRenter = renterBookings;
        }

        // Export bookings for owned spots
        const { data: spotOwnerBookings, error: spotError } = await supabase
          .from('bookings')
          .select(`
            *,
            parking_spots!inner(*)
          `)
          .eq('parking_spots.owner_id', user.id);
        
        if (!spotError && spotOwnerBookings) {
          exportData.bookingsForMySpots = spotOwnerBookings;
        }
      }

      // Export parking spots
      if (exportOptions.parkingSpots) {
        const { data: spots, error } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('owner_id', user.id);
        
        if (!error && spots) {
          exportData.parkingSpots = spots;
        }
      }

      // Export payment methods (if opted in)
      if (exportOptions.paymentMethods) {
        const { data: methods, error } = await supabase
          .from('payment_methods')
          .select('id, type, last_four, expiry_month, expiry_year, cardholder_name, is_default, created_at')
          .eq('user_id', user.id);
        
        if (!error && methods) {
          exportData.paymentMethods = methods;
        }
      }

      // Export reviews
      if (exportOptions.reviews) {
        const { data: reviewsGiven, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('reviewer_id', user.id);
        
        if (!error && reviewsGiven) {
          exportData.reviewsGiven = reviewsGiven;
        }

        const { data: reviewsReceived, error: receivedError } = await supabase
          .from('reviews')
          .select('*')
          .eq('reviewed_id', user.id);
        
        if (!receivedError && reviewsReceived) {
          exportData.reviewsReceived = reviewsReceived;
        }
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settld-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data export completed successfully');
      setOpen(false);
    } catch (error: any) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (option: keyof typeof exportOptions, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: checked
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download Account Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select the data you'd like to include in your export. The data will be downloaded as a JSON file.
          </p>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="profile"
                  checked={exportOptions.profile}
                  onCheckedChange={(checked) => handleOptionChange('profile', checked as boolean)}
                />
                <label htmlFor="profile" className="text-sm font-medium cursor-pointer">
                  Profile Information
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vehicles"
                  checked={exportOptions.vehicles}
                  onCheckedChange={(checked) => handleOptionChange('vehicles', checked as boolean)}
                />
                <label htmlFor="vehicles" className="text-sm font-medium cursor-pointer">
                  Registered Vehicles
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bookings"
                  checked={exportOptions.bookings}
                  onCheckedChange={(checked) => handleOptionChange('bookings', checked as boolean)}
                />
                <label htmlFor="bookings" className="text-sm font-medium cursor-pointer">
                  Booking History
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="parkingSpots"
                  checked={exportOptions.parkingSpots}
                  onCheckedChange={(checked) => handleOptionChange('parkingSpots', checked as boolean)}
                />
                <label htmlFor="parkingSpots" className="text-sm font-medium cursor-pointer">
                  Listed Parking Spots
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reviews"
                  checked={exportOptions.reviews}
                  onCheckedChange={(checked) => handleOptionChange('reviews', checked as boolean)}
                />
                <label htmlFor="reviews" className="text-sm font-medium cursor-pointer">
                  Reviews Given & Received
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="paymentMethods"
                  checked={exportOptions.paymentMethods}
                  onCheckedChange={(checked) => handleOptionChange('paymentMethods', checked as boolean)}
                />
                <label htmlFor="paymentMethods" className="text-sm font-medium cursor-pointer">
                  Payment Methods (Sensitive)
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <FileText className="w-4 h-4 inline mr-1" />
              Your data will be exported in JSON format. This includes all selected information associated with your account.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExport} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Database className="w-4 h-4 mr-2 animate-pulse" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};