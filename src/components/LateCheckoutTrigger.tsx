import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const LateCheckoutTrigger = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTriggerAutoClose = async () => {
    setIsProcessing(true);
    try {
      // Call the database function that triggers the edge function
      const { data, error } = await supabase.rpc('manual_check_late_checkouts');

      if (error) {
        console.error('Auto-close trigger error:', error);
        toast.error(`Failed to trigger auto-close: ${error.message}`);
      } else {
        console.log('Auto-close result:', data);
        const result = data as any;
        
        if (result?.success) {
          const processed = result.processed || 0;
          if (processed > 0) {
            toast.success(`Auto-closed ${processed} abandoned booking(s) with maximum penalties`);
          } else {
            toast.info("No bookings found that are exactly 3 hours late");
          }
        } else {
          toast.error(result?.error || 'Failed to process auto-close');
        }
      }
    } catch (error) {
      console.error('Auto-close error:', error);
      toast.error('Failed to trigger auto-close process');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>3-Hour Auto-Close System</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800">How it works:</h4>
              <ul className="text-sm text-amber-700 mt-2 space-y-1">
                <li>• Finds bookings exactly 3 hours past their end time</li>
                <li>• Auto-closes with maximum penalties: $20 + 3 hours parking charges</li>
                <li>• Two separate charges: penalty (100% platform), parking (split with owner)</li>
                <li>• Only processes each booking once at the 3-hour mark</li>
              </ul>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleTriggerAutoClose}
          disabled={isProcessing}
          className="w-full"
          variant="outline"
        >
          {isProcessing ? "Processing..." : "Trigger 3-Hour Auto-Close"}
        </Button>
      </CardContent>
    </Card>
  );
};