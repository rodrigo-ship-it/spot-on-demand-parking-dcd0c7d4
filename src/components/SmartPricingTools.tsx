import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, TrendingUp, DollarSign, MapPin, Lightbulb, ArrowUp, ArrowDown, Building2 } from "lucide-react";
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
  city: string;
  pricingType: string;
  competitorCount: number;
}

interface MarketData {
  avgPriceNearby: number;
  totalNearbySpots: number;
  yourRank: number;
  competitorPrices: number[];
  citySummary: Record<string, { count: number; avgPrice: number }>;
}

// Extract city from address - looks for common patterns
const extractCityFromAddress = (address: string): string => {
  if (!address) return 'Unknown';
  
  // Common patterns: "123 Main St, Dallas, TX 75201" or "Dallas, TX" or "Dallas TX"
  const parts = address.split(',').map(p => p.trim());
  
  if (parts.length >= 2) {
    // Usually city is second to last or before state/zip
    const potentialCity = parts[parts.length - 2] || parts[parts.length - 1];
    // Remove state abbreviation and zip if present
    const cityClean = potentialCity.replace(/\b[A-Z]{2}\b\s*\d{5}(-\d{4})?/g, '').trim();
    if (cityClean) return cityClean;
  }
  
  // Fallback: try to find city before state abbreviation
  const stateMatch = address.match(/([^,]+),?\s*[A-Z]{2}\s*\d{5}/);
  if (stateMatch) {
    return stateMatch[1].trim();
  }
  
  return parts[0] || 'Unknown';
};

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

      // Fetch ALL active spots for comparison (we'll filter by city + type)
      const { data: allSpots } = await supabase
        .from('parking_spots')
        .select('id, address, pricing_type, price_per_hour, daily_price, monthly_price, one_time_price')
        .eq('is_active', true)
        .neq('owner_id', user.id);

      const suggestions: PricingSuggestion[] = [];

      for (const spot of spots) {
        // Fetch recent bookings for this spot
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('spot_id', spot.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);

        // Filter competitors by SAME CITY and SAME PRICING TYPE
        const spotCity = extractCityFromAddress(spot.address);
        const spotPricingType = spot.pricing_type || 'hourly';
        
        const matchingSpots = (allSpots || []).filter(s => {
          const sCity = extractCityFromAddress(s.address);
          const sPricingType = s.pricing_type || 'hourly';
          return sCity.toLowerCase() === spotCity.toLowerCase() && sPricingType === spotPricingType;
        });

        const suggestion = generatePricingSuggestion(spot, bookings || [], matchingSpots, spotCity, spotPricingType);
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
      // Fetch all user's spots
      const { data: userSpots } = await supabase
        .from('parking_spots')
        .select('price_per_hour, daily_price, monthly_price, one_time_price, pricing_type, address')
        .eq('owner_id', user.id)
        .eq('is_active', true);

      if (!userSpots || userSpots.length === 0) return;

      // Get user's cities
      const userCities = [...new Set(userSpots.map(s => extractCityFromAddress(s.address).toLowerCase()))];

      // Fetch all competitor spots
      const { data: allSpots } = await supabase
        .from('parking_spots')
        .select('price_per_hour, daily_price, monthly_price, one_time_price, pricing_type, address')
        .neq('owner_id', user.id)
        .eq('is_active', true);

      if (!allSpots) return;

      // Group by city for summary
      const citySummary: Record<string, { count: number; avgPrice: number; totalPrice: number }> = {};
      
      allSpots.forEach(spot => {
        const city = extractCityFromAddress(spot.address);
        if (!citySummary[city]) {
          citySummary[city] = { count: 0, avgPrice: 0, totalPrice: 0 };
        }
        const price = spot.price_per_hour || spot.daily_price || spot.monthly_price || 0;
        citySummary[city].count++;
        citySummary[city].totalPrice += price;
      });

      // Calculate averages
      Object.keys(citySummary).forEach(city => {
        citySummary[city].avgPrice = citySummary[city].totalPrice / citySummary[city].count;
      });

      // Filter to spots in user's cities for ranking
      const relevantSpots = allSpots.filter(s => 
        userCities.includes(extractCityFromAddress(s.address).toLowerCase())
      );

      const competitorPrices = relevantSpots
        .map(spot => spot.price_per_hour || spot.daily_price || 0)
        .filter(p => p > 0)
        .sort((a, b) => a - b);

      const avgUserPrice = userSpots.reduce((sum, spot) => 
        sum + (spot.price_per_hour || spot.daily_price || 0), 0
      ) / userSpots.length;

      const avgPriceNearby = competitorPrices.length > 0
        ? competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length
        : avgUserPrice;

      const allPrices = [...competitorPrices, avgUserPrice].sort((a, b) => a - b);
      const yourRank = allPrices.indexOf(avgUserPrice) + 1;

      setMarketData({
        avgPriceNearby,
        totalNearbySpots: relevantSpots.length,
        yourRank,
        competitorPrices: competitorPrices.slice(0, 10),
        citySummary
      });
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const generatePricingSuggestion = (
    spot: any, 
    bookings: any[], 
    matchingSpots: any[],
    city: string,
    pricingType: string
  ): PricingSuggestion | null => {
    // Get the appropriate price based on pricing type
    let currentPrice = 0;
    let priceField = 'price_per_hour';
    
    switch (pricingType) {
      case 'hourly':
        currentPrice = spot.price_per_hour || 0;
        priceField = 'price_per_hour';
        break;
      case 'daily':
        currentPrice = spot.daily_price || 0;
        priceField = 'daily_price';
        break;
      case 'monthly':
        currentPrice = spot.monthly_price || 0;
        priceField = 'monthly_price';
        break;
      case 'one_time':
        currentPrice = spot.one_time_price || 0;
        priceField = 'one_time_price';
        break;
      default:
        currentPrice = spot.price_per_hour || 0;
    }
    
    if (currentPrice === 0) return null;

    // Calculate demand score based on recent bookings (last 30 days)
    const recentBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return bookingDate > thirtyDaysAgo;
    });

    const demandScore = Math.min(recentBookings.length / 5, 1); // Normalize to 0-1

    // Calculate market position using ONLY spots in same city with same pricing type
    const matchingPrices = matchingSpots
      .map(s => {
        switch (pricingType) {
          case 'hourly': return s.price_per_hour;
          case 'daily': return s.daily_price;
          case 'monthly': return s.monthly_price;
          case 'one_time': return s.one_time_price;
          default: return s.price_per_hour;
        }
      })
      .filter(p => p && p > 0);
    
    const avgMarketPrice = matchingPrices.length > 0 
      ? matchingPrices.reduce((sum, price) => sum + price, 0) / matchingPrices.length 
      : currentPrice;

    let suggestedPrice = currentPrice;
    let reason = '';
    let confidence: 'low' | 'medium' | 'high' = 'medium';

    const competitorCount = matchingSpots.length;

    if (competitorCount === 0) {
      // No competitors in same city with same type
      reason = `No ${pricingType} competitors found in ${city}. Your pricing stands alone in this market.`;
      confidence = 'low';
    } else if (demandScore > 0.7 && currentPrice < avgMarketPrice * 0.9) {
      // High demand, price below market
      suggestedPrice = Math.min(avgMarketPrice, currentPrice * 1.2);
      reason = `High demand in ${city}! You can increase your ${pricingType} price to match ${competitorCount} similar spots.`;
      confidence = 'high';
    } else if (demandScore < 0.3 && currentPrice > avgMarketPrice * 1.1) {
      // Low demand, price above market
      suggestedPrice = Math.max(avgMarketPrice * 0.95, currentPrice * 0.9);
      reason = `Low demand. Your ${pricingType} price is above ${competitorCount} competitors in ${city}.`;
      confidence = 'medium';
    } else if (Math.abs(currentPrice - avgMarketPrice) > avgMarketPrice * 0.15) {
      // Market alignment needed
      suggestedPrice = avgMarketPrice;
      reason = `Align with ${city}'s ${pricingType} market average (${competitorCount} spots analyzed).`;
      confidence = 'medium';
    } else {
      // Well positioned
      suggestedPrice = currentPrice;
      reason = `Well-positioned for ${pricingType} spots in ${city} (${competitorCount} competitors).`;
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
      confidence,
      city,
      pricingType,
      competitorCount
    };
  };

  const updateSpotPrice = async (spotId: string, newPrice: number, pricingType: string) => {
    try {
      setUpdatingPrices(prev => new Set(prev).add(spotId));
      
      // Update the correct price field based on pricing type
      let updateField = {};
      switch (pricingType) {
        case 'hourly':
          updateField = { price_per_hour: newPrice };
          break;
        case 'daily':
          updateField = { daily_price: newPrice };
          break;
        case 'monthly':
          updateField = { monthly_price: newPrice };
          break;
        case 'one_time':
          updateField = { one_time_price: newPrice };
          break;
        default:
          updateField = { price_per_hour: newPrice };
      }

      const { error } = await supabase
        .from('parking_spots')
        .update(updateField)
        .eq('id', spotId);

      if (error) throw error;

      toast.success('Price updated successfully!');
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

  const getPricingTypeLabel = (type: string) => {
    switch (type) {
      case 'hourly': return '/hr';
      case 'daily': return '/day';
      case 'monthly': return '/mo';
      case 'one_time': return ' flat';
      default: return '/hr';
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
            AI-powered pricing recommendations comparing spots in the same city with the same pricing type
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
                      <p className="text-sm text-gray-600">Local Market Avg</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${marketData.avgPriceNearby.toFixed(2)}
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
                      <p className="text-sm text-gray-600">Local Competitors</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {marketData.totalNearbySpots}
                      </p>
                    </div>
                    <Building2 className="w-8 h-8 text-purple-600" />
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
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{suggestion.spotTitle}</h4>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.city}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.pricingType}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
                        
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Current</p>
                            <p className="text-lg font-semibold">
                              ${suggestion.currentPrice.toFixed(2)}{getPricingTypeLabel(suggestion.pricingType)}
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
                              ${suggestion.suggestedPrice.toFixed(2)}{getPricingTypeLabel(suggestion.pricingType)}
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
                          <span className="text-xs text-gray-500">
                            Based on {suggestion.competitorCount} {suggestion.pricingType} spots in {suggestion.city}
                          </span>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        {suggestion.currentPrice !== suggestion.suggestedPrice && (
                          <Button
                            onClick={() => updateSpotPrice(suggestion.spotId, suggestion.suggestedPrice, suggestion.pricingType)}
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
