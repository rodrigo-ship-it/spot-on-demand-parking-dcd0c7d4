import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, Star, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PremiumBadge } from './PremiumBadge';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

interface PremiumSubscriptionDialogProps {
  children: React.ReactNode;
}

export const PremiumSubscriptionDialog = ({ children }: PremiumSubscriptionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { isPremium, loading: premiumLoading } = usePremiumStatus();

  const handleSubscribe = async () => {
    if (isPremium) {
      toast.info('You already have an active premium subscription');
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-premium-subscription');
      
      if (error) throw error;
      
      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        setOpen(false);
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('premium-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        setOpen(false);
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast.error('Failed to open subscription management');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Crown, text: "Premium badge on all your parking spots" },
    { icon: Star, text: "Priority placement in search results" },
    { icon: Check, text: "Enhanced visibility to renters" },
    { icon: Check, text: "Stand out from regular listings" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-amber-600 fill-amber-600" />
            {isPremium ? "Premium Active" : "Go Premium"}
          </DialogTitle>
          <DialogDescription>
            {isPremium 
              ? "You're already enjoying all premium benefits" 
              : "Upgrade to a premium lister account for just $5/month"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Pricing */}
          <div className="text-center bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-lg border border-amber-200">
            <div className="text-3xl font-bold text-amber-800">$5</div>
            <div className="text-amber-600">per month</div>
            <div className="mt-2">
              <PremiumBadge size="sm" />
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">What you get:</h4>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <benefit.icon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{benefit.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            {isPremium ? (
              <Button 
                onClick={handleManageSubscription} 
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700"
              >
                {loading ? "Loading..." : (
                  <>
                    Manage Subscription
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleSubscribe} 
                disabled={loading || premiumLoading}
                className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700"
              >
                {loading ? "Processing..." : "Subscribe Now"}
              </Button>
            )}
            <p className="text-xs text-gray-500 text-center">
              {isPremium 
                ? "Manage your subscription or cancel anytime via Stripe." 
                : "Cancel anytime. Secure payment processed by Stripe."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};