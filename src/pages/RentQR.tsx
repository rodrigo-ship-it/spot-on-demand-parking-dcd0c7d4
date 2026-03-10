import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Car } from "lucide-react";
import { toast } from "sonner";

const RentQR = () => {
  const { spotId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new booking flow with QR parameter
    if (spotId) {
      navigate(`/book-spot/${spotId}?action=book&qr=true`);
    } else {
      toast.error("Invalid QR code");
      navigate("/");
    }
  }, [spotId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading parking spot...</h2>
      </div>
    </div>
  );
};

export default RentQR;
