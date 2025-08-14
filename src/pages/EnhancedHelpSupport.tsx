import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageSquare, Phone, BookOpen, HelpCircle } from "lucide-react";
import { SupportTicketDialog } from "@/components/support/SupportTicketDialog";
import { HelpSearchDialog } from "@/components/support/HelpSearchDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

const EnhancedHelpSupport = () => {
  const { user } = useAuth();
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserTickets();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserTickets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching tickets:', error);
        return;
      }

      setUserTickets(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help & Support</h1>
          <p className="text-xl text-gray-600">Get the help you need, when you need it</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <HelpSearchDialog>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
              <CardContent className="p-6 text-center">
                <Search className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Search Help Articles</h3>
                <p className="text-sm text-muted-foreground">Find answers to common questions</p>
              </CardContent>
            </Card>
          </HelpSearchDialog>

          <SupportTicketDialog>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Submit Ticket</h3>
                <p className="text-sm text-muted-foreground">Get personalized support</p>
              </CardContent>
            </Card>
          </SupportTicketDialog>

          <Card className="border-2 hover:border-primary/20 hover:shadow-lg transition-all">
            <CardContent className="p-6 text-center">
              <Phone className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Call Support</h3>
              <p className="text-sm text-muted-foreground mb-3">Speak with our team</p>
              <Button variant="outline" size="sm">
                1-800-ARRIV-1
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="help" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="help">Help Center</TabsTrigger>
            <TabsTrigger value="tickets">My Tickets</TabsTrigger>
            <TabsTrigger value="contact">Contact Info</TabsTrigger>
          </TabsList>

          <TabsContent value="help">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Popular Topics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <h4 className="font-medium">How to Book a Parking Spot</h4>
                      <p className="text-sm text-muted-foreground">Step-by-step booking guide</p>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <h4 className="font-medium">Cancellation Policy</h4>
                      <p className="text-sm text-muted-foreground">Refund policies and timelines</p>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <h4 className="font-medium">Payment Issues</h4>
                      <p className="text-sm text-muted-foreground">Troubleshooting payment problems</p>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <h4 className="font-medium">Listing Your Spot</h4>
                      <p className="text-sm text-muted-foreground">How to become a spot owner</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Quick Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tip</h4>
                      <p className="text-sm text-blue-700">
                        Book in advance to get the best rates and ensure availability during peak hours.
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">⚡ Quick Access</h4>
                      <p className="text-sm text-green-700">
                        Use QR codes for instant spot access without waiting for confirmation.
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">💰 Save Money</h4>
                      <p className="text-sm text-purple-700">
                        Check for promotional codes and off-peak pricing to reduce costs.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Your Support Tickets</CardTitle>
                <CardDescription>
                  Track your support requests and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Please sign in to view your support tickets</p>
                  </div>
                ) : loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading tickets...</p>
                  </div>
                ) : userTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No support tickets found</p>
                    <p className="text-sm">Submit a ticket to get help with any issues</p>
                    <SupportTicketDialog>
                      <Button className="mt-4">
                        Submit Your First Ticket
                      </Button>
                    </SupportTicketDialog>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userTickets.map((ticket) => (
                      <div key={ticket.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{ticket.subject}</h4>
                            <p className="text-sm text-muted-foreground">
                              Ticket #{ticket.ticket_number}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(ticket.created_at).toLocaleDateString()} • 
                          Updated: {new Date(ticket.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">📧 Email Support</h4>
                    <p className="text-sm text-muted-foreground">support@arriv.com</p>
                    <p className="text-xs text-muted-foreground">Response within 24 hours</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">📞 Phone Support</h4>
                    <p className="text-sm text-muted-foreground">1-800-ARRIV-1 (1-800-277-481)</p>
                    <p className="text-xs text-muted-foreground">Mon-Fri: 8 AM - 8 PM PST</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">💬 Live Chat</h4>
                    <p className="text-sm text-muted-foreground">Available during support hours</p>
                    <p className="text-xs text-muted-foreground">Average wait time: 2 minutes</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-700">Emergency Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-600 mb-4">
                    For urgent issues like safety concerns, unauthorized access, or payment disputes during active bookings:
                  </p>
                  <Button variant="destructive" className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Emergency: 1-800-URGENT-1
                  </Button>
                  <p className="text-xs text-red-500 mt-2">Available 24/7</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedHelpSupport;