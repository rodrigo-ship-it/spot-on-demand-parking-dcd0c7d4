import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, DollarSign, PlayCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const LateChargeTestSystem = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<any>(null);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      console.log('Triggering manual late checkout check...');
      
      const { data, error } = await supabase.functions.invoke('check-late-checkouts', {
        body: {
          timestamp: new Date().toISOString(),
          source: 'manual_test'
        }
      });

      if (error) {
        console.error('Error checking late checkouts:', error);
        toast.error(`Error: ${error.message}`);
      } else {
        console.log('Late checkout check result:', data);
        setLastCheckResult(data);
        
        if (data.success) {
          toast.success(`✅ Check completed! Processed ${data.processed} late bookings out of ${data.totalFound} found.`);
        } else {
          toast.error(`❌ Check failed: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to check late checkouts');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDatabaseCheck = async () => {
    try {
      console.log('Calling database function...');
      
      const { data, error } = await supabase.rpc('manual_check_late_checkouts');

      if (error) {
        console.error('Database function error:', error);
        toast.error(`Database error: ${error.message}`);
      } else {
        console.log('Database function result:', data);
        toast.success('Database function called successfully!');
      }
    } catch (error) {
      console.error('Error calling database function:', error);
      toast.error('Failed to call database function');
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Late Charge Test System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          This system helps test the automatic late charge functionality. It checks for bookings that have exceeded their end time and applies penalties according to the lenient penalty system.
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm">Grace Period: 30 minutes (No charge)</span>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-yellow-600" />
            <span className="text-sm">30-60 min late: $8 (first offense: $6.40)</span>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-orange-600" />
            <span className="text-sm">1-2 hours late: $12 (first offense: $9.60)</span>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-red-600" />
            <span className="text-sm">2+ hours late: $20 (first offense: $16)</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleManualCheck}
            disabled={isChecking}
            variant="outline"
            size="sm"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            {isChecking ? "Checking..." : "Manual Check"}
          </Button>
          
          <Button 
            onClick={handleDatabaseCheck}
            variant="outline"
            size="sm"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            DB Function Test
          </Button>
        </div>

        {lastCheckResult && (
          <div className="mt-4 p-3 bg-white rounded-lg border">
            <div className="text-sm font-medium mb-2">Last Check Result:</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={lastCheckResult.success ? "default" : "destructive"}>
                  {lastCheckResult.success ? "Success" : "Failed"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Bookings Found:</span>
                <span>{lastCheckResult.totalFound || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Processed:</span>
                <span>{lastCheckResult.processed || 0}</span>
              </div>
              {lastCheckResult.message && (
                <div className="mt-2 text-gray-600">
                  {lastCheckResult.message}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <div className="font-medium">Automatic System:</div>
          <div>• Checks every 10 minutes via cron job</div>
          <div>• Automatically charges penalties ≥ $5</div>
          <div>• Creates penalty credits for amounts &lt; $5</div>
          <div>• Marks bookings as completed to prevent reprocessing</div>
        </div>
      </CardContent>
    </Card>
  );
};