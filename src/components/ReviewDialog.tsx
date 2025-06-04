
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RatingSystem } from "./RatingSystem";
import { DisputeCamera } from "./DisputeCamera";

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: "rating" | "dispute";
  bookingId: string;
  userType?: "renter" | "lister";
  disputeType?: "overstay" | "occupied";
  onSubmitRating?: (rating: number, comment: string, photo?: string) => void;
  onPhotoTaken?: (photo: string, disputeType: string) => void;
}

export const ReviewDialog = ({
  isOpen,
  onClose,
  type,
  bookingId,
  userType,
  disputeType,
  onSubmitRating,
  onPhotoTaken,
}: ReviewDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-md">
        {type === "rating" && userType && onSubmitRating && (
          <RatingSystem
            bookingId={bookingId}
            userType={userType}
            onSubmitRating={onSubmitRating}
            onClose={onClose}
          />
        )}
        
        {type === "dispute" && disputeType && onPhotoTaken && (
          <DisputeCamera
            bookingId={bookingId}
            disputeType={disputeType}
            onPhotoTaken={onPhotoTaken}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
