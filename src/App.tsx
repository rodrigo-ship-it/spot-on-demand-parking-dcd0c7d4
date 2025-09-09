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
// Profile and Premium imports
import Profile from "./pages/Profile";
import Premium from "./pages/Premium";
import BookingConfirmed from "./pages/BookingConfirmed";
import NotFound from "./pages/NotFound";
import BookSpot from "./pages/BookSpot";
import RentQR from "./pages/RentQR";
import Auth from "./pages/Auth";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const TermsRoute = () => {
  const navigate = useNavigate();
  
  const handleAccept = () => {
    console.log('handleAccept called in TermsRoute');
    // Check if there's a state indicating we came from profile
    const fromProfile = sessionStorage.getItem('navigatedFromProfile');
    
    if (fromProfile === 'true') {
      sessionStorage.removeItem('navigatedFromProfile');
      console.log('Navigating back to profile');
      navigate('/profile');
    } else {
      console.log('Navigating to home');
      navigate('/');
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
                <Route path="/list-spot" element={<ProtectedRoute><ProtectedListSpot /></ProtectedRoute>} />
                <Route path="/how-it-works" element={<ProtectedRoute><HowItWorks /></ProtectedRoute>} />
                <Route path="/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
                <Route path="/help-support" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
                <Route path="/manage-spots" element={<ProtectedRoute><ProtectedManageSpots /></ProtectedRoute>} />
                <Route path="/spot/:id" element={<ProtectedRoute><SpotDetails /></ProtectedRoute>} />
                <Route path="/book-spot/:id" element={<ProtectedRoute><BookSpot /></ProtectedRoute>} />
                <Route path="/rent-qr/:spotId" element={<ProtectedRoute><RentQR /></ProtectedRoute>} />
                <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                <Route path="/booking-confirmed" element={<ProtectedRoute><BookingConfirmed /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
                <Route path="/privacy-policy" element={<ProtectedRoute requireTermsAcceptance={false}><PrivacyPolicy /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
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
