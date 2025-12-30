import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, DollarSign, Calendar, MapPin, Users, Star, Clock, Target, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface AnalyticsData {
  totalEarnings: number;
  totalBookings: number;
  avgBookingValue: number;
  occupancyRate: number;
  avgBookingDuration: number;
  repeatCustomerRate: number;
  monthlyData: Array<{
    month: string;
    earnings: number;
    bookings: number;
  }>;
  spotPerformance: Array<{
    name: string;
    earnings: number;
    bookings: number;
    avgRating: number;
    occupancy: number;
  }>;
  weeklyTrends: Array<{
    day: string;
    bookings: number;
    earnings: number;
  }>;
  hourlyTrends: Array<{
    hour: string;
    bookings: number;
  }>;
  revenueByType: Array<{
    type: string;
    revenue: number;
    count: number;
  }>;
  customerMetrics: {
    totalCustomers: number;
    repeatCustomers: number;
    avgBookingsPerCustomer: number;
  };
  growthMetrics: {
    earningsGrowth: number;
    bookingsGrowth: number;
    previousPeriodEarnings: number;
    previousPeriodBookings: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
      
      const endDate = new Date();
      const startDate = new Date();
      const previousStartDate = new Date();
      
      switch (timeRange) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1);
          previousStartDate.setMonth(endDate.getMonth() - 2);
          break;
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          previousStartDate.setMonth(endDate.getMonth() - 6);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          previousStartDate.setMonth(endDate.getMonth() - 12);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          previousStartDate.setFullYear(endDate.getFullYear() - 2);
          break;
      }

      // Fetch current period bookings
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          parking_spots!inner(
            owner_id,
            title,
            pricing_type
          )
        `)
        .eq('parking_spots.owner_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Fetch previous period for comparison
      const { data: previousBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          parking_spots!inner(owner_id)
        `)
        .eq('parking_spots.owner_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      // Fetch user's spots for occupancy calculation
      const { data: userSpots } = await supabase
        .from('parking_spots')
        .select('id, title, total_spots, rating')
        .eq('owner_id', user.id)
        .eq('is_active', true);

      // Process all analytics data
      const processedData = processAnalyticsData(
        bookings || [], 
        previousBookings || [],
        userSpots || [],
        startDate,
        endDate
      );

      setAnalyticsData(processedData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (
    bookings: any[], 
    previousBookings: any[],
    spots: any[],
    startDate: Date,
    endDate: Date
  ): AnalyticsData => {
    // Basic metrics
    const totalEarnings = bookings.reduce((sum, b) => sum + (b.owner_payout_amount || 0), 0);
    const totalBookings = bookings.length;
    const avgBookingValue = totalBookings > 0 ? totalEarnings / totalBookings : 0;

    // Calculate average booking duration in hours
    const totalHours = bookings.reduce((sum, b) => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    const avgBookingDuration = totalBookings > 0 ? totalHours / totalBookings : 0;

    // Calculate occupancy rate (simplified: bookings / potential slots)
    const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalSlots = spots.reduce((sum, s) => sum + (s.total_spots || 1), 0) * daysInPeriod;
    const occupancyRate = totalSlots > 0 ? Math.min((totalBookings / totalSlots) * 100, 100) : 0;

    // Repeat customer analysis
    const customerBookings = new Map<string, number>();
    bookings.forEach(b => {
      customerBookings.set(b.renter_id, (customerBookings.get(b.renter_id) || 0) + 1);
    });
    const totalCustomers = customerBookings.size;
    const repeatCustomers = Array.from(customerBookings.values()).filter(count => count > 1).length;
    const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    // Growth metrics
    const previousEarnings = previousBookings.reduce((sum, b) => sum + (b.owner_payout_amount || 0), 0);
    const previousBookingsCount = previousBookings.length;
    const earningsGrowth = previousEarnings > 0 ? ((totalEarnings - previousEarnings) / previousEarnings) * 100 : 0;
    const bookingsGrowth = previousBookingsCount > 0 ? ((totalBookings - previousBookingsCount) / previousBookingsCount) * 100 : 0;

    // Monthly data
    const monthlyData = processMonthlyData(bookings);

    // Spot performance with more metrics
    const spotPerformance = processSpotPerformance(bookings, spots);

    // Weekly trends with earnings
    const weeklyTrends = processWeeklyTrends(bookings);

    // Hourly trends
    const hourlyTrends = processHourlyTrends(bookings);

    // Revenue by pricing type
    const revenueByType = processRevenueByType(bookings);

    return {
      totalEarnings,
      totalBookings,
      avgBookingValue,
      occupancyRate,
      avgBookingDuration,
      repeatCustomerRate,
      monthlyData,
      spotPerformance,
      weeklyTrends,
      hourlyTrends,
      revenueByType,
      customerMetrics: {
        totalCustomers,
        repeatCustomers,
        avgBookingsPerCustomer: totalCustomers > 0 ? totalBookings / totalCustomers : 0
      },
      growthMetrics: {
        earningsGrowth,
        bookingsGrowth,
        previousPeriodEarnings: previousEarnings,
        previousPeriodBookings: previousBookingsCount
      }
    };
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

  const processSpotPerformance = (bookings: any[], spots: any[]) => {
    const spotMap = new Map();
    
    // Initialize with all spots
    spots.forEach(spot => {
      spotMap.set(spot.title, { 
        name: spot.title, 
        earnings: 0, 
        bookings: 0,
        avgRating: spot.rating || 0,
        occupancy: 0,
        spotId: spot.id
      });
    });
    
    bookings.forEach(booking => {
      const spotTitle = booking.parking_spots?.title || 'Unknown Spot';
      
      if (!spotMap.has(spotTitle)) {
        spotMap.set(spotTitle, { 
          name: spotTitle, 
          earnings: 0, 
          bookings: 0,
          avgRating: 0,
          occupancy: 0
        });
      }
      
      const data = spotMap.get(spotTitle);
      data.earnings += booking.owner_payout_amount || 0;
      data.bookings += 1;
    });
    
    // Calculate occupancy for each spot
    spotMap.forEach(data => {
      data.occupancy = Math.min(data.bookings * 5, 100); // Simplified occupancy calc
    });
    
    return Array.from(spotMap.values())
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);
  };

  const processWeeklyTrends = (bookings: any[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = new Map();
    
    days.forEach(day => weeklyMap.set(day, { day, bookings: 0, earnings: 0 }));
    
    bookings.forEach(booking => {
      const dayName = days[new Date(booking.created_at).getDay()];
      const data = weeklyMap.get(dayName);
      data.bookings += 1;
      data.earnings += booking.owner_payout_amount || 0;
    });
    
    return Array.from(weeklyMap.values());
  };

  const processHourlyTrends = (bookings: any[]) => {
    const hourlyMap = new Map();
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + ':00';
      hourlyMap.set(hour, { hour, bookings: 0 });
    }
    
    bookings.forEach(booking => {
      const hour = new Date(booking.start_time).getHours();
      const hourKey = hour.toString().padStart(2, '0') + ':00';
      const data = hourlyMap.get(hourKey);
      if (data) data.bookings += 1;
    });
    
    return Array.from(hourlyMap.values());
  };

  const processRevenueByType = (bookings: any[]) => {
    const typeMap = new Map();
    
    bookings.forEach(booking => {
      const type = booking.parking_spots?.pricing_type || 'hourly';
      
      if (!typeMap.has(type)) {
        typeMap.set(type, { type, revenue: 0, count: 0 });
      }
      
      const data = typeMap.get(type);
      data.revenue += booking.owner_payout_amount || 0;
      data.count += 1;
    });
    
    return Array.from(typeMap.values());
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-amber-600" />
                Advanced Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive insights into your parking spot performance
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
          {/* Key Metrics - Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${analyticsData?.totalEarnings.toFixed(2) || '0.00'}
                    </p>
                    {analyticsData?.growthMetrics && (
                      <div className={`flex items-center text-xs ${analyticsData.growthMetrics.earningsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analyticsData.growthMetrics.earningsGrowth >= 0 ? (
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 mr-1" />
                        )}
                        {Math.abs(analyticsData.growthMetrics.earningsGrowth).toFixed(1)}% vs prev
                      </div>
                    )}
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {analyticsData?.totalBookings || 0}
                    </p>
                    {analyticsData?.growthMetrics && (
                      <div className={`flex items-center text-xs ${analyticsData.growthMetrics.bookingsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analyticsData.growthMetrics.bookingsGrowth >= 0 ? (
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 mr-1" />
                        )}
                        {Math.abs(analyticsData.growthMetrics.bookingsGrowth).toFixed(1)}% vs prev
                      </div>
                    )}
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Booking Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${analyticsData?.avgBookingValue.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {analyticsData?.occupancyRate.toFixed(1) || '0'}%
                    </p>
                  </div>
                  <Percent className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics - Row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Duration</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {analyticsData?.avgBookingDuration.toFixed(1) || '0'}h
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold text-teal-600">
                      {analyticsData?.customerMetrics.totalCustomers || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-teal-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Repeat Customers</p>
                    <p className="text-2xl font-bold text-pink-600">
                      {analyticsData?.repeatCustomerRate.toFixed(1) || '0'}%
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-pink-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Per Customer</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {analyticsData?.customerMetrics.avgBookingsPerCustomer.toFixed(1) || '0'}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="trends" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
              <TabsTrigger value="spots">Spot Performance</TabsTrigger>
              <TabsTrigger value="weekly">Weekly Patterns</TabsTrigger>
              <TabsTrigger value="hourly">Peak Hours</TabsTrigger>
              <TabsTrigger value="revenue-type">By Type</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings & Bookings Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData?.monthlyData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="earnings" 
                          stroke="var(--color-earnings)" 
                          fill="var(--color-earnings)"
                          fillOpacity={0.3}
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
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="spots" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Spots</CardTitle>
                  <CardDescription>Revenue and bookings by spot</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData?.spotPerformance || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
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
                  <CardDescription>See which days perform best</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData?.weeklyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar yAxisId="left" dataKey="bookings" fill="var(--color-bookings)" name="Bookings" />
                        <Line yAxisId="right" type="monotone" dataKey="earnings" stroke="var(--color-earnings)" strokeWidth={2} name="Earnings ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hourly" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Peak Hours Analysis</CardTitle>
                  <CardDescription>When do most bookings start?</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData?.hourlyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" interval={2} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="bookings" 
                          stroke="var(--color-bookings)" 
                          fill="var(--color-bookings)"
                          fillOpacity={0.4}
                          name="Bookings" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue-type" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Pricing Type</CardTitle>
                  <CardDescription>Breakdown of earnings by spot type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <ChartContainer config={chartConfig} className="h-[250px] w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData?.revenueByType || []}
                            dataKey="revenue"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {(analyticsData?.revenueByType || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <div className="space-y-3 w-full md:w-1/2">
                      {(analyticsData?.revenueByType || []).map((item, index) => (
                        <div key={item.type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="capitalize font-medium">{item.type}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${item.revenue.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{item.count} bookings</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
