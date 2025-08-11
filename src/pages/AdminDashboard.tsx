import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  MapPin, 
  CreditCard, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  Car,
  Clock,
  Eye,
  Ban,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

interface DashboardStats {
  totalUsers: number;
  totalSpots: number;
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
  pendingDisputes: number;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  email_confirmed_at?: string;
}

interface ParkingSpot {
  id: string;
  title: string;
  address: string;
  price_per_hour: number;
  is_active: boolean;
  owner_id: string;
  profiles?: { full_name?: string };
}

interface Booking {
  id: string;
  status: string;
  total_amount: number;
  start_time: string;
  end_time: string;
  parking_spots?: { title: string };
  profiles?: { full_name?: string };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalSpots: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeBookings: 0,
    pendingDisputes: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Simple admin check - replace with your actual admin email
  const isAdmin = user?.email === 'rodrigo@arrivparking.com'; // Update this to your email

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load stats
      const [
        { data: profilesData },
        { data: spotsData },
        { data: bookingsData },
        { data: disputesData }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('parking_spots').select('*'),
        supabase.from('bookings').select('*'),
        supabase.from('disputes').select('*').eq('status', 'pending')
      ]);

      const totalRevenue = bookingsData?.reduce((sum, booking) => 
        sum + Number(booking.total_amount), 0) || 0;
      
      const activeBookings = bookingsData?.filter(booking => 
        booking.status === 'active').length || 0;

      setStats({
        totalUsers: profilesData?.length || 0,
        totalSpots: spotsData?.length || 0,
        totalBookings: bookingsData?.length || 0,
        totalRevenue,
        activeBookings,
        pendingDisputes: disputesData?.length || 0
      });

      // Load detailed data - Show empty state if no data
      const { data: usersWithProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: spotsWithOwners } = await supabase
        .from('parking_spots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: bookingsWithDetails } = await supabase
        .from('bookings')
        .select(`
          *,
          parking_spots(title)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      setUsers(usersWithProfiles || []);
      setSpots(spotsWithOwners || []);
      setBookings(bookingsWithDetails || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpotStatus = async (spotId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('parking_spots')
        .update({ is_active: !currentStatus })
        .eq('id', spotId);

      if (error) throw error;

      toast.success(`Spot ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadDashboardData();
    } catch (error) {
      console.error('Error updating spot status:', error);
      toast.error('Failed to update spot status');
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your parking platform</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spots</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSpots}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Disputes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingDisputes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Recent Users</TabsTrigger>
            <TabsTrigger value="spots">Parking Spots</TabsTrigger>
            <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No users found yet</p>
                      <p className="text-sm">Users will appear here when they sign up</p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.email_confirmed_at ? "default" : "secondary"}>
                            {user.email_confirmed_at ? "Verified" : "Unverified"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spots">
            <Card>
              <CardHeader>
                <CardTitle>Parking Spots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {spots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No parking spots found yet</p>
                      <p className="text-sm">Spots will appear here when owners list them</p>
                    </div>
                  ) : (
                    spots.map((spot) => (
                      <div key={spot.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{spot.title}</p>
                          <p className="text-sm text-muted-foreground">{spot.address}</p>
                          <p className="text-xs text-muted-foreground">
                            ${spot.price_per_hour}/hr
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={spot.is_active ? "default" : "secondary"}>
                            {spot.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSpotStatus(spot.id, spot.is_active)}
                          >
                            {spot.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No bookings found yet</p>
                      <p className="text-sm">Bookings will appear here when users make reservations</p>
                    </div>
                  ) : (
                    bookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{booking.parking_spots?.title || 'Unknown Spot'}</p>
                          <p className="text-sm text-muted-foreground">
                            Booking ID: {booking.id.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(booking.start_time).toLocaleDateString()} - ${Number(booking.total_amount).toFixed(2)}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            booking.status === 'confirmed' ? 'default' :
                            booking.status === 'active' ? 'default' :
                            booking.status === 'completed' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {booking.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}