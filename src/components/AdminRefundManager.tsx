import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RefundRequest {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function AdminRefundManager() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      // First fetch refunds
      const { data: refundsData, error: refundsError } = await supabase
        .from("refunds")
        .select("*")
        .order("created_at", { ascending: false });

      if (refundsError) throw refundsError;

      // Then fetch profile data for each refund
      const refundsWithProfiles = await Promise.all(
        (refundsData || []).map(async (refund) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", refund.user_id)
            .maybeSingle();

          return {
            ...refund,
            profiles: profileData || { full_name: "Unknown User", email: "unknown@example.com" }
          };
        })
      );

      setRefunds(refundsWithProfiles);
    } catch (error: any) {
      toast({
        title: "Error Loading Refunds",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRefundStatus = async (refundId: string, status: string) => {
    setProcessingId(refundId);
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (adminNotes[refundId]) {
        updateData.admin_notes = adminNotes[refundId];
      }

      if (status === "approved" || status === "denied") {
        updateData.processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("refunds" as any)
        .update(updateData)
        .eq("id", refundId);

      if (error) throw error;

      await fetchRefunds();
      toast({
        title: "Refund Updated",
        description: `Refund request has been ${status}.`
      });
    } catch (error: any) {
      toast({
        title: "Error Updating Refund",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "default";
      case "approved": return "secondary";
      case "denied": return "destructive";
      case "processed": return "outline";
      default: return "default";
    }
  };

  if (loading) {
    return <div>Loading refund requests...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Refund Management</h2>
      
      {refunds.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No refund requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {refunds.map((refund) => (
            <Card key={refund.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      ${Number(refund.amount).toFixed(2)} Refund Request
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {refund.profiles.full_name} ({refund.profiles.email})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {new Date(refund.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(refund.status)}>
                    {refund.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="font-semibold">Reason:</Label>
                  <p className="text-sm mt-1">{refund.reason}</p>
                </div>

                {refund.admin_notes && (
                  <div>
                    <Label className="font-semibold">Admin Notes:</Label>
                    <p className="text-sm mt-1">{refund.admin_notes}</p>
                  </div>
                )}

                {refund.status === "pending" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`notes-${refund.id}`}>Admin Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${refund.id}`}
                        value={adminNotes[refund.id] || ""}
                        onChange={(e) => setAdminNotes(prev => ({
                          ...prev,
                          [refund.id]: e.target.value
                        }))}
                        placeholder="Add any notes about this refund decision..."
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateRefundStatus(refund.id, "approved")}
                        disabled={processingId === refund.id}
                        size="sm"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => updateRefundStatus(refund.id, "denied")}
                        disabled={processingId === refund.id}
                        size="sm"
                      >
                        Deny
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}