import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Activity, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface ScrapingActivity {
  ip_address: unknown;
  user_id: string | null;
  request_count: number;
  first_request: string;
  last_request: string;
  risk_level: string;
}

export const SecurityMonitoringDashboard: React.FC = () => {
  const [scrapingActivity, setScrapingActivity] = useState<ScrapingActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScrapingActivity = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_potential_scraping_activity');
      
      if (error) throw error;
      
      setScrapingActivity(data || []);
      toast.success('Security data refreshed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch security data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScrapingActivity();
  }, []);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4" />;
      case 'MEDIUM':
        return <Eye className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Security Monitoring</h2>
        </div>
        <Button 
          onClick={fetchScrapingActivity} 
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Potential Scraping Activity (Last 24 Hours)
            </CardTitle>
            <CardDescription>
              Monitoring for unusual access patterns that might indicate data scraping attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading security data...</span>
              </div>
            ) : scrapingActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">No suspicious activity detected</p>
                <p className="text-sm">Your parking data appears to be secure</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scrapingActivity.map((activity, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 border rounded-lg bg-card/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRiskLevelIcon(activity.risk_level)}
                        <Badge variant={getRiskLevelColor(activity.risk_level) as any}>
                          {activity.risk_level}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="font-mono text-sm">
                          IP: {String(activity.ip_address)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {activity.request_count} requests between{' '}
                          {new Date(activity.first_request).toLocaleTimeString()} and{' '}
                          {new Date(activity.last_request).toLocaleTimeString()}
                        </div>
                        {activity.user_id && (
                          <div className="text-xs text-muted-foreground">
                            User ID: {activity.user_id}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {activity.request_count}
                      </div>
                      <div className="text-xs text-muted-foreground">requests</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Measures Active</CardTitle>
            <CardDescription>
              Current security protections for your parking data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Shield className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-800">Rate Limiting Active</div>
                  <div className="text-sm text-green-600">Max 100 requests per hour per IP</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Activity className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-800">Access Logging</div>
                  <div className="text-sm text-blue-600">All parking data access is monitored</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Eye className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-medium text-purple-800">Owner Data Protection</div>
                  <div className="text-sm text-purple-600">Owner IDs hidden from public access</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};