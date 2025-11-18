import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "./ui/input";
import { Search } from "lucide-react";

const FAQAccordion = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      question: "How do I book a parking spot?",
      answer: "Simply search for your location, browse available spots, select your preferred time slot, and complete the booking. You'll receive instant confirmation with a QR code.",
    },
    {
      question: "Can I cancel my booking?",
      answer: "Yes, you can cancel your booking through the My Bookings page. Cancellation policies vary by spot, so please check the specific cancellation terms before booking.",
    },
    {
      question: "How do I list my parking space?",
      answer: "Click on 'List Your Spot' in the navigation menu, fill in the details about your parking space including location, pricing, and availability. Once approved, your spot will be live on the platform.",
    },
    {
      question: "Is payment secure?",
      answer: "Absolutely! We use Stripe, a leading payment processor, to handle all transactions securely. Your payment information is encrypted and never stored on our servers.",
    },
    {
      question: "What if I need to extend my booking?",
      answer: "You can request an extension through the active booking details page. The spot owner will be notified and can approve or decline your extension request.",
    },
    {
      question: "How do hosts get paid?",
      answer: "Hosts receive payments directly to their bank account via Stripe Connect. Payouts are processed after the booking is completed, minus a small platform fee.",
    },
    {
      question: "What happens if there's a dispute?",
      answer: "Both renters and hosts can report issues through the booking details page. Our support team reviews all disputes and works to resolve them fairly based on the evidence provided.",
    },
    {
      question: "Do I need to create an account to book?",
      answer: "Yes, you'll need to create a free account to make bookings. This helps us ensure security, manage your bookings, and provide better customer support.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-b from-background/50 to-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-slate-700 via-slate-900 to-slate-700 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Find answers to common questions about our platform
          </p>

          {/* Search bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass-card border-primary/20"
            />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <Accordion type="single" collapsible className="w-full">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {filteredFaqs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No questions found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQAccordion;
