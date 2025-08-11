import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Privacy Matters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm leading-relaxed">
              <section>
                <h3 className="text-lg font-semibold mb-3">1. Information We Collect</h3>
                <div className="space-y-2">
                  <p><strong>Personal Information:</strong> Name, email address, phone number, and payment information when you create an account or make a booking.</p>
                  <p><strong>Vehicle Information:</strong> Make, model, year, color, and license plate number for parking verification.</p>
                  <p><strong>Location Data:</strong> GPS coordinates for parking spot locations and navigation purposes.</p>
                  <p><strong>Usage Data:</strong> Information about how you use our app, including booking history and preferences.</p>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">2. How We Use Your Information</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Process bookings and facilitate parking transactions</li>
                  <li>Verify vehicle information and prevent fraud</li>
                  <li>Send booking confirmations and important updates</li>
                  <li>Improve our services and user experience</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">3. Information Sharing</h3>
                <p>We share your information only when necessary:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li><strong>With Parking Spot Owners:</strong> Contact details and vehicle information for booking verification</li>
                  <li><strong>Payment Processors:</strong> Billing information to process payments securely</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                </ul>
                <p className="mt-2"><strong>We never sell your personal information to third parties.</strong></p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">4. Data Security</h3>
                <p>We implement industry-standard security measures including:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Encryption of sensitive data in transit and at rest</li>
                  <li>Secure payment processing through Stripe</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Limited access to personal information</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">5. Your Rights</h3>
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your account and data</li>
                  <li>Withdraw consent for marketing communications</li>
                  <li>Export your data in a portable format</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">6. Data Retention</h3>
                <p>We retain your information only as long as necessary to provide services and comply with legal obligations. Account data is typically deleted within 30 days of account closure, except for financial records which may be retained longer for tax and legal purposes.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">7. Cookies and Tracking</h3>
                <p>We use essential cookies for app functionality and analytics cookies to improve our services. You can control cookie preferences through your browser settings.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">8. Children's Privacy</h3>
                <p>Our service is not intended for children under 18. We do not knowingly collect personal information from children.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">9. Changes to This Policy</h3>
                <p>We may update this privacy policy from time to time. We will notify you of any significant changes via email or app notification.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">10. Contact Us</h3>
                <p>If you have any questions about this privacy policy or our data practices, please contact us at:</p>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p><strong>Email:</strong> privacy@parkingapp.com</p>
                  <p><strong>Address:</strong> [Your Business Address]</p>
                  <p><strong>Phone:</strong> [Your Phone Number]</p>
                </div>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}