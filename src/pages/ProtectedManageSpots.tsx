import { ProtectedRoute } from "@/components/ProtectedRoute";
import ManageSpots from "./ManageSpots";

const ProtectedManageSpots = () => {
  return (
    <ProtectedRoute>
      <ManageSpots />
    </ProtectedRoute>
  );
};

export default ProtectedManageSpots;