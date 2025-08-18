import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  CheckCircle,
  Search,
  Filter,
  Download,
  Settings,
  Shield,
  HelpCircle,
  BarChart3,
  Activity,
  Calendar,
  FileText,
  UserCheck,
  UserX,
  Mail,
  Edit,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import AdminRefundManager from "@/components/AdminRefundManager";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface DashboardStats {
  totalUsers: number;
  totalSpots: number;
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
  pendingDisputes: number;
  pendingRefunds: number;
  supportTickets: number;
  monthlyRevenue: number;
  weeklySignups: number;
  averageBookingValue: number;
  spotUtilization: number;
}

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
  phone?: string;
  avatar_url?: string;
}

interface ParkingSpot {
  id: string;
  title: string;
  address: string;
  price_per_hour?: number;
  daily_price?: number;
  one_time_price?: number;
  pricing_type: string;
  is_active: boolean;
  owner_id: string;
  created_at: string;
  rating: number;
  total_reviews: number;
  total_spots: number;
  available_spots: number;
  profiles?: { full_name?: string };
}

interface Booking {
  id: string;
  status: string;
  total_amount: number;
  start_time: string;
  end_time: string;
  created_at: string;
  renter_id: string;
  spot_id: string;
  parking_spots?: { title: string; address: string };
  profiles?: { full_name?: string };
}

interface Dispute {
  id: string;
  dispute_type: string;
  status: string;
  description: string;
  created_at: string;
  booking_id: string;
  reporter_id: string;
  resolution?: string;
}

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  user_id: string;
  message: string;
}

interface SecurityLog {
  id: string;
  event_type: string;
  created_at: string;
  user_id?: string;
  event_data?: any;
  ip_address?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalSpots: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeBookings: 0,
    pendingDisputes: 0,
    pendingRefunds: 0,
    supportTickets: 0,
    monthlyRevenue: 0,
    weeklySignups: 0,
    averageBookingValue: 0,
    spotUtilization: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);

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
        { data: disputesData },
        { data: refundsData },
        { data: supportTicketsData }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('parking_spots').select('*'),
        supabase.from('bookings').select('*'),
        supabase.from('disputes').select('*').eq('status', 'pending'),
        supabase.from('refunds').select('*').eq('status', 'pending'),
        supabase.from('support_tickets').select('*').eq('status', 'open')
      ]);

      const totalRevenue = bookingsData?.reduce((sum, booking) => 
        sum + Number(booking.total_amount), 0) || 0;
      
      const activeBookings = bookingsData?.filter(booking => 
        booking.status === 'active').length || 0;

      // Calculate additional stats
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const monthlyRevenue = bookingsData?.filter(booking => 
        new Date(booking.created_at) >= oneMonthAgo
      ).reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;

      const weeklySignups = profilesData?.filter(profile => 
        new Date(profile.created_at) >= oneWeekAgo
      ).length || 0;

      const averageBookingValue = bookingsData?.length ? totalRevenue / bookingsData.length : 0;
      
      const totalAvailableSpots = spotsData?.reduce((sum, spot) => sum + spot.available_spots, 0) || 0;
      const totalSpots = spotsData?.reduce((sum, spot) => sum + spot.total_spots, 0) || 0;
      const spotUtilization = totalSpots ? ((totalSpots - totalAvailableSpots) / totalSpots) * 100 : 0;

      setStats({
        totalUsers: profilesData?.length || 0,
        totalSpots: spotsData?.length || 0,
        totalBookings: bookingsData?.length || 0,
        totalRevenue,
        activeBookings,
        pendingDisputes: disputesData?.length || 0,
        pendingRefunds: refundsData?.length || 0,
        supportTickets: supportTicketsData?.length || 0,
        monthlyRevenue,
        weeklySignups,
        averageBookingValue,
        spotUtilization
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
          parking_spots(title, address)
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

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.weeklySignups} this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                ${stats.monthlyRevenue.toFixed(2)} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeBookings}</div>
              <p className="text-xs text-muted-foreground">
                of {stats.totalBookings} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Spot Utilization</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.spotUtilization.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSpots} total spots
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Booking Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.averageBookingValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                per transaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.pendingDisputes + stats.pendingRefunds + stats.supportTickets}
              </div>
              <p className="text-xs text-muted-foreground">
                Disputes, refunds & tickets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.supportTickets}</div>
              <p className="text-xs text-muted-foreground">
                Open tickets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Refunds</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.pendingRefunds}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Comprehensive Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="spots">Spots</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
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
                          <Badge variant="default">
                            Registered
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

          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle>Dispute Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No disputes to display</p>
                  <p className="text-sm">Disputes will appear here when reported</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refunds">
            <AdminRefundManager />
          </TabsContent>

          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No support tickets</p>
                  <p className="text-sm">Support requests will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Monthly Revenue:</span>
                      <span className="font-bold">${stats.monthlyRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Booking:</span>
                      <span className="font-bold">${stats.averageBookingValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spot Utilization:</span>
                      <span className="font-bold">{stats.spotUtilization.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Users:</span>
                      <span className="font-bold">{stats.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weekly Signups:</span>
                      <span className="font-bold">+{stats.weeklySignups}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Bookings:</span>
                      <span className="font-bold">{stats.activeBookings}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security & Audit Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Security monitoring active</p>
                  <p className="text-sm">System logs and security events will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}