import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, UserCheck, AlertTriangle } from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  assigned_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export const UserRoleManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    if (isAdmin) {
      loadUserRoles();
    }
  }, [isAdmin, user]);

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

  const loadUserRoles = async () => {
    try {
      // First get user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('assigned_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Then get profiles separately
      const userIds = rolesData?.map(role => role.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const combinedData = rolesData?.map(role => ({
        ...role,
        profiles: profilesData?.find(p => p.user_id === role.user_id) || { full_name: 'Unknown', email: 'Unknown' }
      })) || [];

      setUserRoles(combinedData);
    } catch (error) {
      console.error('Error loading user roles:', error);
      toast({
        title: "Error",
        description: "Failed to load user roles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'moderator' | 'user') => {
    try {
      // Remove existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Add new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newRole,
          assigned_by: user?.id
        });

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: 'role_change',
        p_target_user_id: userId,
        p_details: { new_role: newRole }
      });

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });

      loadUserRoles();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'default';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'moderator': return <UserCheck className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          User Role Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="space-y-4">
            {userRoles.map((userRole) => (
              <div key={userRole.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getRoleIcon(userRole.role)}
                  <div>
                    <p className="font-medium">{userRole.profiles?.full_name || 'Unknown User'}</p>
                    <p className="text-sm text-muted-foreground">{userRole.profiles?.email}</p>
                  </div>
                  <Badge variant={getRoleBadgeVariant(userRole.role)}>
                    {userRole.role}
                  </Badge>
                </div>
                <Select
                  value={userRole.role}
                  onValueChange={(newRole: 'admin' | 'moderator' | 'user') => 
                    updateUserRole(userRole.user_id, newRole)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};