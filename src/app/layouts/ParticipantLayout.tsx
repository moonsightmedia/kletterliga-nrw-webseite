import { useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { BottomNav } from "@/app/components/BottomNav";
import { Home, ListOrdered, MapPinned, User, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

const sidebarItems = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/gyms", label: "Hallen", icon: MapPinned },
  { to: "/app/rankings", label: "Ranglisten", icon: ListOrdered },
  { to: "/app/profile", label: "Profil", icon: User },
];

export const ParticipantLayout = () => {
  const location = useLocation();
  const title = getPageTitle(location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-accent/30 md:flex">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-5 py-4 text-center">
          <div className="text-xs uppercase tracking-widest text-secondary">Kletterliga NRW</div>
          <div className="font-headline text-2xl text-primary">{title}</div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-background">
        <div className="px-6 py-5 border-b border-border">
          <div className="text-xs uppercase tracking-widest text-secondary">Kletterliga NRW</div>
          <div className="font-headline text-xl text-primary mt-1">Teilnehmer</div>
        </div>
        <nav className="p-3 flex flex-col gap-2 flex-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const exactPaths = ["/app"];
            const isExact = exactPaths.includes(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={isExact}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-primary"
                      : "text-foreground/70 hover:bg-accent/70 hover:text-primary",
                  )
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="hidden md:block sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="px-8 py-4">
            <div className="font-headline text-3xl text-primary">{title}</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-5 pt-6 pb-24 md:px-8 md:pt-8 md:pb-8 md:max-w-7xl md:mx-auto md:w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
