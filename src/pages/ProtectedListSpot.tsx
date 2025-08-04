import { ProtectedRoute } from "@/components/ProtectedRoute";
import ListSpot from "./ListSpot";

const ProtectedListSpot = () => {
  return (
    <ProtectedRoute>
      <ListSpot />
    </ProtectedRoute>
  );
};

export default ProtectedListSpot;