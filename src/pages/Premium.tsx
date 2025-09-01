import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import PremiumDashboard from "@/components/PremiumDashboard";
import PremiumAnalytics from "@/components/PremiumAnalytics";
import SmartPricingTools from "@/components/SmartPricingTools";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const Premium = () => {
  const { isPremium, loading } = usePremiumStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center">
                <Crown className="w-6 h-6 text-amber-600 mr-2" />
                <h1 className="text-2xl font-bold text-gray-900">Premium Features</h1>
                {isPremium && (
                  <div className="ml-3 px-3 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 rounded-full">
                    <span className="text-sm font-medium text-amber-800">Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              {isPremium ? 'Welcome to Premium' : 'Unlock Premium Features'}
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 max-w-2xl mx-auto">
              {isPremium 
                ? 'Access all your premium tools and analytics to maximize your parking spot earnings.'
                : 'Supercharge your parking spot business with advanced analytics, reduced fees, and smart pricing tools.'
              }
            </CardDescription>
          </CardHeader>
          {!isPremium && (
            <CardContent className="text-center pb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                <Crown className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-gray-600 mb-6">
                Join thousands of successful parking spot owners earning more with Premium
              </p>
              <div className="bg-white rounded-lg p-6 max-w-md mx-auto border border-amber-200">
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-gray-900">$5</span>
                  <span className="text-gray-600 ml-1">/month</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Cancel anytime. No hidden fees.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Premium Dashboard - Feature Overview */}
        <PremiumDashboard />

        {/* Premium Features - Only show if user has premium */}
        {isPremium && (
          <>
            {/* Advanced Analytics */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Crown className="w-5 h-5 text-amber-600 mr-2" />
                Your Premium Analytics
              </h2>
              <PremiumAnalytics />
            </div>

            {/* Smart Pricing Tools */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Crown className="w-5 h-5 text-amber-600 mr-2" />
                Smart Pricing Recommendations
              </h2>
              <SmartPricingTools />
            </div>
          </>
        )}

        {/* Call to Action for Non-Premium Users */}
        {!isPremium && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="text-center py-12">
              <Crown className="w-16 h-16 text-blue-600 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Maximize Your Earnings?
              </h3>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Get started with Premium to access advanced tools and maximize your parking spot potential.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Premium;