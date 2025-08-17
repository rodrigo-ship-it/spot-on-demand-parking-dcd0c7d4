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
      console.log('Terms accepted, calling onAccept callback');
      onAccept();
    } else {
      console.log('Cannot accept - hasRead:', hasRead, 'hasAccepted:', hasAccepted);
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
            <div className="space-y-6 text-xs">
              <section>
                <h3 className="font-semibold text-base mb-3">ARRIV TERMS OF SERVICE AND USER AGREEMENT</h3>
                <p className="italic mb-4">
                  PLEASE READ THESE TERMS CAREFULLY BEFORE USING THE ARRIV SERVICE. BY ACCESSING OR USING OUR SERVICE, 
                  YOU AGREE TO BE BOUND BY THESE TERMS AND ALL APPLICABLE LAWS AND REGULATIONS.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">1. ACCEPTANCE OF TERMS</h3>
                <p className="mb-3">
                  These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") 
                  and Arriv Inc. ("Arriv," "we," "us," or "our") governing your access to and use of the Arriv platform, 
                  mobile application, website, and all related services (collectively, the "Service"). By creating an account, 
                  accessing, browsing, or using any portion of the Service, you acknowledge that you have read, understood, 
                  and agree to be bound by these Terms, our Privacy Policy, and all applicable laws and regulations. 
                  If you do not agree to these Terms, you must not access or use the Service.
                </p>
                <p className="mb-3">
                  These Terms apply to all users of the Service, including but not limited to parking space owners ("Hosts"), 
                  parking space renters ("Renters"), and visitors who browse the platform. You represent and warrant that 
                  you are at least 18 years old and have the legal capacity to enter into this agreement.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">2. SERVICE DESCRIPTION AND PLATFORM ROLE</h3>
                <p className="mb-3">
                  Arriv operates as an online marketplace platform that facilitates connections between individuals who have 
                  available parking spaces ("Hosts") and individuals seeking parking accommodations ("Renters"). We act 
                  solely as an intermediary platform and technology service provider. Arriv does not own, operate, manage, 
                  control, or maintain any parking spaces, properties, or venues listed on our platform.
                </p>
                <p className="mb-3">
                  The Service enables Hosts to list their available parking spaces and Renters to discover, book, and pay 
                  for parking accommodations. All parking arrangements, transactions, and interactions are conducted directly 
                  between Hosts and Renters. Arriv is not a party to any rental agreements, leases, or contracts between users.
                </p>
                <p className="mb-3">
                  Our platform provides various tools and features including but not limited to: listing creation and management, 
                  search and discovery functionality, messaging systems, payment processing facilitation, review and rating systems, 
                  customer support, and mobile applications.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">3. USER ACCOUNTS AND REGISTRATION</h3>
                <p className="mb-3">
                  To access certain features of the Service, you must create an account. You agree to provide accurate, 
                  current, and complete information during registration and to update such information to maintain its accuracy. 
                  You are responsible for safeguarding your account credentials and for all activities that occur under your account.
                </p>
                <p className="mb-3">
                  You may not create multiple accounts, share your account with others, or transfer your account to another person. 
                  We reserve the right to suspend or terminate accounts that violate these Terms or are used for fraudulent, 
                  abusive, or illegal purposes.
                </p>
                <p className="mb-3">
                  Identity Verification: We may require identity verification for certain account features or transactions. 
                  You agree to provide requested documentation and information for verification purposes.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">4. PAYMENT TERMS AND SERVICE FEES</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-blue-800">
                      <p className="font-medium text-xs">IMPORTANT FEE DISCLOSURE</p>
                    </div>
                  </div>
                </div>
                <p className="mb-3">
                  <strong>Service Fee Structure:</strong> Arriv charges a seven percent (7%) service fee to both Hosts and Renters 
                  on each successful transaction. This means:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-3">
                  <li><strong>For Renters:</strong> You will pay the Host's listed price plus a 7% service fee plus applicable taxes and third-party payment processing fees</li>
                  <li><strong>For Hosts:</strong> You will receive the listed price minus a 7% service fee minus applicable payment processing fees</li>
                  <li><strong>Total Platform Fee:</strong> The combined fee structure results in a 14% total fee split between both parties</li>
                  <li><strong>Payment Processing:</strong> Additional payment processing fees charged by third-party providers (such as Stripe) are deducted from the Host's payout</li>
                </ul>
                <p className="mb-3">
                  <strong>Payment Processing:</strong> All payments are processed through secure third-party payment providers. 
                  Arriv does not store payment card information. Payment processing fees charged by third-party providers 
                  are separate from Arriv's service fees and are deducted from Host payouts.
                </p>
                <p className="mb-3">
                  <strong>Taxes:</strong> Users are responsible for determining and paying all applicable local, state, and federal taxes 
                  related to their use of the Service. Hosts are responsible for reporting and paying taxes on rental income. 
                  Arriv may provide tax reporting documents as required by law.
                </p>
                <p className="mb-3">
                  <strong>Currency and Pricing:</strong> All prices are displayed and processed in US Dollars (USD) unless otherwise specified. 
                  Currency conversion fees may apply for international transactions.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">5. HOST OBLIGATIONS AND RESPONSIBILITIES</h3>
                <p className="mb-3">
                  <strong>Legal Authority:</strong> Hosts represent and warrant that they have the legal right, authority, and permission 
                  to rent the parking spaces they list on the platform. This includes compliance with applicable zoning laws, 
                  lease agreements, homeowners association rules, and local regulations.
                </p>
                <p className="mb-3">
                  <strong>Accurate Listings:</strong> Hosts must provide accurate, complete, and up-to-date information in their listings, 
                  including but not limited to location, availability, pricing, access instructions, restrictions, and property conditions.
                </p>
                <p className="mb-3">
                  <strong>Property Maintenance and Safety:</strong> Hosts are solely responsible for maintaining their parking spaces 
                  in a safe, accessible, and usable condition. This includes ensuring adequate lighting, clear access paths, 
                  and removal of hazards or obstructions.
                </p>
                <p className="mb-3">
                  <strong>Insurance and Liability:</strong> Hosts must maintain appropriate insurance coverage for their property 
                  and activities. Hosts assume full liability for their property and any incidents that occur on their premises.
                </p>
                <p className="mb-3">
                  <strong>Non-Discrimination:</strong> Hosts must comply with all applicable fair housing and anti-discrimination laws 
                  and may not discriminate against Renters based on race, religion, national origin, disability, or other protected characteristics.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">6. RENTER OBLIGATIONS AND RESPONSIBILITIES</h3>
                <p className="mb-3">
                  <strong>Vehicle Requirements:</strong> Renters must have a valid driver's license, vehicle registration, and current 
                  automotive insurance. Vehicles must be in roadworthy condition and comply with all applicable safety standards.
                </p>
                <p className="mb-3">
                  <strong>Compliance with Terms:</strong> Renters must use parking spaces only as specified in the listing description 
                  and Host instructions. Unauthorized use, overstaying, or violating parking restrictions is prohibited.
                </p>
                <p className="mb-3">
                  <strong>Property Respect:</strong> Renters must treat Host property with care and respect, leave parking spaces 
                  in the same condition as found, and report any damages or issues immediately.
                </p>
                <p className="mb-3">
                  <strong>Legal Compliance:</strong> Renters must comply with all applicable local, state, and federal laws, 
                  including traffic laws, parking regulations, and property access rules.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">7. BOOKING, CANCELLATION, AND REFUND POLICIES</h3>
                <p className="mb-3">
                  <strong>Booking Process:</strong> When a Renter makes a booking request, they enter into a direct agreement with the Host. 
                  Arriv facilitates the transaction but is not a party to the rental agreement.
                </p>
                <p className="mb-3">
                  <strong>Cancellation by Renters:</strong> Renters may cancel bookings subject to the cancellation policy specified 
                  in the listing. Cancellation fees may apply depending on the timing of cancellation and the Host's policy.
                </p>
                <p className="mb-3">
                  <strong>Cancellation by Hosts:</strong> Hosts who cancel confirmed bookings may be subject to penalties including 
                  fees, reduced search ranking, or account restrictions.
                </p>
                <p className="mb-3">
                  <strong>Refund Processing:</strong> Refunds, when applicable, are processed through the original payment method. 
                  Processing times may vary depending on the payment provider and financial institution.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">8. COMPREHENSIVE LIABILITY LIMITATION AND DISCLAIMER</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div className="text-red-800">
                      <p className="font-medium text-xs">CRITICAL LIABILITY DISCLAIMER - READ CAREFULLY</p>
                    </div>
                  </div>
                </div>
                <p className="mb-3">
                  <strong>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-3">
                  <li>ARRIV IS NOT LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE</li>
                  <li>ARRIV IS NOT LIABLE FOR ANY VEHICLE DAMAGE, THEFT, VANDALISM, ACCIDENTS, INJURIES, OR PROPERTY LOSS OCCURRING ON ANY LISTED PARKING PROPERTY</li>
                  <li>ARRIV IS NOT LIABLE FOR THE ACTIONS, OMISSIONS, ERRORS, OR NEGLIGENCE OF HOSTS, RENTERS, OR THIRD PARTIES</li>
                  <li>ARRIV IS NOT LIABLE FOR ANY INTERRUPTION, SUSPENSION, OR TERMINATION OF SERVICE ACCESS</li>
                  <li>ARRIV IS NOT LIABLE FOR ANY ERRORS, INACCURACIES, OR OMISSIONS IN LISTING INFORMATION OR PLATFORM CONTENT</li>
                  <li>ARRIV'S TOTAL LIABILITY FOR ANY CLAIMS SHALL NOT EXCEED THE AMOUNT OF SERVICE FEES PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM</li>
                </ul>
                <p className="mb-3">
                  <strong>Assumption of Risk:</strong> You acknowledge and agree that the use of parking facilities involves inherent risks 
                  including but not limited to vehicle damage, theft, personal injury, and property damage. You voluntarily assume all such risks.
                </p>
                <p className="mb-3">
                  <strong>Third-Party Property:</strong> All parking spaces are owned or controlled by third parties. Arriv has no control 
                  over the condition, safety, legality, or suitability of any parking space listed on the platform.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">9. INDEMNIFICATION</h3>
                <p className="mb-3">
                  You agree to defend, indemnify, and hold harmless Arriv, its parent company, subsidiaries, affiliates, officers, 
                  directors, employees, agents, partners, and licensors from and against any and all claims, damages, obligations, 
                  losses, liabilities, costs, debt, and expenses (including but not limited to attorney's fees) arising from:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-3">
                  <li>Your use of and access to the Service</li>
                  <li>Your violation of any term of these Terms</li>
                  <li>Your violation of any third-party right, including without limitation any copyright, property, or privacy right</li>
                  <li>Any claim that your use caused damage to a third party</li>
                  <li>Your listing, rental, or use of any parking space</li>
                  <li>Any interaction with other users of the Service</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">10. PROHIBITED ACTIVITIES AND CONDUCT</h3>
                <p className="mb-3">You are prohibited from using the Service for any illegal, harmful, or inappropriate purposes, including but not limited to:</p>
                <ul className="list-disc pl-6 space-y-2 mb-3">
                  <li>Violating any applicable local, state, national, or international law or regulation</li>
                  <li>Transmitting or facilitating the transmission of any unlawful, harmful, threatening, abusive, or defamatory content</li>
                  <li>Impersonating any person or entity or falsely stating or misrepresenting your affiliation with any person or entity</li>
                  <li>Interfering with or circumventing the security features of the Service</li>
                  <li>Using the Service for commercial purposes other than as specifically permitted</li>
                  <li>Collecting or harvesting any personally identifiable information from the Service</li>
                  <li>Using automated scripts, bots, or data mining tools</li>
                  <li>Posting false, inaccurate, misleading, or fraudulent content</li>
                  <li>Discriminating against or harassing other users</li>
                  <li>Circumventing or manipulating fee structures or payment systems</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">11. INTELLECTUAL PROPERTY RIGHTS</h3>
                <p className="mb-3">
                  The Service and its entire contents, features, and functionality are owned by Arriv and are protected by United States 
                  and international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
                <p className="mb-3">
                  <strong>User Content License:</strong> By posting content on the Service, you grant Arriv a worldwide, non-exclusive, 
                  royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute such content in any media.
                </p>
                <p className="mb-3">
                  <strong>Trademark Rights:</strong> Arriv trademarks, logos, and service marks are proprietary to Arriv. 
                  You may not use these marks without prior written permission.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">12. PRIVACY AND DATA PROTECTION</h3>
                <p className="mb-3">
                  Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information 
                  when you use the Service. By using the Service, you consent to the collection and use of information in accordance 
                  with our Privacy Policy.
                </p>
                <p className="mb-3">
                  <strong>Data Security:</strong> We implement appropriate technical and organizational measures to protect your personal data, 
                  but cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your account credentials.
                </p>
                <p className="mb-3">
                  <strong>Third-Party Services:</strong> The Service may integrate with third-party services that have their own privacy policies. 
                  We are not responsible for the privacy practices of these third parties.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">13. DISPUTE RESOLUTION AND ARBITRATION</h3>
                <p className="mb-3">
                  <strong>Mandatory Arbitration:</strong> Any dispute, controversy, or claim arising out of or relating to these Terms 
                  or the Service shall be settled by binding arbitration administered by the American Arbitration Association (AAA) 
                  in accordance with its Commercial Arbitration Rules.
                </p>
                <p className="mb-3">
                  <strong>Class Action Waiver:</strong> You agree that any arbitration shall be conducted in your individual capacity only 
                  and not as a class action or other representative action.
                </p>
                <p className="mb-3">
                  <strong>Governing Law:</strong> These Terms shall be governed by and construed in accordance with the laws of the 
                  State of Delaware, without regard to its conflict of law principles.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">14. WARRANTIES AND DISCLAIMERS</h3>
                <p className="mb-3">
                  THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. ARRIV MAKES NO REPRESENTATIONS OR WARRANTIES 
                  OF ANY KIND, EXPRESS OR IMPLIED, AS TO THE OPERATION OF THE SERVICE OR THE INFORMATION, CONTENT, OR MATERIALS 
                  INCLUDED THEREIN.
                </p>
                <p className="mb-3">
                  TO THE FULLEST EXTENT PERMITTED BY LAW, ARRIV DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-3">
                  <li>IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE</li>
                  <li>WARRANTIES OF NON-INFRINGEMENT</li>
                  <li>WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS</li>
                  <li>WARRANTIES REGARDING THE ACCURACY, RELIABILITY, OR COMPLETENESS OF ANY INFORMATION</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">15. FORCE MAJEURE</h3>
                <p className="mb-3">
                  Arriv shall not be liable for any failure or delay in performance under these Terms which is due to fire, flood, 
                  earthquake, pandemic, governmental acts, war, terrorism, or other causes beyond Arriv's reasonable control.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">16. ACCOUNT TERMINATION AND SUSPENSION</h3>
                <p className="mb-3">
                  We reserve the right to terminate or suspend your account and access to the Service immediately, without prior notice 
                  or liability, for any reason, including but not limited to breach of these Terms.
                </p>
                <p className="mb-3">
                  Upon termination, your right to use the Service will cease immediately. You may delete your account at any time 
                  by contacting customer support.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">17. MODIFICATIONS TO TERMS</h3>
                <p className="mb-3">
                  We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, 
                  we will provide at least 30 days notice prior to any new terms taking effect.
                </p>
                <p className="mb-3">
                  Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">18. SEVERABILITY</h3>
                <p className="mb-3">
                  If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted 
                  to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">19. ENTIRE AGREEMENT</h3>
                <p className="mb-3">
                  These Terms, together with our Privacy Policy and any other agreements expressly incorporated by reference, 
                  constitute the sole and entire agreement between you and Arriv regarding the Service and supersede all prior 
                  and contemporaneous understandings, agreements, representations, and warranties.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">20. CONTACT INFORMATION</h3>
                <p className="mb-3">
                  If you have any questions about these Terms, please contact us at legal@arriv.com or through our customer support channels.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">21. COMPLIANCE WITH LAWS</h3>
                <p className="mb-3">
                  You agree to comply with all applicable federal, state, and local laws, regulations, and ordinances in your use of the Service. 
                  This includes but is not limited to zoning laws, tax obligations, licensing requirements, and safety regulations.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">22. EMERGENCY PROCEDURES</h3>
                <p className="mb-3">
                  In case of emergency situations involving safety, security, or legal violations, Arriv reserves the right to 
                  take immediate action including account suspension, law enforcement notification, and cooperation with authorities.
                </p>
              </section>

              <section className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Version:</strong> 2.0
                </p>
                <p className="text-xs text-muted-foreground">
                  By using Arriv, you acknowledge that you have read, understood, and agree to be bound by these comprehensive Terms and Conditions. 
                  These Terms constitute a legally binding agreement between you and Arriv Inc.
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