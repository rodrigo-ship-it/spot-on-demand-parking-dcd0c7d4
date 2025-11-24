import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, PlayCircle, CheckCircle, Clock } from "lucide-react";

/**
 * BookingStatusTester - A component to test booking status transitions
 * 
 * This component helps verify that bookings transition correctly:
 * confirmed → active → completed
 * 
 * Usage: Add to any page temporarily for testing
 */
export const BookingStatusTester = () => {
  const [serverTime, setServerTime] = useState<string>("");
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string>("");

  const fetchServerTime = async () => {
    const { data, error } = await supabase.rpc('exec_sql' as any, {
      query: 'SELECT NOW() as current_time'
    });
    
    if (!error && data) {
      const time = new Date(data[0].current_time);
      setServerTime(time.toLocaleString('en-US', { 
        timeZone: 'UTC',
        dateStyle: 'short',
        timeStyle: 'medium'
      }) + ' UTC');
    }
  };

  const fetchRecentBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, status, created_at, completed_by_system')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentBookings(data);
    }
    setLoading(false);
  };

  const triggerStatusUpdate = async () => {
    setTestStatus("Triggering status update...");
    try {
      const response = await supabase.functions.invoke('update-booking-statuses', {
        body: {}
      });
      
      if (response.error) {
        setTestStatus(`Error: ${response.error.message}`);
      } else {
        setTestStatus(`Success! Updated ${response.data?.updated || 0} bookings`);
        await fetchRecentBookings();
      }
    } catch (error) {
      setTestStatus(`Error: ${error}`);
    }
  };

  useEffect(() => {
    fetchServerTime();
    fetchRecentBookings();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchServerTime();
      fetchRecentBookings();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-blue-600';
      case 'active': return 'text-green-600';
      case 'completed': return 'text-gray-600';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <Clock className="w-4 h-4" />;
      case 'active': return <PlayCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Booking Status Transition Tester</span>
          <Button
            onClick={() => {
              fetchServerTime();
              fetchRecentBookings();
            }}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Server Time */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="text-sm font-medium text-slate-600">Current Server Time</div>
          <div className="text-2xl font-bold text-slate-900">{serverTime || "Loading..."}</div>
        </div>

        {/* Trigger Status Update */}
        <div className="space-y-2">
          <Button 
            onClick={triggerStatusUpdate} 
            className="w-full"
            variant="default"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Trigger Status Update Now
          </Button>
          {testStatus && (
            <div className="text-sm text-center text-slate-600">{testStatus}</div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Recent Bookings</h3>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : recentBookings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No bookings found</div>
          ) : (
            <div className="space-y-2">
              {recentBookings.map((booking) => (
                <div 
                  key={booking.id}
                  className="p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 font-semibold ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        {booking.status.toUpperCase()}
                      </span>
                      {booking.completed_by_system && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                          System Completed
                        </span>
                      )}
                    </div>
                    <code className="text-xs text-slate-500">
                      {booking.id.slice(0, 8)}
                    </code>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500">Start Time</div>
                      <div className="font-mono">{booking.start_time}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">End Time</div>
                      <div className="font-mono">{booking.end_time}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Created: {formatTime(booking.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Testing Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Testing Instructions</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Create a booking with start time 2-3 minutes in the future</li>
            <li>Check that it appears above with status "CONFIRMED"</li>
            <li>Wait for the start time to arrive</li>
            <li>Click "Trigger Status Update Now"</li>
            <li>Status should change to "ACTIVE"</li>
            <li>Wait for end time + 15 minutes grace period</li>
            <li>Click "Trigger Status Update Now" again</li>
            <li>Status should change to "COMPLETED" without system flag</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
