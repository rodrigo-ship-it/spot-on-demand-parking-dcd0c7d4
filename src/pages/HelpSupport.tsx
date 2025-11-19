import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Phone, Clock, CheckCircle, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  type: "general" | "support" | "billing" | "bug";
}

const HelpSupport = () => {
  const navigate = useNavigate();
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
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: formData
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Message sent! We'll get back to you soon.");
      console.log("Contact form submitted successfully:", data);
    } catch (error: any) {
      console.error("Failed to send contact form:", error);
      toast.error("Failed to send message. Please try again or email us directly at service@arrivparking.com");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
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
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="booking">
                    <AccordionTrigger>How do I book a parking spot?</AccordionTrigger>
                    <AccordionContent>
                      Search for parking spots on the homepage, select your dates and times, and complete payment. You'll receive a booking confirmation and can manage your reservation from the "My Bookings" page.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="extend">
                    <AccordionTrigger>How do I extend my parking time?</AccordionTrigger>
                    <AccordionContent>
                      Go to "My Bookings" and click "Manage Time" on active reservations. You can extend your booking to avoid overstay penalties.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="cancel">
                    <AccordionTrigger>Can I cancel my booking?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        <p>Yes, you can request refunds based on our cancellation policy:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li><strong>24+ hours in advance:</strong> 100% refund, no fees</li>
                          <li><strong>3-24 hours in advance:</strong> 90% refund (10% cancellation fee, max $5)</li>
                          <li><strong>Less than 3 hours:</strong> No refund due to short notice</li>
                        </ul>
                        <p className="text-sm">Use the "Request Refund" button in your bookings to start the process.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="qr-code">
                    <AccordionTrigger>How do I rent using a QR code?</AccordionTrigger>
                    <AccordionContent>
                      Scan the QR code at the parking location to instantly book that spot. This provides quick access for spontaneous parking needs.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="list-spot">
                    <AccordionTrigger>How do I list my parking spot?</AccordionTrigger>
                    <AccordionContent>
                      Click "List Your Spot" from the homepage, provide details about your space, upload photos, set pricing, and define availability. You can manage all your spots from "Manage Spots".
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="get-paid">
                    <AccordionTrigger>How do I get paid as a spot owner?</AccordionTrigger>
                    <AccordionContent>
                      Connect your Stripe account through your profile to receive payments. Earnings are processed automatically after each completed booking.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="dispute">
                    <AccordionTrigger>What if there's a dispute?</AccordionTrigger>
                    <AccordionContent>
                      Use the "Report Issue" feature in your bookings to document problems with photos. Our team will review and resolve disputes fairly.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="payment-failed">
                    <AccordionTrigger>My payment failed, what should I do?</AccordionTrigger>
                    <AccordionContent>
                      Check that your card details are correct and you have sufficient funds. Try a different payment method or contact your bank. If issues persist, contact our support team.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="late-penalty">
                    <AccordionTrigger>What happens if I'm late checking out?</AccordionTrigger>
                    <AccordionContent>
                      Late checkout results in penalty charges based on how late you are. There's a 30-minute grace period, then: $8 for 31-60 minutes late, $12 for 61-120 minutes late, and $20 for 120+ minutes late. First-time offenders get a 20% reduction. You may also be charged for extra time used on hourly spots. Extend your booking in advance to avoid penalties.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="premium">
                    <AccordionTrigger>What are premium features?</AccordionTrigger>
                    <AccordionContent>
                      Premium subscriptions are available for users who want enhanced features and priority support. Current premium features are being developed and will be announced soon. Check your profile settings for subscription options.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="account-security">
                    <AccordionTrigger>How is my account information protected?</AccordionTrigger>
                    <AccordionContent>
                      We use industry-standard encryption, secure payment processing through Stripe, and never store your payment details. Enable two-factor authentication for additional security.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="change-password">
                    <AccordionTrigger>How do I change my password?</AccordionTrigger>
                    <AccordionContent>
                      Go to your Profile page and click "Change Password". You'll need to enter your current password and choose a new one.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="availability">
                    <AccordionTrigger>How do I set availability for my parking spot?</AccordionTrigger>
                    <AccordionContent>
                      In "Manage Spots", edit your listing and set specific days, times, and date ranges when your spot is available. You can also block out dates when it's not available.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="pricing-strategy">
                    <AccordionTrigger>How should I price my parking spot?</AccordionTrigger>
                    <AccordionContent>
                      Consider local parking rates, proximity to popular destinations, and demand patterns. Check similar spots in your area for competitive pricing. You can adjust your rates anytime from your spot management page.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="photos">
                    <AccordionTrigger>What photos should I upload for my spot?</AccordionTrigger>
                    <AccordionContent>
                      Include clear photos of the parking space, entrance/access, surrounding area, and any special features. Good photos increase booking rates and help guests find your spot easily.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="verification">
                    <AccordionTrigger>Do I need to verify my account?</AccordionTrigger>
                    <AccordionContent>
                      Email verification is required for all users. Spot owners need to verify their Stripe account for payments. Phone verification may be required for high-value transactions.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="mobile-app">
                    <AccordionTrigger>Is there a mobile app?</AccordionTrigger>
                    <AccordionContent>
                      Currently, Arriv is a responsive web application that works great on all devices. A dedicated mobile app is in development and will be available soon.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="emergency">
                    <AccordionTrigger>What if I have an emergency during my booking?</AccordionTrigger>
                    <AccordionContent>
                      Contact our support team immediately through the app or email service@arrivparking.com. For vehicle-related emergencies, contact local authorities first, then notify us.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="accessibility">
                    <AccordionTrigger>Are parking spots accessible for people with disabilities?</AccordionTrigger>
                    <AccordionContent>
                      Use the accessibility filter when searching to find spots that accommodate wheelchairs and other accessibility needs. Spot owners can specify accessibility features in their listings.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="multiple-vehicles">
                    <AccordionTrigger>Can I book for multiple vehicles?</AccordionTrigger>
                    <AccordionContent>
                      Each booking is for one vehicle. If you need multiple spots, make separate bookings. Some larger spots may accommodate multiple vehicles - check the spot description.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
                    <p className="text-sm text-gray-600">service@arrivparking.com</p>
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