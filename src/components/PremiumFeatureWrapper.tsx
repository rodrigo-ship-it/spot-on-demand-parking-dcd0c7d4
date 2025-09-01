import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PremiumSubscriptionDialog } from "@/components/PremiumSubscriptionDialog";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface PremiumFeatureWrapperProps {
  children: React.ReactNode;
  title: string;
  description: string;
  icon: React.ReactNode;
  requiresPremium?: boolean;
}

const PremiumFeatureWrapper: React.FC<PremiumFeatureWrapperProps> = ({
  children,
  title,
  description,
  icon,
  requiresPremium = true
}) => {
  const { isPremium, loading } = usePremiumStatus();

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

  if (requiresPremium && !isPremium) {
    return (
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            {icon}
            <span className="ml-2">{title}</span>
            <Badge variant="outline" className="ml-2 border-amber-200 text-amber-700">
              Premium Only
            </Badge>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="text-amber-600 mb-4">
            <Crown className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
          <p className="text-gray-600 mb-4">
            Upgrade to Premium to unlock this feature and maximize your parking spot potential.
          </p>
          <PremiumSubscriptionDialog>
            <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          </PremiumSubscriptionDialog>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

export default PremiumFeatureWrapper;