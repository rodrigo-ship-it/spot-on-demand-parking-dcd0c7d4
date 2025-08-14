import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, FileText, Shield } from "lucide-react";

interface TermsAndConditionsProps {
  onAccept: () => void;
}

export const TermsAndConditions = ({ onAccept }: TermsAndConditionsProps) => {
  const [hasRead, setHasRead] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    // Mark as read when user scrolls to bottom
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasRead(true);
    }
  };

  const handleAccept = () => {
    if (hasAccepted && hasRead) {
      // Store acceptance in localStorage
      localStorage.setItem('termsAccepted', 'true');
      localStorage.setItem('termsAcceptedDate', new Date().toISOString());
      
      // Check if there's a redirect destination from before auth
      const redirectAfterAuth = localStorage.getItem('redirectAfterAuth');
      if (redirectAfterAuth) {
        localStorage.removeItem('redirectAfterAuth');
        window.location.href = redirectAfterAuth;
      } else {
        onAccept();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img 
              src="/lovable-uploads/1c19d464-39d1-4918-840a-eed4bc867edd.png" 
              alt="Arriv Logo" 
              className="w-12 h-12"
            />
            <CardTitle className="text-2xl font-bold">Terms and Conditions</CardTitle>
          </div>
          <p className="text-muted-foreground">
            Please read and accept our terms and conditions to continue using Arriv
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea 
            className="h-96 w-full rounded-md border p-4" 
            onScrollCapture={handleScroll}
          >
            <div className="space-y-6 text-sm">
              <section>
                <h3 className="font-semibold text-lg mb-2">1. Acceptance of Terms</h3>
                <p>
                  By using Arriv ("the Service"), you agree to be bound by these Terms and Conditions. 
                  If you do not agree to these terms, please do not use our service.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">2. Service Description</h3>
                <p>
                  Arriv is a peer-to-peer parking marketplace that connects parking space owners with renters. 
                  We act solely as a platform and do not own, operate, or control any parking spaces listed on our service.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">3. Limitation of Liability</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="text-amber-800">
                      <p className="font-medium">IMPORTANT LIABILITY DISCLAIMER</p>
                    </div>
                  </div>
                </div>
                <p className="mb-3">
                  <strong>TO THE FULLEST EXTENT PERMITTED BY LAW:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Arriv is NOT liable for any damages to your vehicle, theft, accidents, or injuries that occur on any parking property</li>
                  <li>All parking arrangements are between individual users - we are not responsible for disputes</li>
                  <li>We do not guarantee the accuracy of parking spot descriptions, availability, or safety</li>
                  <li>Property owners are solely responsible for the condition and security of their parking spaces</li>
                  <li>Users assume all risks when using parking facilities listed on our platform</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">4. User Responsibilities</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You are responsible for verifying parking spot details and safety before use</li>
                  <li>You must comply with all local parking laws and regulations</li>
                  <li>Vehicle insurance and registration must be current and valid</li>
                  <li>You agree to park only in designated areas as specified by the property owner</li>
                  <li>Any damages caused by your vehicle are your sole responsibility</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">5. Property Owner Responsibilities</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You must have legal authority to rent the parking space</li>
                  <li>You are responsible for maintaining safe access to your parking area</li>
                  <li>You must accurately describe your parking space and any restrictions</li>
                  <li>You assume all liability for accidents or incidents on your property</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">6. Indemnification</h3>
                <p>
                  You agree to indemnify and hold harmless Arriv, its officers, directors, employees, and agents from any claims, 
                  damages, losses, or expenses arising from your use of the service or violation of these terms.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">7. No Warranty</h3>
                <p>
                  THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, 
                  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
                  AND NON-INFRINGEMENT.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">8. Payment and Fees</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All payments are processed securely through third-party providers</li>
                  <li>Arriv charges a 7% service fee on all transactions</li>
                  <li>Refunds are subject to our cancellation policy</li>
                  <li>Users are responsible for any applicable taxes</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">9. Privacy and Data</h3>
                <p>
                  Your privacy is important to us. Please review our Privacy Policy to understand how we collect, 
                  use, and protect your personal information.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">10. Termination</h3>
                <p>
                  We reserve the right to terminate or suspend access to our service immediately, 
                  without prior notice, for conduct that we believe violates these terms.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">11. Dispute Resolution</h3>
                <p>
                  Any disputes arising from these terms shall be resolved through binding arbitration in accordance with 
                  the rules of the American Arbitration Association.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">12. Changes to Terms</h3>
                <p>
                  We reserve the right to modify these terms at any time. Continued use of the service constitutes 
                  acceptance of revised terms.
                </p>
              </section>

              <section className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  By using Arriv, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
                </p>
              </section>
            </div>
          </ScrollArea>

          <div className="mt-6 space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">
                  Legal Protection Notice
                </p>
                <p className="text-blue-700 mt-1">
                  These terms are designed to protect both users and Arriv. Please read carefully and ensure you understand your responsibilities.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hasRead" 
                checked={hasRead}
                onCheckedChange={(checked) => setHasRead(checked as boolean)}
              />
              <label htmlFor="hasRead" className="text-sm font-medium">
                I have read the complete Terms and Conditions
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hasAccepted" 
                checked={hasAccepted}
                onCheckedChange={(checked) => setHasAccepted(checked as boolean)}
                disabled={!hasRead}
              />
              <label htmlFor="hasAccepted" className="text-sm font-medium">
                I agree to the Terms and Conditions and understand the liability limitations
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleAccept}
                disabled={!hasRead || !hasAccepted}
                className="flex-1"
                size="lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                Accept Terms and Continue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};