
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Bell, CreditCard, Shield, Save, Phone, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";

import { PaymentMethodDialog } from "@/components/PaymentMethodDialog";
import { PayoutSettingsDialog } from "@/components/PayoutSettingsDialog";
import { TermsAcceptanceStatus } from "@/components/TermsAcceptanceStatus";
import { EmailVerification } from "@/components/EmailVerification";
import { NotificationSettings } from "@/components/NotificationSettings";

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatarUrl: ""
  });

  const [notifications, setNotifications] = useState({
    bookingUpdates: true,
    paymentReminders: true,
    promotionalEmails: false,
    weeklyReports: true,
    mobileNotifications: true
  });

  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    loginAlerts: true
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            throw error;
          }

          if (profile) {
            const names = (profile.full_name || '').split(' ');
            setProfileData({
              firstName: names[0] || '',
              lastName: names.slice(1).join(' ') || '',
              email: profile.email || user.email || '',
              phone: profile.phone || '',
              avatarUrl: profile.avatar_url || ''
            });
          } else {
            // Create profile if it doesn't exist
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([{
                user_id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || ''
              }]);

            if (insertError) {
              console.error('Error creating profile:', insertError);
            }

            const names = (user.user_metadata?.full_name || '').split(' ');
            setProfileData({
              firstName: names[0] || '',
              lastName: names.slice(1).join(' ') || '',
              email: user.email || '',
              phone: '',
              avatarUrl: ''
            });
          }
        } catch (error) {
          console.error('Error loading profile:', error);
          toast.error('Failed to load profile data');
        } finally {
          setLoading(false);
        }
      }
    };

    loadProfile();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: profileData.email,
          full_name: `${profileData.firstName} ${profileData.lastName}`.trim(),
          phone: profileData.phone
        });

      if (error) throw error;

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-4">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
                <img 
                  src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
                  alt="Arriv Logo" 
                  className="w-16 h-16 hover:drop-shadow-lg transition-all duration-200"
                />
              </Link>
            </div>
          <div className="flex items-center space-x-4">
            <NotificationSettings />
            <TermsAcceptanceStatus />
            <Button size="sm" onClick={handleSignOut}>Sign Out</Button>
          </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Profile Settings</h1>
          <p className="text-xl text-gray-600">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="space-y-6">
          {/* Email Verification */}
          <EmailVerification />

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and profile details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <ProfilePhotoUpload 
                currentPhotoUrl={profileData.avatarUrl}
                onPhotoUpdated={(photoUrl) => setProfileData(prev => ({...prev, avatarUrl: photoUrl}))}
              />

              <Separator />

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>


              <Button onClick={handleSaveProfile}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you'd like to receive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Booking Updates</Label>
                  <p className="text-sm text-gray-600">Get notified about new bookings and changes</p>
                </div>
                <Switch
                  checked={notifications.bookingUpdates}
                  onCheckedChange={(checked) => setNotifications({...notifications, bookingUpdates: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Payment Reminders</Label>
                  <p className="text-sm text-gray-600">Receive reminders about pending payments</p>
                </div>
                <Switch
                  checked={notifications.paymentReminders}
                  onCheckedChange={(checked) => setNotifications({...notifications, paymentReminders: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Promotional Emails</Label>
                  <p className="text-sm text-gray-600">Receive updates about new features and promotions</p>
                </div>
                <Switch
                  checked={notifications.promotionalEmails}
                  onCheckedChange={(checked) => setNotifications({...notifications, promotionalEmails: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-gray-600">Get weekly summaries of your earnings and bookings</p>
                </div>
                <Switch
                  checked={notifications.weeklyReports}
                  onCheckedChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Mobile Notifications</Label>
                  <p className="text-sm text-gray-600">Receive push notifications on your mobile device</p>
                </div>
                <Switch
                  checked={notifications.mobileNotifications}
                  onCheckedChange={(checked) => setNotifications({...notifications, mobileNotifications: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                </div>
                <Switch
                  checked={security.twoFactorAuth}
                  onCheckedChange={(checked) => setSecurity({...security, twoFactorAuth: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Login Alerts</Label>
                  <p className="text-sm text-gray-600">Get notified when someone logs into your account</p>
                </div>
                <Switch
                  checked={security.loginAlerts}
                  onCheckedChange={(checked) => setSecurity({...security, loginAlerts: checked})}
                />
              </div>

              <Separator />
              
              <div className="space-y-2">
                <PasswordChangeDialog>
                  <Button variant="outline" className="w-full">
                    Change Password
                  </Button>
                </PasswordChangeDialog>
                
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => toast.info("Account deletion requires contacting support")}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Manage your payment methods and payout preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Bank Account</p>
                    <p className="text-sm text-gray-600">****1234 - Chase Bank</p>
                  </div>
                  <PaymentMethodDialog onPaymentMethodSelect={() => {}} selectedMethod={null}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </PaymentMethodDialog>
                </div>
              </div>

              <div className="flex space-x-2">
                <PaymentMethodDialog onPaymentMethodSelect={() => {}} selectedMethod={null}>
                  <Button variant="outline" className="flex-1">
                    Manage Payment Methods
                  </Button>
                </PaymentMethodDialog>
                
                <PayoutSettingsDialog>
                  <Button variant="outline" className="flex-1">
                    Payout Settings
                  </Button>
                </PayoutSettingsDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
