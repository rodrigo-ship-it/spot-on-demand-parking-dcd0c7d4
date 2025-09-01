import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { PremiumSubscriptionDialog } from "@/components/PremiumSubscriptionDialog";
import { 
  Crown, 
  TrendingUp, 
  Star, 
  Zap, 
  DollarSign, 
  FileText, 
  Headphones,
  Settings,
  Calendar,
  Target,
  BarChart3,
  Download
} from "lucide-react";

const PremiumDashboard = () => {
  const { isPremium, loading } = usePremiumStatus();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const premiumFeatures = [
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Advanced Analytics",
      description: "Detailed insights into earnings, booking patterns, and peak demand times",
      status: isPremium ? "available" : "locked"
    },
    {
      icon: <Star className="w-5 h-5" />,
      title: "Priority Listing",
      description: "Your spots appear higher in search results for better visibility",
      status: isPremium ? "active" : "locked"
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: "Smart Pricing Tools",
      description: "AI-powered pricing recommendations based on demand and competition",
      status: isPremium ? "available" : "locked"
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      title: "Reduced Fees",
      description: "Pay 5% platform fees instead of 7% on all bookings",
      status: isPremium ? "active" : "locked"
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      title: "Bulk Management",
      description: "Update pricing, availability, and settings across multiple spots",
      status: isPremium ? "available" : "locked"
    },
    {
      icon: <Download className="w-5 h-5" />,
      title: "Data Export",
      description: "Export detailed reports and analytics for tax and accounting purposes",
      status: isPremium ? "available" : "locked"
    },
    {
      icon: <Headphones className="w-5 h-5" />,
      title: "Priority Support",
      description: "24/7 premium support with faster response times",
      status: isPremium ? "active" : "locked"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Early Access",
      description: "Be the first to try new features and improvements",
      status: isPremium ? "active" : "locked"
    }
  ];

  return (
    <Card className={isPremium ? "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Crown className="w-6 h-6 mr-2 text-amber-600" />
            Premium Features
            {isPremium && <PremiumBadge className="ml-2" size="sm" />}
          </div>
          {!isPremium && (
            <PremiumSubscriptionDialog>
              <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </PremiumSubscriptionDialog>
          )}
        </CardTitle>
        <CardDescription>
          {isPremium 
            ? "You have access to all premium features. Maximize your parking spot earnings!"
            : "Unlock advanced tools and features to maximize your parking spot potential."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPremium && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800 mb-1">Premium Active</h4>
                <p className="text-sm text-green-600">You're saving on fees and earning more with premium tools!</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                <Crown className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {premiumFeatures.map((feature, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                feature.status === 'active' 
                  ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200' 
                  : feature.status === 'available'
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${
                  feature.status === 'locked' 
                    ? 'bg-gray-200 text-gray-400' 
                    : feature.status === 'active'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {feature.icon}
                </div>
                <Badge 
                  variant={feature.status === 'locked' ? 'secondary' : 'default'}
                  className={
                    feature.status === 'active' 
                      ? 'bg-amber-100 text-amber-800 border-amber-200' 
                      : feature.status === 'available'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-gray-100 text-gray-600'
                  }
                >
                  {feature.status === 'active' ? 'Active' : 
                   feature.status === 'available' ? 'Available' : 'Premium Only'}
                </Badge>
              </div>
              <h4 className="font-semibold mb-1">{feature.title}</h4>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {isPremium && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">Coming Soon</h4>
                <p className="text-sm text-blue-600">More premium features are being developed. Stay tuned!</p>
              </div>
              <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Settings className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
            </div>
          </div>
        )}

        {!isPremium && (
          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">
              Join thousands of successful parking spot owners who earn more with Premium
            </p>
            <PremiumSubscriptionDialog>
              <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white">
                <Crown className="w-4 h-4 mr-2" />
                Start Premium Trial - $5/month
              </Button>
            </PremiumSubscriptionDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PremiumDashboard;