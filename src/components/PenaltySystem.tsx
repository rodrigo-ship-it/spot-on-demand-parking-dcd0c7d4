
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, DollarSign, Ban } from "lucide-react";

interface Violation {
  id: string;
  type: "late_checkout" | "no_checkout" | "damage";
  date: string;
  penalty: number;
  description: string;
}

interface PenaltySystemProps {
  violations: Violation[];
  accountStatus: "good" | "warning" | "suspended";
  totalPenalties: number;
}

export const PenaltySystem = ({ violations, accountStatus, totalPenalties }: PenaltySystemProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "good": return "bg-green-100 text-green-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      case "suspended": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "warning": return <AlertTriangle className="w-4 h-4" />;
      case "suspended": return <Ban className="w-4 h-4" />;
      default: return null;
    }
  };

  const getViolationIcon = (type: string) => {
    switch (type) {
      case "late_checkout": return <Clock className="w-4 h-4 text-orange-500" />;
      case "no_checkout": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "damage": return <Ban className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getPenaltySchedule = () => {
    return [
      { offense: "Grace Period (0-30 min)", penalty: "$0", action: "No penalty" },
      { offense: "Late Check-out (31-60 min)", penalty: "$2", action: "Convenience fee" },
      { offense: "Extended Late (61-120 min)", penalty: "$8", action: "Moderate fee" },
      { offense: "Excessive Late (120+ min)", penalty: "$20", action: "Overtime fee + rating impact" },
      { offense: "No Check-out", penalty: "$50", action: "Immediate contact required" },
      { offense: "Damage/Dispute", penalty: "$100+", action: "Case-by-case review" }
    ];
  };

  return (
    <div className="space-y-4">
      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Account Status</span>
            <Badge className={getStatusColor(accountStatus)}>
              <div className="flex items-center space-x-1">
                {getStatusIcon(accountStatus)}
                <span className="capitalize">{accountStatus}</span>
              </div>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span>Total Penalties:</span>
            <span className="font-medium flex items-center">
              <DollarSign className="w-4 h-4" />
              {totalPenalties}
            </span>
          </div>
          {accountStatus === "warning" && (
            <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Your account is under review. Further violations may result in suspension.
            </div>
          )}
          {accountStatus === "suspended" && (
            <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
              <Ban className="w-4 h-4 inline mr-1" />
              Your account is suspended. Contact support to appeal.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Violations */}
      {violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {violations.map((violation) => (
                <div key={violation.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    {getViolationIcon(violation.type)}
                    <div>
                      <div className="font-medium text-sm">{violation.description}</div>
                      <div className="text-xs text-gray-500">{violation.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-red-600">
                      <DollarSign className="w-3 h-3 inline" />
                      {violation.penalty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Penalty Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Penalty Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {getPenaltySchedule().map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm p-2 border rounded">
                <span>{item.offense}</span>
                <div className="text-right">
                  <div className="font-medium text-red-600">{item.penalty}</div>
                  <div className="text-xs text-gray-500">{item.action}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
