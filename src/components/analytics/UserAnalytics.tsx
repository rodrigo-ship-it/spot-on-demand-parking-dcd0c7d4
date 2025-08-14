import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Car, Clock, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface UserAnalyticsData {
  spendingData: Array<{ month: string; amount: number; bookings: number }>;
  locationData: Array<{ location: string; visits: number; spending: number }>;
  timeData: Array<{ hour: string; bookings: number }>;
  totalStats: {
    totalSpent: number;
    totalBookings: number;
    avgBookingValue: number;
    favoriteLocation: string;
    totalHours: number;
  };
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function UserAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<UserAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserAnalytics();
    }
  }, [user]);

  const fetchUserAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user's booking history
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          parking_spots (
            title,
            address,
            latitude,
            longitude
          )
        `)
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user analytics:', error);
        return;
      }

      const processedData = processUserData(bookings || []);
      setData(processedData);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const processUserData = (bookings: any[]): UserAnalyticsData => {
    // Process spending by month
    const spendingByMonth: { [key: string]: { amount: number; bookings: number } } = {};
    
    // Process location data
    const locationSpending: { [key: string]: { visits: number; spending: number } } = {};
    
    // Process time data
    const timeBookings: { [key: string]: number } = {};
    
    let totalSpent = 0;
    let totalHours = 0;

    bookings.forEach(booking => {
      const month = new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short' });
      const amount = Number(booking.total_amount);
      const location = booking.parking_spots?.title || 'Unknown Location';
      const startTime = new Date(booking.start_time);
      const endTime = new Date(booking.end_time);
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const hour = startTime.getHours();

      // Spending by month
      if (!spendingByMonth[month]) {
        spendingByMonth[month] = { amount: 0, bookings: 0 };
      }
      spendingByMonth[month].amount += amount;
      spendingByMonth[month].bookings += 1;

      // Location data
      if (!locationSpending[location]) {
        locationSpending[location] = { visits: 0, spending: 0 };
      }
      locationSpending[location].visits += 1;
      locationSpending[location].spending += amount;

      // Time data
      const hourKey = `${hour}:00`;
      timeBookings[hourKey] = (timeBookings[hourKey] || 0) + 1;

      totalSpent += amount;
      totalHours += duration;
    });

    // Convert to arrays for charts
    const spendingData = Object.entries(spendingByMonth).map(([month, data]) => ({
      month,
      amount: data.amount,
      bookings: data.bookings,
    }));

    const locationData = Object.entries(locationSpending)
      .map(([location, data]) => ({
        location: location.length > 20 ? location.substring(0, 20) + '...' : location,
        visits: data.visits,
        spending: data.spending,
      }))
      .sort((a, b) => b.spending - a.spending)
      .slice(0, 5);

    const timeData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      bookings: timeBookings[`${i}:00`] || 0,
    }));

    const favoriteLocation = locationData.length > 0 ? locationData[0].location : 'No bookings yet';

    return {
      spendingData,
      locationData,
      timeData,
      totalStats: {
        totalSpent,
        totalBookings: bookings.length,
        avgBookingValue: bookings.length > 0 ? totalSpent / bookings.length : 0,
        favoriteLocation,
        totalHours,
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
    amount: {
      label: "Spending",
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
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalStats.totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time spending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">Parking sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Booking</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalStats.avgBookingValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Average cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStats.totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Hours parked</p>
          </CardContent>
        </Card>
      </div>

      {/* Spending Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
          <CardDescription>Your monthly parking expenses and booking frequency</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.spendingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="var(--color-amount)" 
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

      {/* Location and Time Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Favorite Locations</CardTitle>
            <CardDescription>Your most visited parking spots</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.locationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="spending" fill="var(--color-amount)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parking Times</CardTitle>
            <CardDescription>When you typically park</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeData}>
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

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Your Parking Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Favorite Location</h4>
              <p className="text-sm text-blue-700">{data.totalStats.favoriteLocation}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900">Average Session</h4>
              <p className="text-sm text-green-700">
                {data.totalStats.totalBookings > 0 
                  ? `${(data.totalStats.totalHours / data.totalStats.totalBookings).toFixed(1)} hours`
                  : 'No data yet'
                }
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900">Cost per Hour</h4>
              <p className="text-sm text-purple-700">
                {data.totalStats.totalHours > 0 
                  ? `$${(data.totalStats.totalSpent / data.totalStats.totalHours).toFixed(2)}`
                  : 'No data yet'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}