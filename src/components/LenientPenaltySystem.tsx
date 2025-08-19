import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Clock, AlertTriangle, CheckCircle, Gift, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PenaltyCredit {
  id: string;
  amount: number;
  credit_type: string;
  description: string;
  status: string;
  created_at: string;
  expires_at: string;
  forgiven_reason?: string;
}

interface LenientPenaltySystemProps {
  userId: string;
  totalCredits: number;
  recentCredits: PenaltyCredit[];
  onCreditsUpdate: () => void;
}

export const LenientPenaltySystem = ({ 
  userId,
  totalCredits, 
  recentCredits,
  onCreditsUpdate 
}: LenientPenaltySystemProps) => {
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [selectedCredit, setSelectedCredit] = useState<PenaltyCredit | null>(null);

  const getStatusBadge = () => {
    if (totalCredits === 0) return { label: "Perfect Parker", icon: Trophy, color: "bg-gradient-primary" };
    if (totalCredits <= 10) return { label: "Good Parker", icon: CheckCircle, color: "bg-green-500" };
    if (totalCredits <= 25) return { label: "Regular Parker", icon: Heart, color: "bg-yellow-500" };
    return { label: "Needs Improvement", icon: Zap, color: "bg-red-500" };
  };

  const getCreditStatus = () => {
    if (totalCredits === 0) return { message: "Perfect record! 🎉", color: "text-green-600", bgColor: "bg-green-50" };
    if (totalCredits <= 15) return { message: "Excellent standing", color: "text-blue-600", bgColor: "bg-blue-50" };
    if (totalCredits <= 35) return { message: "Good standing", color: "text-yellow-600", bgColor: "bg-yellow-50" };
    if (totalCredits <= 60) return { message: "Needs attention", color: "text-orange-600", bgColor: "bg-orange-50" };
    return { message: "Action required", color: "text-red-600", bgColor: "bg-red-50" };
  };

  const handleDispute = async () => {
    if (!selectedCredit || !disputeReason.trim()) {
      toast.error("Please provide a reason for your dispute");
      return;
    }

    try {
      // Create support ticket for dispute
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          subject: `Penalty Credit Dispute - ${selectedCredit.credit_type}`,
          message: `Disputing penalty credit of $${selectedCredit.amount}\n\nReason: ${disputeReason}\n\nCredit ID: ${selectedCredit.id}`,
          category: 'penalty_dispute',
          priority: 'medium'
        });

      if (error) throw error;

      toast.success("Dispute submitted! We'll review it within 24 hours.");
      setIsDisputeOpen(false);
      setDisputeReason("");
      setSelectedCredit(null);
    } catch (error) {
      console.error("Error submitting dispute:", error);
      toast.error("Failed to submit dispute. Please try again.");
    }
  };

  const handlePayCredits = () => {
    toast.success("Payment feature coming soon! Credits can be paid or resolved through good behavior.");
  };

  const statusBadge = getStatusBadge();
  const creditStatus = getCreditStatus();
  const IconComponent = statusBadge.icon;

  return (
    <div className="space-y-4">
      {/* Trust Score & Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Account Standing</span>
            <Badge className={`${statusBadge.color} text-white`}>
              <IconComponent className="w-3 h-3 mr-1" />
              {statusBadge.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg ${creditStatus.bgColor}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Total Credits</span>
              <span className="text-2xl font-bold text-primary">${totalCredits}</span>
            </div>
            <div className={`text-sm ${creditStatus.color}`}>
              {creditStatus.message}
            </div>
          </div>
          
          {totalCredits === 0 && (
            <Alert className="mt-3 border-green-200 bg-green-50">
              <Gift className="w-4 h-4" />
              <AlertDescription className="text-green-700">
                Perfect record! Keep up the excellent parking behavior.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Penalty Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Account Credits</span>
            <span className="text-xl font-bold text-primary">${totalCredits.toFixed(2)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalCredits === 0 ? (
            <div className="text-center py-4 text-green-600">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">No penalty credits!</p>
              <p className="text-sm text-muted-foreground">Keep up the excellent parking habits!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Credits automatically expire after 90 days or can be resolved through improved behavior.
              </div>
              
              {recentCredits.map((credit) => (
                <div key={credit.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">${credit.amount}</span>
                    <Badge variant={credit.status === 'active' ? 'destructive' : 'secondary'}>
                      {credit.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {credit.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {credit.created_at ? new Date(credit.created_at).toLocaleDateString() : 'Date unknown'}
                    {credit.expires_at && !isNaN(new Date(credit.expires_at).getTime()) && 
                      ` • Expires ${new Date(credit.expires_at).toLocaleDateString()}`}
                  </div>
                  {credit.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setSelectedCredit(credit);
                        setIsDisputeOpen(true);
                      }}
                    >
                      Dispute This Credit
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex space-x-2 mt-4">
                <Button onClick={handlePayCredits} className="flex-1">
                  Pay Credits
                </Button>
                <Button variant="outline" className="flex-1">
                  Payment Plan
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvement Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Parking Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Check out on time consistently</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm">Use photo verification when checking out</span>
          </div>
          <div className="flex items-center space-x-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-sm">Be courteous to other parkers</span>
          </div>
        </CardContent>
      </Card>

      {/* Dispute Dialog */}
      <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Penalty Credit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCredit && (
              <div className="p-3 border rounded bg-muted">
                <div className="font-medium">${selectedCredit.amount} - {selectedCredit.credit_type}</div>
                <div className="text-sm text-muted-foreground">{selectedCredit.description}</div>
              </div>
            )}
            <Textarea
              placeholder="Please explain why you believe this penalty credit should be removed..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex space-x-2">
              <Button onClick={handleDispute} className="flex-1">
                Submit Dispute
              </Button>
              <Button variant="outline" onClick={() => setIsDisputeOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};