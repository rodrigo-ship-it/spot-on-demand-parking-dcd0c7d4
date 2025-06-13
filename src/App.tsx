import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ListSpot from "./pages/ListSpot";
import HowItWorks from "./pages/HowItWorks";
import ManageSpots from "./pages/ManageSpots";
import SpotDetails from "./pages/SpotDetails";
import Bookings from "./pages/Bookings";
import Profile from "./pages/Profile";
import BookingConfirmed from "./pages/BookingConfirmed";
import NotFound from "./pages/NotFound";
import BookSpot from "./pages/BookSpot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/list-spot" element={<ListSpot />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/manage-spots" element={<ManageSpots />} />
          <Route path="/spot/:id" element={<SpotDetails />} />
          <Route path="/book-spot/:id" element={<BookSpot />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/booking-confirmed" element={<BookingConfirmed />} />
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
