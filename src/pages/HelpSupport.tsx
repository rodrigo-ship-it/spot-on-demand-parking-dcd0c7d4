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
          <p className="text-gray-600">Get help with your parking experience</p>
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
                    Browse available spots on our homepage, select your preferred time, and complete the booking process with secure payment.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Can I cancel my booking?</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>Yes, you can cancel bookings with the following refund policy:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><strong>24+ hours in advance:</strong> 100% refund, no fees</li>
                      <li><strong>3-24 hours in advance:</strong> 90% refund (10% cancellation fee, max $5)</li>
                      <li><strong>Less than 3 hours:</strong> No refund due to short notice</li>
                    </ul>
                    <p className="text-xs">This policy ensures spot owners have time to relist their spots.</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">What if I'm running late?</h4>
                  <p className="text-sm text-gray-600">
                    Use our auto-extension feature or manually extend your booking through the app to avoid overstay fees.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">How do I list my parking spot?</h4>
                  <p className="text-sm text-gray-600">
                    Click "List Your Spot" on the homepage, fill out the details, upload photos, and set your pricing.
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
                    <p className="text-sm text-gray-600">support@arriv.com</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 mr-3 text-green-500" />
                  <div>
                    <p className="font-medium">Phone Support</p>
                    <p className="text-sm text-gray-600">1-800-ARRIV-1 (1-800-277-481)</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-3 text-orange-500" />
                  <div>
                    <p className="font-medium">Support Hours</p>
                    <p className="text-sm text-gray-600">Mon-Fri: 8 AM - 8 PM PST</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-3 text-purple-500" />
                  <div>
                    <p className="font-medium">Live Chat</p>
                    <p className="text-sm text-gray-600">Available during support hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700">Emergency Assistance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600 mb-3">
                  For urgent issues like safety concerns, unauthorized vehicle access, or payment disputes during active bookings:
                </p>
                <Button variant="destructive" className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Emergency Line: 1-800-URGENT-1
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;