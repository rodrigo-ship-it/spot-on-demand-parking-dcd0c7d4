import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, DollarSign, User, Mail, Phone, Car } from "lucide-react";

interface BookingDetailsDialogProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingDetailsDialog = ({ booking, isOpen, onClose }: BookingDetailsDialogProps) => {
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

        {/* Actions */}
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={() => window.open(`mailto:${booking.email}`, '_self')}>
            <Mail className="w-4 h-4 mr-2" />
            Contact Customer
          </Button>
          <Button variant="outline" onClick={() => window.open(`tel:${booking.phone}`, '_self')}>
            <Phone className="w-4 h-4 mr-2" />
            Call Customer
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};