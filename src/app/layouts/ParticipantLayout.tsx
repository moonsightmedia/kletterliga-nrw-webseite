import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "@/app/components/BottomNav";

const getPageTitle = (path: string) => {
  if (path.startsWith("/app/gyms/redeem")) return "Code einlösen";
  if (path.includes("/app/gyms/") && path.endsWith("/routes")) return "Routen & Ergebnisse";
  if (path.includes("/app/gyms/") && path.includes("/result")) return "Ergebnis eintragen";
  if (path.startsWith("/app/gyms/")) return "Hallen-Detail";
  if (path.startsWith("/app/gyms")) return "Hallen";
  if (path.startsWith("/app/rankings")) return "Ranglisten";
  if (path.startsWith("/app/profile")) return "Profil";
  return "Home";
};

export const ParticipantLayout = () => {
  const location = useLocation();
  const title = getPageTitle(location.pathname);
  return (
    <div className="min-h-screen bg-accent/30">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-5 py-4 text-center">
          <div className="text-xs uppercase tracking-widest text-secondary">Kletterliga NRW</div>
          <div className="font-headline text-2xl text-primary">{title}</div>
        </div>
      </header>
      <main className="px-5 pt-6 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
