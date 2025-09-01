import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has premium subscription
    const { data: subscription } = await supabaseClient
      .from('premium_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .maybeSingle();

    if (!subscription) {
      return new Response(JSON.stringify({ error: 'Premium subscription required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { timeRange } = await req.json();

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
      default:
        startDate.setMonth(endDate.getMonth() - 3);
    }

    // Fetch analytics data from materialized view if it exists, otherwise from bookings
    let analyticsQuery;
    
    try {
      // Try to use materialized view first
      analyticsQuery = supabaseClient
        .from('owner_analytics')
        .select('*')
        .eq('owner_id', user.id)
        .gte('month', startDate.toISOString())
        .lte('month', endDate.toISOString());
    } catch (error) {
      // Fallback to direct bookings query
      console.log('Materialized view not available, using direct query');
      analyticsQuery = supabaseClient
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
    }

    const { data: analyticsData, error: analyticsError } = await analyticsQuery;

    if (analyticsError) {
      console.error('Analytics query error:', analyticsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch analytics data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process and return analytics data
    const processedData = processAnalyticsData(analyticsData || []);

    return new Response(JSON.stringify(processedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-analytics-data function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function processAnalyticsData(data: any[]) {
  // If data comes from materialized view
  if (data.length > 0 && 'total_bookings' in data[0]) {
    const totalEarnings = data.reduce((sum, row) => sum + (row.total_earnings || 0), 0);
    const totalBookings = data.reduce((sum, row) => sum + (row.total_bookings || 0), 0);
    
    return {
      totalEarnings,
      totalBookings,
      avgBookingValue: totalBookings > 0 ? totalEarnings / totalBookings : 0,
      monthlyData: processMonthlyFromView(data),
      spotPerformance: processSpotPerformanceFromView(data),
    };
  }

  // If data comes from bookings table
  const totalEarnings = data.reduce((sum, booking) => sum + (booking.owner_payout_amount || 0), 0);
  const totalBookings = data.length;
  const avgBookingValue = totalBookings > 0 ? totalEarnings / totalBookings : 0;

  return {
    totalEarnings,
    totalBookings,
    avgBookingValue,
    monthlyData: processMonthlyFromBookings(data),
    spotPerformance: processSpotPerformanceFromBookings(data),
    weeklyTrends: processWeeklyTrends(data),
  };
}

function processMonthlyFromView(data: any[]) {
  const monthlyMap = new Map();
  
  data.forEach(row => {
    const month = new Date(row.month).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { month, earnings: 0, bookings: 0 });
    }
    
    const monthData = monthlyMap.get(month);
    monthData.earnings += row.total_earnings || 0;
    monthData.bookings += row.total_bookings || 0;
  });
  
  return Array.from(monthlyMap.values()).sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  );
}

function processMonthlyFromBookings(bookings: any[]) {
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
}

function processSpotPerformanceFromView(data: any[]) {
  const spotMap = new Map();
  
  data.forEach(row => {
    const spotTitle = row.spot_title || 'Unknown Spot';
    
    if (!spotMap.has(spotTitle)) {
      spotMap.set(spotTitle, { name: spotTitle, earnings: 0, bookings: 0 });
    }
    
    const spotData = spotMap.get(spotTitle);
    spotData.earnings += row.total_earnings || 0;
    spotData.bookings += row.total_bookings || 0;
  });
  
  return Array.from(spotMap.values())
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);
}

function processSpotPerformanceFromBookings(bookings: any[]) {
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
    .slice(0, 5);
}

function processWeeklyTrends(bookings: any[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyMap = new Map();
  
  days.forEach(day => weeklyMap.set(day, { day, bookings: 0 }));
  
  bookings.forEach(booking => {
    const dayName = days[new Date(booking.created_at).getDay()];
    const data = weeklyMap.get(dayName);
    data.bookings += 1;
  });
  
  return Array.from(weeklyMap.values());
}