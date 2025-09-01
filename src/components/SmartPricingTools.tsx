import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, TrendingUp, DollarSign, MapPin, Lightbulb, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { toast } from "sonner";

interface PricingSuggestion {
  spotId: string;
  spotTitle: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  potentialIncrease: number;
  confidence: 'low' | 'medium' | 'high';
}

interface MarketData {
  avgPriceNearby: number;
  totalNearbySpots: number;
  yourRank: number;
  competitorPrices: number[];
}

const SmartPricingTools = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const [pricingSuggestions, setPricingSuggestions] = useState<PricingSuggestion[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPrices, setUpdatingPrices] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isPremium && user) {
      fetchPricingSuggestions();
      fetchMarketData();
    }
  }, [isPremium, user]);

  const fetchPricingSuggestions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch user's parking spots
      const { data: spots, error } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      if (!spots || spots.length === 0) {
        setPricingSuggestions([]);
        return;
      }

      // Generate pricing suggestions based on various factors
      const suggestions: PricingSuggestion[] = [];

      for (const spot of spots) {
        // Fetch recent bookings for this spot
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('spot_id', spot.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10);

        // Fetch nearby spots for comparison (simplified approach)
        const { data: nearbySpots } = await supabase
          .from('parking_spots')
          .select('price_per_hour, latitude, longitude')
          .eq('is_active', true)
          .neq('owner_id', user.id)
          .not('price_per_hour', 'is', null)
          .limit(20);

        const suggestion = generatePricingSuggestion(spot, bookings || [], nearbySpots || []);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }

      setPricingSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching pricing suggestions:', error);
      toast.error('Failed to load pricing suggestions');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketData = async () => {
    if (!user) return;
    
    try {
      // Fetch all user's spots to calculate market position
      const { data: userSpots } = await supabase
        .from('parking_spots')
        .select('price_per_hour, latitude, longitude')
        .eq('owner_id', user.id)
        .eq('is_active', true);

      if (!userSpots || userSpots.length === 0) return;

      // Calculate average user price
      const avgUserPrice = userSpots.reduce((sum, spot) => sum + (spot.price_per_hour || 0), 0) / userSpots.length;

      // Fetch nearby competitor prices (simplified approach)
      const { data: allSpots } = await supabase
        .from('parking_spots')
        .select('price_per_hour')
        .neq('owner_id', user.id)
        .eq('is_active', true)
        .not('price_per_hour', 'is', null);

      if (allSpots) {
        const competitorPrices = allSpots.map(spot => spot.price_per_hour).sort((a, b) => a - b);
        const avgPriceNearby = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
        
        // Calculate user's ranking
        const allPrices = [...competitorPrices, avgUserPrice].sort((a, b) => a - b);
        const yourRank = allPrices.indexOf(avgUserPrice) + 1;

        setMarketData({
          avgPriceNearby,
          totalNearbySpots: competitorPrices.length,
          yourRank,
          competitorPrices: competitorPrices.slice(0, 10) // Top 10 for display
        });
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const generatePricingSuggestion = (spot: any, bookings: any[], nearbySpots: any[]): PricingSuggestion | null => {
    const currentPrice = spot.price_per_hour || 0;
    
    if (currentPrice === 0) return null;

    // Calculate demand score based on recent bookings
    const recentBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return bookingDate > thirtyDaysAgo;
    });

    const demandScore = Math.min(recentBookings.length / 5, 1); // Normalize to 0-1

    // Calculate market position
    const nearbyPrices = nearbySpots
      .filter(s => s.price_per_hour && s.price_per_hour > 0)
      .map(s => s.price_per_hour);
    
    const avgNearbyPrice = nearbyPrices.length > 0 
      ? nearbyPrices.reduce((sum, price) => sum + price, 0) / nearbyPrices.length 
      : currentPrice;

    let suggestedPrice = currentPrice;
    let reason = '';
    let confidence: 'low' | 'medium' | 'high' = 'medium';

    // High demand, price below market
    if (demandScore > 0.7 && currentPrice < avgNearbyPrice * 0.9) {
      suggestedPrice = Math.min(avgNearbyPrice, currentPrice * 1.2);
      reason = 'High demand detected. You can increase prices to match market rates.';
      confidence = 'high';
    }
    // Low demand, price above market
    else if (demandScore < 0.3 && currentPrice > avgNearbyPrice * 1.1) {
      suggestedPrice = Math.max(avgNearbyPrice * 0.95, currentPrice * 0.9);
      reason = 'Low demand. Consider reducing price to attract more bookings.';
      confidence = 'medium';
    }
    // Market alignment
    else if (Math.abs(currentPrice - avgNearbyPrice) > avgNearbyPrice * 0.15) {
      suggestedPrice = avgNearbyPrice;
      reason = 'Align with market average for optimal bookings.';
      confidence = 'medium';
    }
    // No significant change needed
    else {
      suggestedPrice = currentPrice;
      reason = 'Current pricing is well-positioned for market conditions.';
      confidence = 'low';
    }

    const potentialIncrease = ((suggestedPrice - currentPrice) / currentPrice) * 100;

    return {
      spotId: spot.id,
      spotTitle: spot.title,
      currentPrice,
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      reason,
      potentialIncrease,
      confidence
    };
  };

  const updateSpotPrice = async (spotId: string, newPrice: number) => {
    try {
      setUpdatingPrices(prev => new Set(prev).add(spotId));
      
      const { error } = await supabase
        .from('parking_spots')
        .update({ price_per_hour: newPrice })
        .eq('id', spotId);

      if (error) throw error;

      toast.success('Price updated successfully!');
      
      // Refresh suggestions
      await fetchPricingSuggestions();
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    } finally {
      setUpdatingPrices(prev => {
        const next = new Set(prev);
        next.delete(spotId);
        return next;
      });
    }
  };

  if (!isPremium) {
    return (
      <Card className="border-amber-200">
        <CardContent className="p-6 text-center">
          <div className="text-amber-600 mb-4">
            <Target className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Smart Pricing Tools</h3>
          <p className="text-gray-600 mb-4">
            Upgrade to Premium to unlock AI-powered pricing recommendations based on market demand.
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-amber-600" />
            Smart Pricing Tools
          </CardTitle>
          <CardDescription>
            AI-powered pricing recommendations to maximize your earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Market Overview */}
          {marketData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Market Average</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${marketData.avgPriceNearby.toFixed(2)}/hr
                      </p>
                    </div>
                    <MapPin className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Your Market Rank</p>
                      <p className="text-2xl font-bold text-green-600">
                        #{marketData.yourRank}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Competitors</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {marketData.totalNearbySpots}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pricing Suggestions */}
          {pricingSuggestions.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                Pricing Recommendations
              </h3>
              
              {pricingSuggestions.map((suggestion) => (
                <Card key={suggestion.spotId}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{suggestion.spotTitle}</h4>
                        <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
                        
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Current</p>
                            <p className="text-lg font-semibold">
                              ${suggestion.currentPrice.toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="flex items-center">
                            {suggestion.potentialIncrease > 0 ? (
                              <ArrowUp className="w-4 h-4 text-green-500" />
                            ) : suggestion.potentialIncrease < 0 ? (
                              <ArrowDown className="w-4 h-4 text-red-500" />
                            ) : null}
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Suggested</p>
                            <p className="text-lg font-semibold text-blue-600">
                              ${suggestion.suggestedPrice.toFixed(2)}
                            </p>
                          </div>
                          
                          {suggestion.potentialIncrease !== 0 && (
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Change</p>
                              <p className={`text-sm font-semibold ${
                                suggestion.potentialIncrease > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {suggestion.potentialIncrease > 0 ? '+' : ''}
                                {suggestion.potentialIncrease.toFixed(1)}%
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              suggestion.confidence === 'high' ? 'default' : 
                              suggestion.confidence === 'medium' ? 'secondary' : 'outline'
                            }
                            className={
                              suggestion.confidence === 'high' ? 'bg-green-100 text-green-800' :
                              suggestion.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {suggestion.confidence} confidence
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        {suggestion.currentPrice !== suggestion.suggestedPrice && (
                          <Button
                            onClick={() => updateSpotPrice(suggestion.spotId, suggestion.suggestedPrice)}
                            disabled={updatingPrices.has(suggestion.spotId)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {updatingPrices.has(suggestion.spotId) ? 'Updating...' : 'Apply Price'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                No pricing recommendations available at this time. Make sure you have active parking spots with recent booking data.
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-6 flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => {
                fetchPricingSuggestions();
                fetchMarketData();
              }}
              disabled={loading}
            >
              Refresh Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartPricingTools;