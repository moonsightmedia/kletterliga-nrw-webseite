import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import Index from "./pages/Index";
import Liga from "./pages/Liga";
import Modus from "./pages/Modus";
import Hallen from "./pages/Hallen";
import Ranglisten from "./pages/Ranglisten";
import Sponsoren from "./pages/Sponsoren";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Kontakt from "./pages/Kontakt";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/liga" element={<Liga />} />
          <Route path="/modus" element={<Modus />} />
          <Route path="/hallen" element={<Hallen />} />
          <Route path="/ranglisten" element={<Ranglisten />} />
          <Route path="/sponsoren" element={<Sponsoren />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/kontakt" element={<Kontakt />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
