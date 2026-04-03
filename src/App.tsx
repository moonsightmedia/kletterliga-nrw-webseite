import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { ScrollToTop } from "./components/ScrollToTop";
import { AppIndexability } from "./components/AppIndexability";
import { AuthProvider } from "@/app/auth/AuthProvider";
import { ClosedGate } from "@/app/ClosedGate";
import { appRoutes } from "@/app/AppRoutes";
import { AppRouteLoadingState } from "@/app/components/AppRouteLoadingState";
import { AppStartupSplashOverlay } from "@/app/components/AppStartupSplashOverlay";
import { isAppPathname } from "@/app/startup/appStartupSplash";
import { initializeLaunchSettings } from "@/config/launch";
import Index from "./pages/Index";
import Liga from "./pages/Liga";
import Modus from "./pages/Modus";
import Regelwerk from "./pages/Regelwerk";
import Teilnahmebedingungen from "./pages/Teilnahmebedingungen";
import Hallen from "./pages/Hallen";
import Ranglisten from "./pages/Ranglisten";
import Sponsoren from "./pages/Sponsoren";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Kontakt from "./pages/Kontakt";
import MailBestaetigen from "./pages/MailBestaetigen";
import MailAbbestellen from "./pages/MailAbbestellen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const RouteFallback = () => {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const isAppRoute = isAppPathname(pathname);

  return (
    <AppRouteLoadingState
      pathname={pathname}
      title={isAppRoute ? "App wird geladen" : "Seite wird geladen"}
      description={
        isAppRoute
          ? "Wir bauen den Teilnehmerbereich gerade für dich auf."
          : "Die gewünschte Seite wird gerade vorbereitet."
      }
    />
  );
};

const AppShell = () => {
  useEffect(() => {
    initializeLaunchSettings();
  }, []);

  return (
    <BrowserRouter>
      <Toaster />
      <AppIndexability />
      <ClosedGate>
        <AuthProvider>
          <AppStartupSplashOverlay />
          <ScrollToTop />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/liga" element={<Liga />} />
              <Route path="/modus" element={<Modus />} />
              <Route path="/regelwerk" element={<Regelwerk />} />
              <Route path="/teilnahmebedingungen" element={<Teilnahmebedingungen />} />
              <Route path="/hallen" element={<Hallen />} />
              <Route path="/ranglisten" element={<Ranglisten />} />
              <Route path="/sponsoren" element={<Sponsoren />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route path="/kontakt" element={<Kontakt />} />
              <Route path="/mail/bestaetigen" element={<MailBestaetigen />} />
              <Route path="/mail/abbestellen" element={<MailAbbestellen />} />
              {appRoutes}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ClosedGate>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Analytics />
      <SpeedInsights />
      <AppShell />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
