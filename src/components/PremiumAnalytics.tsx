import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Calendar, MapPin, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface AnalyticsData {
  totalEarnings: number;
  totalBookings: number;
  avgBookingValue: number;
  monthlyData: Array<{
    month: string;
    earnings: number;
    bookings: number;
  }>;
  spotPerformance: Array<{
    name: string;
    earnings: number;
    bookings: number;
  }>;
  weeklyTrends: Array<{
    day: string;
    bookings: number;
  }>;
}

const PremiumAnalytics = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('3months');

  useEffect(() => {
    if (isPremium && user) {
      fetchAnalyticsData();
    }
  }, [isPremium, user, timeRange]);

  const fetchAnalyticsData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Fetch bookings data for analytics
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          parking_spots!inner(
            owner_id,
            title
          )
        `)
        .eq('parking_spots.owner_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Process data for analytics
      const totalEarnings = bookings?.reduce((sum, booking) => sum + (booking.owner_payout_amount || 0), 0) || 0;
      const totalBookings = bookings?.length || 0;
      const avgBookingValue = totalBookings > 0 ? totalEarnings / totalBookings : 0;

      // Group by month for trends
      const monthlyData = processMonthlyData(bookings || []);
      const spotPerformance = processSpotPerformance(bookings || []);
      const weeklyTrends = processWeeklyTrends(bookings || []);

      setAnalyticsData({
        totalEarnings,
        totalBookings,
        avgBookingValue,
        monthlyData,
        spotPerformance,
        weeklyTrends
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (bookings: any[]) => {
    const monthlyMap = new Map();
    
    bookings.forEach(booking => {
      const month = new Date(booking.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { month, earnings: 0, bookings: 0 });
      }
      
      const data = monthlyMap.get(month);
      data.earnings += booking.owner_payout_amount || 0;
      data.bookings += 1;
    });
    
    return Array.from(monthlyMap.values()).sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
  };

  const processSpotPerformance = (bookings: any[]) => {
    const spotMap = new Map();
    
    bookings.forEach(booking => {
      const spotTitle = booking.parking_spots?.title || 'Unknown Spot';
      
      if (!spotMap.has(spotTitle)) {
        spotMap.set(spotTitle, { name: spotTitle, earnings: 0, bookings: 0 });
      }
      
      const data = spotMap.get(spotTitle);
      data.earnings += booking.owner_payout_amount || 0;
      data.bookings += 1;
    });
    
    return Array.from(spotMap.values())
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5); // Top 5 spots
  };

  const processWeeklyTrends = (bookings: any[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = new Map();
    
    days.forEach(day => weeklyMap.set(day, { day, bookings: 0 }));
    
    bookings.forEach(booking => {
      const dayName = days[new Date(booking.created_at).getDay()];
      const data = weeklyMap.get(dayName);
      data.bookings += 1;
    });
    
    return Array.from(weeklyMap.values());
  };

  if (!isPremium) {
    return (
      <Card className="border-amber-200">
        <CardContent className="p-6 text-center">
          <div className="text-amber-600 mb-4">
            <TrendingUp className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Premium Analytics</h3>
          <p className="text-gray-600 mb-4">
            Upgrade to Premium to unlock detailed analytics and insights about your parking spots.
          </p>
          <Badge variant="outline" className="border-amber-200 text-amber-700">
            Premium Feature
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    earnings: {
      label: "Earnings",
      color: "hsl(var(--chart-1))",
    },
    bookings: {
      label: "Bookings",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-amber-600" />
                Advanced Analytics
              </CardTitle>
              <CardDescription>
                Detailed insights into your parking spot performance
              </CardDescription>
            </div>
            <Tabs value={timeRange} onValueChange={setTimeRange}>
              <TabsList>
                <TabsTrigger value="1month">1M</TabsTrigger>
                <TabsTrigger value="3months">3M</TabsTrigger>
                <TabsTrigger value="6months">6M</TabsTrigger>
                <TabsTrigger value="1year">1Y</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${analyticsData?.totalEarnings.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {analyticsData?.totalBookings || 0}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Booking Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${analyticsData?.avgBookingValue.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="trends" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
              <TabsTrigger value="spots">Spot Performance</TabsTrigger>
              <TabsTrigger value="weekly">Weekly Patterns</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings & Bookings Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData?.monthlyData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="earnings" 
                          stroke="var(--color-earnings)" 
                          strokeWidth={2}
                          name="Earnings ($)"
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="bookings" 
                          stroke="var(--color-bookings)" 
                          strokeWidth={2}
                          name="Bookings"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="spots" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Spots</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData?.spotPerformance || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="earnings" fill="var(--color-earnings)" name="Earnings ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="weekly" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Booking Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData?.weeklyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="bookings" fill="var(--color-bookings)" name="Bookings" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PremiumAnalytics;