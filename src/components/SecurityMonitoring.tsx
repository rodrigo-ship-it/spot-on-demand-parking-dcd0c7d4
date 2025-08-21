import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Activity, FileText, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface SecurityEvent {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  user_id?: string;
  ip_address?: string | null;
}

interface AdminAction {
  id: string;
  action: string;
  target_user_id?: string;
  target_resource?: string;
  details: any;
  created_at: string;
  admin_user_id: string;
}

export const SecurityMonitoring: React.FC = () => {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadSecurityData();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      setIsAdmin(roles && roles.length > 0);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      // Load recent security events
      const { data: events } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Load recent admin actions
      const { data: actions } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setSecurityEvents((events || []).map(event => ({
        ...event,
        ip_address: event.ip_address ? String(event.ip_address) : null
      })));
      setAdminActions(actions || []);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (eventType: string) => {
    if (eventType.includes('critical') || eventType.includes('unauthorized')) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (eventType.includes('warning') || eventType.includes('suspicious')) {
      return <Badge variant="default">Warning</Badge>;
    }
    return <Badge variant="secondary">Info</Badge>;
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Admin access required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Security Monitoring
        </h2>
        <Button onClick={loadSecurityData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Security Events
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Admin Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {securityEvents.map((event) => (
                    <div key={event.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getSeverityBadge(event.event_type)}
                          <span className="font-medium">{formatEventType(event.event_type)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </p>
                        {event.ip_address && (
                          <p className="text-xs text-muted-foreground">IP: {event.ip_address}</p>
                        )}
                        {event.event_data && Object.keys(event.event_data).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Event Details
                            </summary>
                            <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                              {JSON.stringify(event.event_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Admin Actions Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {adminActions.map((action) => (
                    <div key={action.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">{formatEventType(action.action)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {format(new Date(action.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </p>
                        {action.target_resource && (
                          <p className="text-xs text-muted-foreground">
                            Resource: {action.target_resource}
                          </p>
                        )}
                        {action.details && Object.keys(action.details).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Action Details
                            </summary>
                            <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                              {JSON.stringify(action.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};