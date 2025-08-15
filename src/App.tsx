import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { useNavigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import ProtectedListSpot from "./pages/ProtectedListSpot";
import HowItWorks from "./pages/HowItWorks";
import HelpSupport from "./pages/HelpSupport";
import ProtectedManageSpots from "./pages/ProtectedManageSpots";
import SpotDetails from "./pages/SpotDetails";
import Bookings from "./pages/Bookings";
import Profile from "./pages/Profile";
import BookingConfirmed from "./pages/BookingConfirmed";
import NotFound from "./pages/NotFound";
import BookSpot from "./pages/BookSpot";
import RentQR from "./pages/RentQR";
import Auth from "./pages/Auth";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const TermsRoute = () => {
  const navigate = useNavigate();
  
  const handleAccept = () => {
    // Navigate back to the previous page or home
    const referrer = document.referrer;
    if (referrer && referrer.includes(window.location.origin)) {
      navigate(-1); // Go back to previous page
    } else {
      navigate('/'); // Fallback to home page
    }
  };
  
  return <TermsAndConditions onAccept={handleAccept} />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/terms" element={<TermsRoute />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/list-spot" element={<ProtectedListSpot />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/help" element={<HelpSupport />} />
                <Route path="/manage-spots" element={<ProtectedManageSpots />} />
                <Route path="/spot/:id" element={<SpotDetails />} />
                <Route path="/book-spot/:id" element={<BookSpot />} />
                <Route path="/rent-qr/:spotId" element={<RentQR />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/booking-confirmed" element={<BookingConfirmed />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/admin" element={<AdminDashboard />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
