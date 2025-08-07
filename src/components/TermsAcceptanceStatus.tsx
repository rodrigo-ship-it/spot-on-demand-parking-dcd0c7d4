import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Shield } from "lucide-react";

export const TermsAcceptanceStatus = () => {
  const [open, setOpen] = useState(false);
  
  const getAcceptanceInfo = () => {
    const accepted = localStorage.getItem('termsAccepted');
    const acceptedDate = localStorage.getItem('termsAcceptedDate');
    
    if (accepted === 'true' && acceptedDate) {
      return {
        accepted: true,
        date: new Date(acceptedDate).toLocaleDateString()
      };
    }
    
    return { accepted: false, date: null };
  };

  const { accepted, date } = getAcceptanceInfo();

  const handleReviewTerms = () => {
    // Clear acceptance to show terms again
    localStorage.removeItem('termsAccepted');
    localStorage.removeItem('termsAcceptedDate');
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
          <Shield className="w-4 h-4" />
          <span>Terms Status</span>
          <Badge variant={accepted ? "default" : "destructive"} className="text-xs">
            {accepted ? "Accepted" : "Not Accepted"}
          </Badge>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Terms & Conditions Status
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium">Terms Accepted</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {date && <span>Accepted on {date}</span>}
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>You have accepted our Terms and Conditions which include:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Liability limitations and disclaimers</li>
              <li>User responsibilities and obligations</li>
              <li>Service usage guidelines</li>
              <li>Payment and fee structure</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReviewTerms}
              className="flex-1"
            >
              Review Terms Again
            </Button>
            <Button 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};