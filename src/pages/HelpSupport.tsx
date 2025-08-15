import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Phone, Clock, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  type: "general" | "support" | "billing" | "bug";
}

const HelpSupport = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
    type: "general"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitted(true);
      toast.success("Message sent! We'll get back to you soon.");
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Message Sent!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for contacting us. We'll get back to you within 24 hours.
            </p>
            <Button onClick={() => setSubmitted(false)} className="w-full">
              Send Another Message
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
          <p className="text-gray-600">Get help with your Arriv parking experience</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="type">Type of Inquiry</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { value: "general", label: "General Question" },
                      { value: "support", label: "Technical Support" },
                      { value: "billing", label: "Billing Issue" },
                      { value: "bug", label: "Report Bug" }
                    ].map((type) => (
                      <Badge
                        key={type.value}
                        variant={formData.type === type.value ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleInputChange('type', type.value)}
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Describe your issue or question..."
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Help */}
          <div className="space-y-6">
            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">How do I book a parking spot?</h4>
                  <p className="text-sm text-gray-600">
                    Search for parking spots on the homepage, select your dates and times, and complete payment. You'll receive a booking confirmation and can manage your reservation from the "My Bookings" page.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">How do I extend my parking time?</h4>
                  <p className="text-sm text-gray-600">
                    Go to "My Bookings" and click "Manage Time" on active reservations. You can extend your booking to avoid overstay penalties.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Can I cancel my booking?</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>Yes, you can request refunds based on our cancellation policy:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><strong>24+ hours in advance:</strong> 100% refund, no fees</li>
                      <li><strong>3-24 hours in advance:</strong> 90% refund (10% cancellation fee, max $5)</li>
                      <li><strong>Less than 3 hours:</strong> No refund due to short notice</li>
                    </ul>
                    <p className="text-xs">Use the "Request Refund" button in your bookings to start the process.</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">How do I rent using a QR code?</h4>
                  <p className="text-sm text-gray-600">
                    Scan the QR code at the parking location to instantly book that spot. This provides quick access for spontaneous parking needs.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">How do I list my parking spot?</h4>
                  <p className="text-sm text-gray-600">
                    Click "List Your Spot" from the homepage, provide details about your space, upload photos, set pricing, and define availability. You can manage all your spots from "Manage Spots".
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">How do I get paid as a spot owner?</h4>
                  <p className="text-sm text-gray-600">
                    Connect your Stripe account through your profile to receive payments. Earnings are processed automatically after each completed booking.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">What if there's a dispute?</h4>
                  <p className="text-sm text-gray-600">
                    Use the "Report Issue" feature in your bookings to document problems with photos. Our team will review and resolve disputes fairly.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Other Ways to Reach Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-blue-500" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-gray-600">support@arriv.app</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-3 text-purple-500" />
                  <div>
                    <p className="font-medium">In-App Support</p>
                    <p className="text-sm text-gray-600">Use the contact form above for fastest response</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-3 text-orange-500" />
                  <div>
                    <p className="font-medium">Response Time</p>
                    <p className="text-sm text-gray-600">We typically respond within 24 hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-700">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-blue-600">
                  <p>• Check your email for booking confirmations and receipts</p>
                  <p>• Use QR codes for instant parking when available</p>
                  <p>• Enable notifications to get updates about your bookings</p>
                  <p>• Rate your experience to help improve the community</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;