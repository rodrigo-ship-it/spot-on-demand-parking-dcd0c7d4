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
  MoreHorizontal,
  Home
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import AdminRefundManager from "@/components/AdminRefundManager";
import { AdminVerificationReview } from "@/components/AdminVerificationReview";
import { SecurityMonitoringDashboard } from "@/components/SecurityMonitoringDashboard";
import { format, subDays, subMonths, subWeeks, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface DashboardStats {
  totalUsers: number;
  totalSpots: number;
  totalBookings: number;
  totalRevenue: number;
  platformRevenue: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
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
  description?: string;
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
  images?: string[];
  amenities?: string[];
  profiles?: { full_name?: string };
}

interface Booking {
  id: string;
  status: string;
  total_amount: number;
  platform_fee_amount?: number;
  owner_payout_amount?: number;
  payment_intent_id?: string;
  start_time: string;
  end_time: string;
  created_at: string;
  renter_id: string;
  spot_id: string;
  parking_spots?: { title: string; address: string };
  renter_profile?: { full_name?: string; email?: string };
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
    platformRevenue: 0,
    activeBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
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
  const [activeBookingsList, setActiveBookingsList] = useState<Booking[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [spotSearchTerm, setSpotSearchTerm] = useState("");
  const [spotFilterStatus, setSpotFilterStatus] = useState("all");
  const [bookingFilterStatus, setBookingFilterStatus] = useState("all");
  const [reservationPeriod, setReservationPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [userOwnedSpots, setUserOwnedSpots] = useState<ParkingSpot[]>([]);

  // Simple admin check - replace with your actual admin email
  const isAdmin = user?.email === 'rodrigo@arrivparking.com';

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

      // Only count completed and active bookings for revenue (not cancelled/pending)
      const validBookings = bookingsData?.filter(booking => 
        ['completed', 'active', 'confirmed'].includes(booking.status)
      ) || [];
      
      const totalRevenue = validBookings.reduce((sum, booking) => 
        sum + Number(booking.total_amount), 0);
      
      // Platform revenue is the sum of platform fees
      const platformRevenue = validBookings.reduce((sum, booking) => 
        sum + Number(booking.platform_fee_amount || 0), 0);
      
      const activeBookings = bookingsData?.filter(booking => 
        booking.status === 'active').length || 0;
      
      const completedBookings = bookingsData?.filter(booking => 
        booking.status === 'completed').length || 0;
      
      const cancelledBookings = bookingsData?.filter(booking => 
        booking.status === 'cancelled').length || 0;
      
      const pendingBookings = bookingsData?.filter(booking => 
        ['pending', 'confirmed'].includes(booking.status)).length || 0;

      // Calculate additional stats
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Monthly revenue only from valid bookings
      const monthlyRevenue = validBookings.filter(booking => 
        new Date(booking.created_at) >= oneMonthAgo
      ).reduce((sum, booking) => sum + Number(booking.total_amount), 0);

      const weeklySignups = profilesData?.filter(profile => 
        new Date(profile.created_at) >= oneWeekAgo
      ).length || 0;

      const averageBookingValue = validBookings.length ? totalRevenue / validBookings.length : 0;
      
      const totalAvailableSpots = spotsData?.reduce((sum, spot) => sum + spot.available_spots, 0) || 0;
      const totalSpots = spotsData?.reduce((sum, spot) => sum + spot.total_spots, 0) || 0;
      const spotUtilization = totalSpots ? ((totalSpots - totalAvailableSpots) / totalSpots) * 100 : 0;

      setStats({
        totalUsers: profilesData?.length || 0,
        totalSpots: spotsData?.length || 0,
        totalBookings: bookingsData?.length || 0,
        totalRevenue,
        platformRevenue,
        activeBookings,
        completedBookings,
        cancelledBookings,
        pendingBookings,
        pendingDisputes: disputesData?.length || 0,
        pendingRefunds: refundsData?.length || 0,
        supportTickets: supportTicketsData?.length || 0,
        monthlyRevenue,
        weeklySignups,
        averageBookingValue,
        spotUtilization
      });

      // Load detailed data with increased limits and better queries
      const { data: usersWithProfiles, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        // Removed limit to show ALL users
        
      if (usersError) {
        console.error('Error fetching users:', usersError);
      } else {
        console.log('Fetched users count:', usersWithProfiles?.length);
        console.log('Latest users:', usersWithProfiles?.slice(0, 3));
      }

      const { data: spotsWithOwners } = await supabase
        .from('parking_spots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Get all bookings with details (increased limit for better overview)
      const { data: bookingsWithDetails } = await supabase
        .from('bookings')
        .select(`
          *,
          parking_spots(title, address)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      // Fetch renter profiles for bookings
      const renterIds = [...new Set(bookingsWithDetails?.map(b => b.renter_id) || [])];
      const { data: renterProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', renterIds);

      // Map renter profiles to bookings
      const bookingsWithRenters = bookingsWithDetails?.map(booking => ({
        ...booking,
        renter_profile: renterProfiles?.find(p => p.user_id === booking.renter_id)
      })) || [];

      // Get active bookings separately for the monitoring card
      const activeBookingsData = bookingsWithRenters.filter(b => b.status === 'active');

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
      setBookings(bookingsWithRenters as any || []);
      setActiveBookingsList(activeBookingsData as any || []);
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
      // Note: Since we can't add a status column directly, we'll use a workaround
      // In a real implementation, you'd need a user_status table or add a status column
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: `[BANNED] ${users.find(u => u.user_id === userId)?.full_name || 'User'}`,
          updated_at: new Date().toISOString() 
        })
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
      const user = users.find(u => u.user_id === userId);
      const cleanName = user?.full_name?.replace('[BANNED] ', '') || 'User';
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: cleanName,
          updated_at: new Date().toISOString() 
        })
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
          data = users.map(user => ({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            created_at: user.created_at,
            updated_at: user.updated_at
          }));
          filename = `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        case 'bookings':
          data = bookings.map(booking => ({
            id: booking.id,
            status: booking.status,
            total_amount: booking.total_amount,
            start_time: booking.start_time,
            end_time: booking.end_time,
            created_at: booking.created_at,
            spot_title: booking.parking_spots?.title,
            spot_address: booking.parking_spots?.address
          }));
          filename = `bookings_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        case 'spots':
          data = spots.map(spot => ({
            id: spot.id,
            title: spot.title,
            address: spot.address,
            pricing_type: spot.pricing_type,
            price_per_hour: spot.price_per_hour,
            daily_price: spot.daily_price,
            one_time_price: spot.one_time_price,
            is_active: spot.is_active,
            total_spots: spot.total_spots,
            available_spots: spot.available_spots,
            rating: spot.rating,
            total_reviews: spot.total_reviews,
            created_at: spot.created_at
          }));
          filename = `spots_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        default:
          throw new Error('Invalid export type');
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
      Object.values(item).map(value => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
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
    URL.revokeObjectURL(url);
  };

  const sendNotificationToUser = async (userId: string, message: string) => {
    try {
      // Create a support ticket as a notification system
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          subject: 'Admin Notification',
          message: message,
          category: 'admin_notification',
          priority: 'high',
          status: 'open'
        });

      if (error) throw error;
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

  const resolveSupportTicket = async (ticketId: string, resolution: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Support ticket resolved successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error resolving support ticket:', error);
      toast.error('Failed to resolve support ticket');
    }
  };

  // Function to fetch spots owned by a specific user
  const fetchUserOwnedSpots = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserOwnedSpots(data || []);
    } catch (error) {
      console.error('Error fetching user owned spots:', error);
      setUserOwnedSpots([]);
    }
  };

  const editSpot = async (spotId: string, updates: Partial<ParkingSpot>) => {
    try {
      const { error } = await supabase
        .from('parking_spots')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', spotId);

      if (error) throw error;
      toast.success('Spot updated successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error updating spot:', error);
      toast.error('Failed to update spot');
    }
  };

  const deleteSpot = async (spotId: string) => {
    if (!confirm('Are you sure you want to delete this parking spot? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('parking_spots')
        .delete()
        .eq('id', spotId);

      if (error) throw error;
      toast.success('Parking spot deleted successfully');
      
      // Remove the spot from userOwnedSpots state
      setUserOwnedSpots(prev => prev.filter(spot => spot.id !== spotId));
      loadDashboardData();
    } catch (error) {
      console.error('Error deleting spot:', error);
      toast.error('Failed to delete parking spot');
    }
  };

  // Function to check for missing users and sync data
  const syncUserData = async () => {
    try {
      toast.info('Running detailed user ID analysis...');
      
      // Get all parking spot owners with detailed info
      const { data: allSpots, error: spotsError } = await supabase
        .from('parking_spots')
        .select('id, title, owner_id, created_at')
        .order('created_at', { ascending: false });

      if (spotsError) {
        console.error('Error fetching spots:', spotsError);
        toast.error('Failed to fetch parking spots');
        return;
      }

      // Get all existing profiles with detailed info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast.error('Failed to fetch user profiles');
        return;
      }

      console.log('=== DETAILED USER ID ANALYSIS ===');
      console.log('Raw spot data:', allSpots);
      console.log('Raw profile data:', profiles);

      // Get unique owner IDs and their spot details
      const spotOwnerDetails = allSpots?.reduce((acc, spot) => {
        if (!acc[spot.owner_id]) {
          acc[spot.owner_id] = {
            ownerId: spot.owner_id,
            spots: []
          };
        }
        acc[spot.owner_id].spots.push({
          id: spot.id,
          title: spot.title,
          created_at: spot.created_at
        });
        return acc;
      }, {} as Record<string, { ownerId: string; spots: any[] }>) || {};

      const uniqueOwnerIds = Object.keys(spotOwnerDetails);
      const existingProfileUserIds = profiles?.map(p => p.user_id) || [];

      console.log('\n=== ID COMPARISON ===');
      console.log('Spot owner IDs:', uniqueOwnerIds);
      console.log('Profile user IDs:', existingProfileUserIds);

      // Check for exact matches vs. partial matches
      const exactMatches = uniqueOwnerIds.filter(ownerId => 
        existingProfileUserIds.includes(ownerId)
      );
      const missingProfiles = uniqueOwnerIds.filter(ownerId => 
        !existingProfileUserIds.includes(ownerId)
      );

      console.log('Exact matches:', exactMatches);
      console.log('Missing profiles:', missingProfiles);

      // Check for potential ID format issues
      console.log('\n=== ID FORMAT ANALYSIS ===');
      uniqueOwnerIds.forEach(ownerId => {
        console.log(`Spot owner ID: "${ownerId}" (length: ${ownerId.length}, type: ${typeof ownerId})`);
      });
      existingProfileUserIds.forEach(userId => {
        console.log(`Profile user ID: "${userId}" (length: ${userId.length}, type: ${typeof userId})`);
      });

      // Show detailed results
      console.log('\n=== DETAILED BREAKDOWN ===');
      Object.values(spotOwnerDetails).forEach(owner => {
        console.log(`\nOwner ID: "${owner.ownerId}"`);
        console.log(`  Spots owned: ${owner.spots.length}`);
        owner.spots.forEach(spot => {
          console.log(`    - ${spot.title} (created: ${new Date(spot.created_at).toLocaleDateString()})`);
        });
        
        const hasProfile = existingProfileUserIds.includes(owner.ownerId);
        console.log(`  Has Profile: ${hasProfile ? 'YES' : 'NO'}`);
        
        if (hasProfile) {
          const profile = profiles?.find(p => p.user_id === owner.ownerId);
          console.log(`    Profile details: ${profile?.full_name} (${profile?.email})`);
          console.log(`    Profile created: ${new Date(profile?.created_at || '').toLocaleDateString()}`);
        } else {
          console.log(`    ❌ MISSING PROFILE FOR SPOT OWNER!`);
          // Check for similar IDs (in case of formatting issues)
          const similarIds = existingProfileUserIds.filter(pid => 
            pid.toLowerCase().includes(owner.ownerId.toLowerCase().slice(0, 8)) ||
            owner.ownerId.toLowerCase().includes(pid.toLowerCase().slice(0, 8))
          );
          if (similarIds.length > 0) {
            console.log(`    Possible similar profile IDs: ${similarIds.join(', ')}`);
          }
        }
      });

      // Create detailed alert
      const alertMessage = `
🔍 DETAILED USER ID ANALYSIS:

Total Profiles: ${profiles?.length || 0}
Total Spot Owners: ${uniqueOwnerIds.length}
Exact Matches: ${exactMatches.length}
Missing Profiles: ${missingProfiles.length}

📋 SPOT OWNERS:
${Object.values(spotOwnerDetails).map(owner => {
  const hasProfile = existingProfileUserIds.includes(owner.ownerId);
  const profile = profiles?.find(p => p.user_id === owner.ownerId);
  return `• ID: ${owner.ownerId.slice(0, 12)}...
  Spots: ${owner.spots.length}
  Profile: ${hasProfile ? `✅ ${profile?.email}` : '❌ MISSING'}`;
}).join('\n\n')}

${missingProfiles.length > 0 ? 
  `\n🚨 MISSING PROFILES:\n${missingProfiles.map(id => `• ${id}`).join('\n')}

This is a DATA INTEGRITY ISSUE - users who own spots should ALWAYS have profiles!` : 
  '\n✅ All spot owners have profiles!'
}

Check browser console for detailed ID analysis.
      `;

      alert(alertMessage);

      if (missingProfiles.length > 0) {
        const shouldCreate = confirm(`CRITICAL: ${missingProfiles.length} spot owners have no profiles!\n\nThis is a data integrity issue. Would you like to automatically create the missing profiles now?`);
        
        if (shouldCreate) {
          await createMissingProfiles(missingProfiles);
        } else {
          toast.error(`CRITICAL: ${missingProfiles.length} spot owners have no profiles! This shouldn't be possible.`);
        }
      } else {
        toast.success('All spot owners have profiles - data is consistent!');
      }

      // Reload dashboard data
      await loadDashboardData();
      
    } catch (error) {
      console.error('Error in user ID analysis:', error);
      toast.error('Failed to analyze user data');
    }
  };

  const createMissingProfiles = async (userIds: string[]) => {
    try {
      console.log('Creating missing profiles for users:', userIds);
      
      for (const userId of userIds) {
        console.log(`Attempting to create profile for user ID: "${userId}"`);
        
        // Create profile with minimal information - the user can update it later
        const { data: insertedProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            email: 'unknown@example.com', // Placeholder - user can update
            full_name: 'Spot Owner (Auto-created)'      // Placeholder - user can update
          })
          .select();

        if (profileError) {
          console.error(`Failed to create profile for ${userId}:`, profileError);
        } else {
          console.log(`✅ Created profile for user ${userId}:`, insertedProfile);
        }
      }
      
      toast.success(`Created ${userIds.length} missing profiles with placeholder data`);
      
      // Refresh the data
      await loadDashboardData();
      
    } catch (error) {
      console.error('Error creating missing profiles:', error);
      toast.error('Failed to create missing profiles');
    }
  };

  // Function to check for orphaned data across the system
  const checkDataIntegrity = async () => {
    try {
      toast.info('Running data integrity check...');
      
      // Check for bookings without valid users or spots
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('renter_id, spot_id');

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id');

      const { data: allSpots } = await supabase
        .from('parking_spots')
        .select('id, owner_id');

      const profileUserIds = allProfiles?.map(p => p.user_id) || [];
      const spotIds = allSpots?.map(s => s.id) || [];
      const spotOwnerIds = allSpots?.map(s => s.owner_id) || [];

      // Find issues
      const orphanedBookings = allBookings?.filter(booking => 
        !profileUserIds.includes(booking.renter_id) || !spotIds.includes(booking.spot_id)
      ) || [];

      const missingSpotOwnerProfiles = [...new Set(spotOwnerIds)].filter(ownerId => 
        !profileUserIds.includes(ownerId)
      );

      console.log('Data Integrity Report:');
      console.log('- Orphaned bookings:', orphanedBookings.length);
      console.log('- Spot owners without profiles:', missingSpotOwnerProfiles);
      console.log('- Total profiles:', profileUserIds.length);
      console.log('- Total spots:', spotIds.length);
      console.log('- Total bookings:', allBookings?.length || 0);

      if (orphanedBookings.length > 0 || missingSpotOwnerProfiles.length > 0) {
        const issues = [];
        if (orphanedBookings.length > 0) issues.push(`${orphanedBookings.length} orphaned bookings`);
        if (missingSpotOwnerProfiles.length > 0) issues.push(`${missingSpotOwnerProfiles.length} spot owners without profiles`);
        
        toast.error(`Data integrity issues found: ${issues.join(', ')}`);
        
        alert(`DATA INTEGRITY ISSUES DETECTED:\n\n${issues.join('\n')}\n\nMissing spot owner profiles:\n${missingSpotOwnerProfiles.join('\n')}\n\nCheck console for full details.`);
      } else {
        toast.success('Data integrity check passed!');
      }

    } catch (error) {
      console.error('Error checking data integrity:', error);
      toast.error('Failed to check data integrity');
    }
  };

  // Function to create profile for missing spot owner
  const createProfileForSpotOwner = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          email: `missing-user-${userId.slice(0, 8)}@placeholder.com`,
          full_name: `Spot Owner (${userId.slice(0, 8)})`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Created missing profile for spot owner');
      loadDashboardData();
    } catch (error) {
      console.error('Error creating profile for spot owner:', error);
      toast.error('Failed to create profile');
    }
  };

  // Function to create missing profile for a user (if needed)
  const createMissingProfile = async (userIdParam: string, email: string, fullName?: string) => {
    try {
      // This would be called if we detect a user without a profile
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: userIdParam,
          email: email,
          full_name: fullName || 'Unknown User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Profile created successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage your parking platform</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'} 
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
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
              <CardTitle className="text-sm font-medium">Gross Bookings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Platform: <span className="font-semibold text-green-600">${stats.platformRevenue.toFixed(2)}</span>
              </p>
            </CardContent>
          </Card>

          <Card className={stats.activeBookings > 0 ? "border-green-500 border-2" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Active Bookings
                {stats.activeBookings > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeBookings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedBookings} completed • {stats.cancelledBookings} cancelled
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

        {/* Active Bookings Monitoring Section */}
        {activeBookingsList.length > 0 && (
          <Card className="mb-8 border-green-500 border-2 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Live Active Bookings ({activeBookingsList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeBookingsList.map((booking) => {
                  const endTime = new Date(booking.end_time);
                  const now = new Date();
                  const minutesRemaining = Math.round((endTime.getTime() - now.getTime()) / (1000 * 60));
                  const isOverdue = minutesRemaining < 0;
                  
                  return (
                    <div 
                      key={booking.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isOverdue 
                          ? 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800' 
                          : 'bg-background border-green-200 dark:border-green-800'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isOverdue ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          <Car className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-green-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{booking.parking_spots?.title || 'Unknown Spot'}</p>
                          <p className="text-sm text-muted-foreground">
                            Renter: {booking.renter_profile?.full_name || booking.renter_profile?.email || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(booking.start_time), 'MMM dd, HH:mm')} - {format(endTime, 'HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                            {isOverdue 
                              ? `${Math.abs(minutesRemaining)} min overdue` 
                              : `${minutesRemaining} min remaining`
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${Number(booking.total_amount).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            className="bg-background"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="bg-background text-red-600"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comprehensive Admin Tabs */}
        <Tabs defaultValue="reservations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="spots">Spots</TabsTrigger>
            <TabsTrigger value="bookings">All Bookings</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Reservations Tab - Time-based booking analytics */}
          <TabsContent value="reservations">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Reservations Overview
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      View and analyze booking data by time period
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant={reservationPeriod === 'day' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setReservationPeriod('day')}
                    >
                      Today
                    </Button>
                    <Button 
                      variant={reservationPeriod === 'week' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setReservationPeriod('week')}
                    >
                      This Week
                    </Button>
                    <Button 
                      variant={reservationPeriod === 'month' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setReservationPeriod('month')}
                    >
                      This Month
                    </Button>
                    <Button 
                      variant={reservationPeriod === 'year' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setReservationPeriod('year')}
                    >
                      This Year
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const now = new Date();
                  let periodStart: Date;
                  let periodEnd: Date;
                  let periodLabel: string;
                  
                  switch (reservationPeriod) {
                    case 'day':
                      periodStart = startOfDay(now);
                      periodEnd = endOfDay(now);
                      periodLabel = 'Today';
                      break;
                    case 'week':
                      periodStart = startOfWeek(now, { weekStartsOn: 0 });
                      periodEnd = endOfWeek(now, { weekStartsOn: 0 });
                      periodLabel = 'This Week';
                      break;
                    case 'month':
                      periodStart = startOfMonth(now);
                      periodEnd = endOfMonth(now);
                      periodLabel = 'This Month';
                      break;
                    case 'year':
                      periodStart = startOfYear(now);
                      periodEnd = endOfYear(now);
                      periodLabel = 'This Year';
                      break;
                  }
                  
                  const periodBookings = bookings.filter(booking => {
                    const bookingDate = new Date(booking.created_at);
                    return bookingDate >= periodStart && bookingDate <= periodEnd;
                  });
                  
                  const periodRevenue = periodBookings
                    .filter(b => ['completed', 'active', 'confirmed'].includes(b.status))
                    .reduce((sum, b) => sum + Number(b.total_amount), 0);
                  
                  const periodPlatformFees = periodBookings
                    .filter(b => ['completed', 'active', 'confirmed'].includes(b.status))
                    .reduce((sum, b) => sum + Number(b.platform_fee_amount || 0), 0);
                  
                  const periodCompleted = periodBookings.filter(b => b.status === 'completed').length;
                  const periodActive = periodBookings.filter(b => b.status === 'active').length;
                  const periodCancelled = periodBookings.filter(b => b.status === 'cancelled').length;
                  const periodPending = periodBookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length;
                  
                  return (
                    <>
                      {/* Period Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-600 dark:text-blue-400">Total Bookings</p>
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{periodBookings.length}</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm text-green-600 dark:text-green-400">Gross Revenue</p>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-300">${periodRevenue.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                          <p className="text-sm text-amber-600 dark:text-amber-400">Platform Fees</p>
                          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">${periodPlatformFees.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                          <p className="text-sm text-purple-600 dark:text-purple-400">Avg Booking</p>
                          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                            ${periodBookings.length > 0 ? (periodRevenue / periodBookings.length).toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Status Breakdown */}
                      <div className="grid grid-cols-4 gap-2 mb-6">
                        <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <p className="text-lg font-bold text-green-700 dark:text-green-400">{periodCompleted}</p>
                          <p className="text-xs text-green-600 dark:text-green-500">Completed</p>
                        </div>
                        <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{periodActive}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-500">Active</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                          <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{periodPending}</p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-500">Pending</p>
                        </div>
                        <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                          <p className="text-lg font-bold text-red-700 dark:text-red-400">{periodCancelled}</p>
                          <p className="text-xs text-red-600 dark:text-red-500">Cancelled</p>
                        </div>
                      </div>
                      
                      {/* Period Bookings List */}
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">{periodLabel} Bookings ({periodBookings.length})</h4>
                        {periodBookings.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No bookings for {periodLabel.toLowerCase()}</p>
                          </div>
                        ) : (
                          periodBookings.map((booking) => (
                            <div key={booking.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                              booking.status === 'active' 
                                ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20' 
                                : booking.status === 'cancelled'
                                  ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20'
                                  : 'bg-background/50'
                            }`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  booking.status === 'active' ? 'bg-green-100' :
                                  booking.status === 'completed' ? 'bg-blue-100' :
                                  booking.status === 'cancelled' ? 'bg-red-100' :
                                  'bg-gray-100'
                                }`}>
                                  <Car className={`w-4 h-4 ${
                                    booking.status === 'active' ? 'text-green-600' :
                                    booking.status === 'completed' ? 'text-blue-600' :
                                    booking.status === 'cancelled' ? 'text-red-600' :
                                    'text-gray-600'
                                  }`} />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{booking.parking_spots?.title || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {booking.renter_profile?.full_name || booking.renter_profile?.email || 'Unknown renter'}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    ID: {booking.id.slice(0, 8)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="font-medium text-sm">${Number(booking.total_amount).toFixed(2)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(booking.created_at), 'MMM dd, HH:mm')}
                                  </p>
                                </div>
                                <Badge variant={
                                  booking.status === 'active' ? 'default' :
                                  booking.status === 'completed' ? 'secondary' :
                                  booking.status === 'cancelled' ? 'destructive' :
                                  'outline'
                                } className={booking.status === 'active' ? 'bg-green-500' : ''}>
                                  {booking.status}
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={checkDataIntegrity}
                    className="bg-background"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Find Missing
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={syncUserData}
                    className="bg-background"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Sync Users
                  </Button>
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
                  <Select value={spotFilterStatus} onValueChange={setSpotFilterStatus}>
                    <SelectTrigger className="w-32 bg-background">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg">
                      <SelectItem value="all">All Spots</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search spots..."
                      value={spotSearchTerm}
                      onChange={(e) => setSpotSearchTerm(e.target.value)}
                      className="pl-10 w-64 bg-background"
                    />
                  </div>
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
                      .filter(spot => {
                        const matchesSearch = !spotSearchTerm || 
                          spot.title.toLowerCase().includes(spotSearchTerm.toLowerCase()) ||
                          spot.address.toLowerCase().includes(spotSearchTerm.toLowerCase());
                        const matchesStatus = spotFilterStatus === 'all' || 
                          (spotFilterStatus === 'active' && spot.is_active) ||
                          (spotFilterStatus === 'inactive' && !spot.is_active);
                        return matchesSearch && matchesStatus;
                      })
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
                  <Select value={bookingFilterStatus} onValueChange={setBookingFilterStatus}>
                    <SelectTrigger className="w-40 bg-background">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg">
                      <SelectItem value="all">All ({stats.totalBookings})</SelectItem>
                      <SelectItem value="active">Active ({stats.activeBookings})</SelectItem>
                      <SelectItem value="completed">Completed ({stats.completedBookings})</SelectItem>
                      <SelectItem value="cancelled">Cancelled ({stats.cancelledBookings})</SelectItem>
                      <SelectItem value="pending">Pending ({stats.pendingBookings})</SelectItem>
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
                      .filter(booking => {
                        if (bookingFilterStatus === 'all') return true;
                        if (bookingFilterStatus === 'pending') {
                          return ['pending', 'confirmed'].includes(booking.status);
                        }
                        return booking.status === bookingFilterStatus;
                      })
                      .map((booking) => (
                        <div key={booking.id} className={`flex items-center justify-between p-4 border rounded-lg ${
                          booking.status === 'active' 
                            ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                            : 'bg-background/50'
                        }`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                booking.status === 'active' 
                                  ? 'bg-green-100' 
                                  : booking.status === 'completed' 
                                    ? 'bg-blue-100' 
                                    : booking.status === 'cancelled' 
                                      ? 'bg-red-100' 
                                      : 'bg-purple-100'
                              }`}>
                                <Car className={`w-5 h-5 ${
                                  booking.status === 'active' 
                                    ? 'text-green-600' 
                                    : booking.status === 'completed' 
                                      ? 'text-blue-600' 
                                      : booking.status === 'cancelled' 
                                        ? 'text-red-600' 
                                        : 'text-purple-600'
                                }`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{booking.parking_spots?.title || 'Unknown Spot'}</p>
                                  {booking.status === 'active' && (
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Renter: {booking.renter_profile?.full_name || booking.renter_profile?.email || 'Unknown'}
                                </p>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(booking.start_time), 'MMM dd, HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                                  </span>
                                  <span className="text-xs font-medium">
                                    ${Number(booking.total_amount).toFixed(2)}
                                  </span>
                                  {booking.platform_fee_amount && Number(booking.platform_fee_amount) > 0 && (
                                    <span className="text-xs text-green-600">
                                      Fee: ${Number(booking.platform_fee_amount).toFixed(2)}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {booking.id.slice(0, 8)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={
                                booking.status === 'active' ? 'default' :
                                booking.status === 'confirmed' ? 'outline' :
                                booking.status === 'completed' ? 'secondary' :
                                'destructive'
                              }
                              className={booking.status === 'active' ? 'bg-green-500' : ''}
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
                <div className="space-y-3">
                  {disputes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No disputes to display</p>
                      <p className="text-sm">Disputes will appear here when reported</p>
                    </div>
                  ) : (
                    disputes.map((dispute) => (
                      <div key={dispute.id} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium">Dispute #{dispute.id.slice(0, 8)}...</p>
                              <p className="text-sm text-muted-foreground">Type: {dispute.dispute_type}</p>
                              <p className="text-sm text-muted-foreground">
                                Created: {format(new Date(dispute.created_at), 'MMM dd, yyyy HH:mm')}
                              </p>
                              {dispute.description && (
                                <p className="text-sm mt-1 max-w-md truncate">{dispute.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            dispute.status === 'pending' ? 'destructive' :
                            dispute.status === 'resolved' ? 'default' : 'secondary'
                          }>
                            {dispute.status}
                          </Badge>
                          {dispute.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const resolution = prompt('Enter resolution for this dispute:');
                                if (resolution) resolveDispute(dispute.id, resolution);
                              }}
                              className="bg-background"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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
                <div className="space-y-3">
                  {supportTickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No support tickets</p>
                      <p className="text-sm">Support requests will appear here</p>
                    </div>
                  ) : (
                    supportTickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <HelpCircle className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{ticket.subject}</p>
                              <p className="text-sm text-muted-foreground">
                                Ticket: {ticket.ticket_number} • Category: {ticket.category}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Created: {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}
                              </p>
                              <p className="text-sm mt-1 max-w-md truncate">{ticket.message}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            ticket.priority === 'high' ? 'destructive' :
                            ticket.priority === 'medium' ? 'default' : 'secondary'
                          }>
                            {ticket.priority}
                          </Badge>
                          <Badge variant={
                            ticket.status === 'open' ? 'destructive' :
                            ticket.status === 'resolved' ? 'default' : 'secondary'
                          }>
                            {ticket.status}
                          </Badge>
                          {ticket.status === 'open' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const resolution = prompt('Enter resolution for this ticket:');
                                if (resolution) resolveSupportTicket(ticket.id, resolution);
                              }}
                              className="bg-background"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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

              <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>System Diagnostics</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={checkDataIntegrity}
                      className="bg-background"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Check Integrity
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={syncUserData}
                      className="bg-background"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Refresh Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{users.length}</div>
                      <div className="text-sm text-muted-foreground">Profiles Found</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{spots.length}</div>
                      <div className="text-sm text-muted-foreground">Total Spots</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{bookings.length}</div>
                      <div className="text-sm text-muted-foreground">Recent Bookings</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{disputes.length + supportTickets.length}</div>
                      <div className="text-sm text-muted-foreground">Open Issues</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Data Sync Information</h4>
                    <p className="text-sm text-muted-foreground">
                      If you notice missing users, click "Sync Users" in the Users tab or "Refresh Data" above. 
                      This will reload all user data from the database and may reveal recently registered users.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Last loaded: {format(new Date(), 'PPP p')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <SecurityMonitoringDashboard />
          </TabsContent>
        </Tabs>

        {/* User Details Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => {
          setSelectedUser(null);
          setUserOwnedSpots([]);
        }}>
          <DialogContent className="bg-background max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-lg font-semibold">{selectedUser.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-lg">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-lg">{selectedUser.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <p className="text-sm text-muted-foreground font-mono">{selectedUser.user_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Join Date</label>
                    <p className="text-lg">{format(new Date(selectedUser.created_at), 'PPP')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-lg">{format(new Date(selectedUser.updated_at), 'PPP')}</p>
                  </div>
                </div>

                {/* User's Owned Spots Section */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Owned Parking Spots ({userOwnedSpots.length})</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fetchUserOwnedSpots(selectedUser.user_id)}
                      className="bg-background"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Load Spots
                    </Button>
                  </div>
                  
                  {userOwnedSpots.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No parking spots found</p>
                      <p className="text-sm">Click "Load Spots" to see spots owned by this user</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {userOwnedSpots.map((spot) => (
                        <div key={spot.id} className="flex items-center justify-between p-3 border rounded-lg bg-background/50">
                          <div className="flex-1">
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
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={spot.is_active ? "default" : "secondary"}>
                              {spot.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedSpot(spot);
                                setSelectedUser(null);
                              }}
                              className="bg-background"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteSpot(spot.id)}
                              className="bg-background text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Admin Actions</label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const message = prompt('Enter notification message:');
                        if (message) sendNotificationToUser(selectedUser.user_id, message);
                      }}
                      className="bg-background"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send Notification
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (selectedUser.full_name?.includes('[BANNED]')) {
                          unbanUser(selectedUser.user_id);
                        } else {
                          banUser(selectedUser.user_id);
                        }
                        setSelectedUser(null);
                      }}
                      className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                    >
                      {selectedUser.full_name?.includes('[BANNED]') ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Unban User
                        </>
                      ) : (
                        <>
                          <UserX className="w-4 h-4 mr-2" />
                          Ban User
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        deleteUser(selectedUser.user_id);
                        setSelectedUser(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Spot Details Dialog */}
        <Dialog open={!!selectedSpot} onOpenChange={() => setSelectedSpot(null)}>
          <DialogContent className="bg-background max-w-3xl">
            <DialogHeader>
              <DialogTitle>Parking Spot Details</DialogTitle>
            </DialogHeader>
            {selectedSpot && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Title</label>
                    <p className="text-lg font-semibold">{selectedSpot.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={selectedSpot.is_active ? "default" : "secondary"}>
                      {selectedSpot.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-lg">{selectedSpot.address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Pricing Type</label>
                    <p className="text-lg capitalize">{selectedSpot.pricing_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Price</label>
                    <p className="text-lg font-semibold">
                      {selectedSpot.pricing_type === 'hourly' && `$${selectedSpot.price_per_hour}/hr`}
                      {selectedSpot.pricing_type === 'daily' && `$${selectedSpot.daily_price}/day`}
                      {selectedSpot.pricing_type === 'one_time' && `$${selectedSpot.one_time_price} one-time`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Spots</label>
                    <p className="text-lg">{selectedSpot.total_spots}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Available Spots</label>
                    <p className="text-lg">{selectedSpot.available_spots}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Rating</label>
                    <p className="text-lg">★ {selectedSpot.rating.toFixed(1)} ({selectedSpot.total_reviews} reviews)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-lg">{format(new Date(selectedSpot.created_at), 'PPP')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Spot ID</label>
                    <p className="text-sm text-muted-foreground font-mono">{selectedSpot.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Owner ID</label>
                    <p className="text-sm text-muted-foreground font-mono">{selectedSpot.owner_id}</p>
                  </div>
                </div>

                {/* Spot Images Section */}
                {selectedSpot.images && selectedSpot.images.length > 0 && (
                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-muted-foreground block mb-3">
                      Spot Images ({selectedSpot.images.length})
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedSpot.images.map((imageUrl, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                          <img
                            src={imageUrl}
                            alt={`${selectedSpot.title} - Image ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                              e.currentTarget.alt = 'Image failed to load';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description Section */}
                {selectedSpot.description && (
                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm mt-1 text-muted-foreground">{selectedSpot.description}</p>
                  </div>
                )}

                {/* Amenities Section */}
                {selectedSpot.amenities && selectedSpot.amenities.length > 0 && (
                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Amenities</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedSpot.amenities.map((amenity, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Admin Actions</label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        toggleSpotStatus(selectedSpot.id, selectedSpot.is_active);
                        setSelectedSpot(null);
                      }}
                      className="bg-background"
                    >
                      {selectedSpot.is_active ? (
                        <>
                          <Ban className="w-4 h-4 mr-2" />
                          Deactivate Spot
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Activate Spot
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const newTitle = prompt('Enter new title:', selectedSpot.title);
                        if (newTitle && newTitle !== selectedSpot.title) {
                          editSpot(selectedSpot.id, { title: newTitle });
                          setSelectedSpot(null);
                        }
                      }}
                      className="bg-background"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Title
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}