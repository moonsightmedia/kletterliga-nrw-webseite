import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { ScrollToTop } from "./components/ScrollToTop";
import { AppIndexability } from "./components/AppIndexability";
import { AuthProvider } from "@/app/auth/AuthProvider";
import { AuthCallbackRedirect } from "@/app/auth/AuthCallbackRedirect";
import { ClosedGate } from "@/app/ClosedGate";
import { appRoutes } from "@/app/AppRoutes";
import { AppRouteLoadingState } from "@/app/components/AppRouteLoadingState";
import { AppStartupSplashOverlay } from "@/app/components/AppStartupSplashOverlay";
import { isAppPathname } from "@/app/startup/appStartupSplash";
import { initializeLaunchSettings } from "@/config/launch";
import SeasonPreview from "./preview/SeasonPreview";
import "./preview/season-preview.css";
import { FinaleHandout } from "./pages/FinaleHandout";
import Teilnahmebedingungen from "./pages/Teilnahmebedingungen";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Kontakt from "./pages/Kontakt";
import Saisonfeedback from "./pages/Saisonfeedback";
import MailBestaetigen from "./pages/MailBestaetigen";
import MailAbbestellen from "./pages/MailAbbestellen";

const queryClient = new QueryClient();
const RouteFallback = () => {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const isAppRoute = isAppPathname(pathname);
  const isJudgeRoute = pathname === "/app/schiedsrichter";

  return (
    <AppRouteLoadingState
      pathname={pathname}
      title={isJudgeRoute ? "Schiedsrichterbereich wird geladen" : isAppRoute ? "App wird geladen" : "Seite wird geladen"}
      description={
        isJudgeRoute ? "Die Wettkampfwerkzeuge werden vorbereitet." : isAppRoute
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
          <AuthCallbackRedirect />
          <ScrollToTop />
          <Suspense fallback={<RouteFallback />}>
            <Routes>

              <Route path="/liga" element={<Navigate to="/saison/2026" replace />} />
              <Route path="/modus" element={<Navigate to="/saison/2026" replace />} />
              <Route path="/finale" element={<Navigate to="/saison/2026" replace />} />
              <Route path="/finale-2026/teilnehmende" element={<FinaleHandout kind="teilnehmende" />} />
              <Route path="/finale-2026/crew" element={<FinaleHandout kind="crew" />} />
              <Route path="/regelwerk" element={<Navigate to="/saison/2026" replace />} />
              <Route path="/teilnahmebedingungen" element={<Teilnahmebedingungen />} />
              <Route path="/hallen" element={<Navigate to="/saison/2026#hallen" replace />} />
              <Route path="/ranglisten" element={<Navigate to="/ergebnisse/2026" replace />} />
              <Route path="/sponsoren" element={<Navigate to="/saison/2026#danke" replace />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route path="/kontakt" element={<Kontakt />} />
              <Route path="/feedback-2026" element={<Saisonfeedback />} />
              <Route path="/mail/bestaetigen" element={<MailBestaetigen />} />
              <Route path="/mail/abbestellen" element={<MailAbbestellen />} />
              {appRoutes}
              <Route path="/*" element={<SeasonPreview production />} />
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
