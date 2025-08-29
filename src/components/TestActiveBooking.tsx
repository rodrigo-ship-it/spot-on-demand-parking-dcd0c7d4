import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const TestActiveBooking = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createTestBooking = async () => {
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    setLoading(true);
    try {
      // Create test active booking
      const now = new Date();
      const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          spot_id: '79d1a816-5a2c-4cc7-8629-045b89b93faa',
          renter_id: user.id,
          start_time: now.toISOString().slice(0, -1), // Remove Z for timestamp without timezone
          end_time: endTime.toISOString().slice(0, -1),
          start_time_utc: now.toISOString(),
          end_time_utc: endTime.toISOString(),
          total_amount: 6.98,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Test active booking created! ID: ${data.id}`);
      console.log('✅ Test booking created:', data);
    } catch (error) {
      console.error('❌ Error creating test booking:', error);
      toast.error('Failed to create test booking: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTestBookings = async () => {
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('renter_id', user.id)
        .eq('spot_id', '79d1a816-5a2c-4cc7-8629-045b89b93faa')
        .eq('status', 'active');

      if (error) throw error;

      toast.success('Test bookings deleted');
      console.log('✅ Test bookings deleted');
    } catch (error) {
      console.error('❌ Error deleting test bookings:', error);
      toast.error('Failed to delete test bookings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Test Extension System</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={createTestBooking} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating...' : 'Create Test Active Booking'}
        </Button>
        <Button 
          onClick={deleteTestBookings} 
          disabled={loading}
          variant="destructive"
          className="w-full"
        >
          {loading ? 'Deleting...' : 'Delete Test Bookings'}
        </Button>
      </CardContent>
    </Card>
  );
};