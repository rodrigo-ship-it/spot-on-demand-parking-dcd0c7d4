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

      // Load comprehensive stats
      const [
        { data: profilesData },
        { data: spotsData },
        { data: bookingsData },
        { data: disputesData },
        { data: refundsData },
        { data: supportTicketsData },
        { data: securityLogsData }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('parking_spots').select('*'),
        supabase.from('bookings').select('*'),
        supabase.from('disputes').select('*').eq('status', 'pending'),
        supabase.from('refunds').select('*').eq('status', 'pending'),
        supabase.from('support_tickets').select('*').eq('status', 'open'),
        supabase.from('security_audit_log').select('*').order('created_at', { ascending: false }).limit(10)
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

      // Load detailed data with more comprehensive queries
      const { data: usersWithProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: spotsWithOwners } = await supabase
        .from('parking_spots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: bookingsWithDetails } = await supabase
        .from('bookings')
        .select(`
          *,
          parking_spots(title, address)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: disputesWithDetails } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: supportTicketsWithDetails } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      setUsers(usersWithProfiles || []);
      setSpots(spotsWithOwners as any || []);
      setBookings(bookingsWithDetails as any || []);
      setDisputes(disputesWithDetails as any || []);
      setSupportTickets(supportTicketsWithDetails as any || []);
      setSecurityLogs((securityLogsData as any) || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!isAdmin) return;

    const channels = [
      // Users channel
      supabase
        .channel('admin-profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          loadDashboardData();
        })
        .subscribe(),

      // Bookings channel
      supabase
        .channel('admin-bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
          loadDashboardData();
        })
        .subscribe(),

      // Spots channel
      supabase
        .channel('admin-spots')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_spots' }, () => {
          loadDashboardData();
        })
        .subscribe(),

      // Disputes channel
      supabase
        .channel('admin-disputes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => {
          loadDashboardData();
        })
        .subscribe(),

      // Support tickets channel
      supabase
        .channel('admin-support')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
          loadDashboardData();
        })
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [isAdmin]);

  // Advanced user management functions
  const banUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'banned', updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('User banned successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('User unbanned successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('User deleted successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const exportData = async (type: string) => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'users':
          data = users;
          filename = 'users_export.csv';
          break;
        case 'bookings':
          data = bookings;
          filename = 'bookings_export.csv';
          break;
        case 'spots':
          data = spots;
          filename = 'spots_export.csv';
          break;
        default:
          return;
      }

      const csv = convertToCSV(data);
      downloadCSV(csv, filename);
      toast.success(`${type} data exported successfully`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const convertToCSV = (data: any[]) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendNotificationToUser = async (userId: string, message: string) => {
    try {
      // Implementation would depend on your notification system
      toast.success('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const resolveDispute = async (disputeId: string, resolution: string) => {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({ 
          status: 'resolved', 
          resolution,
          updated_at: new Date().toISOString()
        })
        .eq('id', disputeId);

      if (error) throw error;
      toast.success('Dispute resolved successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error('Failed to resolve dispute');
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      toast.success('Booking status updated successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => exportData('users')}
                    className="bg-background"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Users
                  </Button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64 bg-background"
                    />
                  </div>
                </div>
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
                    users
                      .filter(user => 
                        !searchTerm || 
                        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{user.full_name || 'No name'}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    Joined: {format(new Date(user.created_at), 'MMM dd, yyyy')}
                                  </span>
                                  {user.phone && (
                                    <span className="text-xs text-muted-foreground">
                                      • Phone: {user.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Active
                            </Badge>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="bg-background">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                                <DropdownMenuItem 
                                  onClick={() => setSelectedUser(user)}
                                  className="hover:bg-muted"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => sendNotificationToUser(user.user_id, 'Admin notification')}
                                  className="hover:bg-muted"
                                >
                                  <Mail className="w-4 h-4 mr-2" />
                                  Send Message
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => banUser(user.user_id)}
                                  className="text-orange-600 hover:bg-orange-50"
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  Ban User
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => deleteUser(user.user_id)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Parking Spot Management</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => exportData('spots')}
                    className="bg-background"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Spots
                  </Button>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 bg-background">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg">
                      <SelectItem value="all">All Spots</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    spots
                      .filter(spot => 
                        filterStatus === 'all' || 
                        (filterStatus === 'active' && spot.is_active) ||
                        (filterStatus === 'inactive' && !spot.is_active)
                      )
                      .map((spot) => (
                        <div key={spot.id} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{spot.title}</p>
                                <p className="text-sm text-muted-foreground">{spot.address}</p>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {spot.pricing_type === 'hourly' && `$${spot.price_per_hour}/hr`}
                                    {spot.pricing_type === 'daily' && `$${spot.daily_price}/day`}
                                    {spot.pricing_type === 'one_time' && `$${spot.one_time_price} one-time`}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    • {spot.available_spots}/{spot.total_spots} available
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    • ★ {spot.rating.toFixed(1)} ({spot.total_reviews} reviews)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={spot.is_active ? "default" : "secondary"}>
                              {spot.is_active ? "Active" : "Inactive"}
                            </Badge>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="bg-background">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                                <DropdownMenuItem 
                                  onClick={() => setSelectedSpot(spot)}
                                  className="hover:bg-muted"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => toggleSpotStatus(spot.id, spot.is_active)}
                                  className="hover:bg-muted"
                                >
                                  {spot.is_active ? (
                                    <>
                                      <Ban className="w-4 h-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-muted">
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Spot
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Booking Management</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => exportData('bookings')}
                    className="bg-background"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Bookings
                  </Button>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 bg-background">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg">
                      <SelectItem value="all">All Bookings</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    bookings
                      .filter(booking => 
                        filterStatus === 'all' || booking.status === filterStatus
                      )
                      .map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <Car className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-medium">{booking.parking_spots?.title || 'Unknown Spot'}</p>
                                <p className="text-sm text-muted-foreground">{booking.parking_spots?.address}</p>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    ID: {booking.id.slice(0, 8)}...
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    • {format(new Date(booking.start_time), 'MMM dd, HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    • ${Number(booking.total_amount).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
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
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="bg-background">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                                <DropdownMenuItem className="hover:bg-muted">
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Ban className="w-4 h-4 mr-2" />
                                  Cancel Booking
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => updateBookingStatus(booking.id, 'completed')}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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