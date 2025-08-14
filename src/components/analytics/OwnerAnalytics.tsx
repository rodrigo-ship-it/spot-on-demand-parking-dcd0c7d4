import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Users, MapPin, Star, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface AnalyticsData {
  revenueData: Array<{ date: string; revenue: number; bookings: number }>;
  spotPerformance: Array<{ name: string; revenue: number; bookings: number; occupancy: number }>;
  hourlyData: Array<{ hour: string; bookings: number }>;
  monthlyComparison: {
    current: number;
    previous: number;
    growth: number;
  };
  totalStats: {
    totalRevenue: number;
    totalBookings: number;
    averageBookingValue: number;
    occupancyRate: number;
    rating: number;
  };
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function OwnerAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, timeRange]);

  const fetchAnalyticsData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get owner's spots and bookings for analytics
      const { data: spotsData, error } = await supabase
        .from('parking_spots')
        .select(`
          *,
          bookings(*)
        `)
        .eq('owner_id', user.id);

      if (error) {
        console.error('Error fetching analytics:', error);
        return;
      }

      // Process the data for charts
      const processedData = processAnalyticsData(spotsData || []);
      setData(processedData);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (rawData: any[]): AnalyticsData => {
    // Mock data for demonstration - replace with actual data processing
    const revenueData = [
      { date: 'Mon', revenue: 120, bookings: 8 },
      { date: 'Tue', revenue: 150, bookings: 12 },
      { date: 'Wed', revenue: 180, bookings: 15 },
      { date: 'Thu', revenue: 90, bookings: 6 },
      { date: 'Fri', revenue: 200, bookings: 18 },
      { date: 'Sat', revenue: 250, bookings: 22 },
      { date: 'Sun', revenue: 180, bookings: 14 },
    ];

    const spotPerformance = rawData.map((spot, index) => ({
      name: spot.title || `Spot ${index + 1}`,
      revenue: spot.total_earnings || 0,
      bookings: spot.total_bookings || 0,
      occupancy: Math.random() * 100, // Calculate actual occupancy
    }));

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      bookings: Math.floor(Math.random() * 10),
    }));

    return {
      revenueData,
      spotPerformance,
      hourlyData,
      monthlyComparison: {
        current: rawData.reduce((sum, spot) => sum + (spot.current_month_earnings || 0), 0),
        previous: rawData.reduce((sum, spot) => sum + (spot.last_month_earnings || 0), 0),
        growth: 15.2, // Calculate actual growth
      },
      totalStats: {
        totalRevenue: rawData.reduce((sum, spot) => sum + (spot.total_earnings || 0), 0),
        totalBookings: rawData.reduce((sum, spot) => sum + (spot.total_bookings || 0), 0),
        averageBookingValue: rawData.length > 0 ? rawData.reduce((sum, spot) => sum + (spot.avg_booking_value || 0), 0) / rawData.length : 0,
        occupancyRate: 67.5, // Calculate actual occupancy
        rating: 4.7, // Get from actual reviews
      },
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--primary))",
    },
    bookings: {
      label: "Bookings",
      color: "hsl(var(--secondary))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +{data.monthlyComparison.growth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">Active reservations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Booking Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalStats.averageBookingValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per booking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStats.occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">Average utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue and booking count over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--color-revenue)" 
                  strokeWidth={2} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="var(--color-bookings)" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Spot Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spot Performance</CardTitle>
            <CardDescription>Revenue by parking spot</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.spotPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
            <CardDescription>Booking distribution by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="var(--color-bookings)" 
                    fill="var(--color-bookings)" 
                    fillOpacity={0.6} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}