import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, DollarSign, User, Mail, Phone, Car, AlertTriangle } from "lucide-react";
import { ContactButtons } from "./ContactButtons";
import { SpotReportDialog } from "./SpotReportDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

interface BookingDetailsDialogProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingDetailsDialog = ({ booking, isOpen, onClose }: BookingDetailsDialogProps) => {
  const { user } = useAuth();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  
  if (!booking) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "active": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Booking Details - {booking.id}
            <Badge className={getStatusColor(booking.status)}>
              {booking.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Complete information about this parking reservation
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium">{booking.customer}</span>
              </div>
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                <span className="text-sm">{booking.email}</span>
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <span className="text-sm">{booking.phone}</span>
              </div>
            </div>
          </div>

          {/* Parking Spot Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Parking Spot
            </h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium">{booking.spotTitle}</span>
              </div>
              <div className="text-sm text-gray-600">
                123 Main Street, Downtown
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Booking Details
            </h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <span className="text-sm">{booking.date}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                <span className="text-sm">{booking.startTime} - {booking.endTime}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                <span className="text-sm">Duration: {booking.duration}</span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Payment Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Rate per hour:</span>
                <span className="font-medium">${booking.pricePerHour}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Duration:</span>
                <span className="font-medium">{booking.duration}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-green-600">${booking.totalEarnings}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="mt-6">
          <h3 className="font-semibold text-lg flex items-center mb-4">
            <Car className="w-5 h-5 mr-2" />
            Vehicle Information
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">2023 Toyota Camry</div>
                <div className="text-sm text-gray-600">Blue • License: ABC123</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Actions */}
        <div className="flex flex-col space-y-4 mt-6">
          {/* Report spot issue button for renters with confirmed/active bookings */}
          {booking.renter_id === user?.id && 
           ['confirmed', 'active'].includes(booking.status?.toLowerCase()) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-orange-800">Spot Issue?</h4>
                  <p className="text-sm text-orange-700">Report if the spot is occupied by someone else</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReportDialogOpen(true)}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Report Spot
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div>
              {/* Show secure contact buttons if we have the necessary IDs */}
              {booking.id && user && (
                <ContactButtons
                  bookingId={booking.id}
                  recipientId={booking.renter_id || booking.owner_id} 
                  recipientName={booking.customer || booking.ownerName || 'Contact'}
                  showCallButton={true}
                  showChatButton={true}
                />
              )}
            </div>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>

        {/* Report Dialog */}
        <SpotReportDialog
          isOpen={isReportDialogOpen}
          onClose={() => setIsReportDialogOpen(false)}
          bookingId={booking.id}
          spotTitle={booking.spotTitle || 'Parking Spot'}
          spotAddress={booking.address || '123 Main Street, Downtown'}
        />
      </DialogContent>
    </Dialog>
  );
};