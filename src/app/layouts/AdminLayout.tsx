import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Building2, ChartLine, ClipboardList, Cog, Flag, Settings, Shield, Users, LogOut, Trophy, Menu, X, FileText, Key, TicketCheck, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/auth/AuthProvider";
import { Button } from "@/components/ui/button";

const adminNav = [
  { to: "/app/admin/gym", label: "Meine Halle", icon: Building2, role: "gym_admin" },
  { to: "/app/admin/gym/profile", label: "Hallenprofil", icon: Cog, role: "gym_admin" },
  { to: "/app/admin/gym/routes", label: "Routen", icon: ClipboardList, role: "gym_admin" },
  { to: "/app/admin/gym/codes", label: "Codes", icon: Flag, role: "gym_admin" },
  { to: "/app/admin/gym/mastercodes", label: "Mastercodes", icon: TicketCheck, role: "gym_admin" },
  { to: "/app/admin/gym/stats", label: "Statistiken", icon: ChartLine, role: "gym_admin" },
  { to: "/app/admin/league", label: "Liga", icon: Shield, role: "league_admin" },
  { to: "/app/admin/league/season", label: "Saison", icon: Cog, role: "league_admin" },
  { to: "/app/admin/league/gyms", label: "Hallenverwaltung", icon: Building2, role: "league_admin" },
  { to: "/app/admin/league/participants", label: "Teilnehmer", icon: Users, role: "league_admin" },
  { to: "/app/admin/league/classes", label: "Wertungsklassen", icon: ClipboardList, role: "league_admin" },
  { to: "/app/admin/league/routes", label: "Routen", icon: ClipboardList, role: "league_admin" },
  { to: "/app/admin/league/results", label: "Ergebnisse", icon: ClipboardList, role: "league_admin" },
  { to: "/app/admin/league/route-feedback", label: "Routenfeedback", icon: MessageCircle, role: "league_admin" },
  { to: "/app/admin/league/finale", label: "Finale-Anmeldungen", icon: Trophy, role: "league_admin" },
  { to: "/app/admin/league/change-requests", label: "Änderungsanfragen", icon: FileText, role: "league_admin" },
  { to: "/app/admin/league/codes", label: "Code-Verwaltung", icon: Key, role: "league_admin" },
  { to: "/app/admin/league/mastercodes", label: "Mastercodes", icon: TicketCheck, role: "league_admin" },
  { to: "/app/admin/league/settings", label: "Einstellungen", icon: Settings, role: "league_admin" },
];

export const AdminLayout = () => {
  const { role, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleNav = adminNav.filter((item) => !item.role || item.role === role);

  // Schließe Mobile-Menü wenn Route wechselt
  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-muted/40 md:flex">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-secondary">
              {role === "gym_admin" ? "Hallenverwaltung" : "Admin"}
            </div>
            <div className="font-headline text-lg text-primary">Kletterliga NRW</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9 p-0"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "md:w-64 bg-background border-b md:border-b-0 md:border-r border-border flex flex-col",
          mobileMenuOpen ? "fixed inset-0 z-40 md:relative md:z-auto" : "hidden md:flex"
        )}
      >
        <div className="px-4 md:px-6 pt-4 pb-4 md:py-5 border-b border-border">
          <div className="flex items-center justify-between mb-3 md:mb-0">
            <div>
              <div className="text-xs uppercase tracking-widest text-secondary">
                {role === "gym_admin" ? "Hallenverwaltung" : "Admin"}
              </div>
              <div className="font-headline text-lg md:text-xl text-primary">Kletterliga NRW</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="h-9 w-9 p-0 md:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <nav className="p-2 md:p-3 flex flex-col gap-2 md:gap-2 flex-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const exactPaths = ["/app/admin", "/app/admin/gym", "/app/admin/league"];
            const isExact = exactPaths.includes(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={isExact}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 md:gap-2 rounded-lg px-3 md:px-3 py-3 md:py-2 text-sm md:text-sm font-medium transition-colors",
                    "touch-manipulation min-h-[44px] md:min-h-0", // Mindesthöhe für Touch-Targets (44px ist Apple's Empfehlung)
                    isActive ? "bg-accent text-primary" : "text-foreground/70 hover:bg-accent/70 active:bg-accent/50",
                  )
                }
              >
                <Icon className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-2 md:p-3 border-t border-border mt-auto">
          <button
            onClick={() => {
              signOut();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 md:gap-2 rounded-lg px-3 md:px-3 py-3 md:py-2 text-sm md:text-sm font-medium text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors touch-manipulation min-h-[44px] md:min-h-0"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Abmelden</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-5 lg:p-8 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};
