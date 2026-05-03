import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Building2,
  ChartLine,
  ClipboardList,
  Cog,
  Flag,
  Settings,
  Shield,
  Users,
  LogOut,
  Trophy,
  Menu,
  X,
  FileText,
  Key,
  TicketCheck,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/auth/AuthProvider";
import { useMarkAppStartupSplashSeen } from "@/app/startup/appStartupSplash";
import { StitchButton } from "@/app/components/StitchPrimitives";

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
  useMarkAppStartupSplashSeen();

  const { role, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleNav = adminNav.filter((item) => !item.role || item.role === role);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="stitch-app stitch-app-shell flex min-h-screen flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="stitch-topbar z-50 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="stitch-kicker text-[rgba(242,220,171,0.72)]">
              {role === "gym_admin" ? "Hallenverwaltung" : "Admin"}
            </div>
            <div className="stitch-headline text-lg tracking-tight text-[#f2dcab]">Kletterliga NRW</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab]/40"
            aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "stitch-admin-aside flex min-h-0 flex-col border-b border-[rgba(242,220,171,0.35)] md:min-h-screen md:w-64 md:border-b-0 md:border-r",
          mobileMenuOpen
            ? "fixed inset-0 z-40 min-h-[100dvh] md:relative md:inset-auto md:z-auto"
            : "hidden md:flex",
        )}
      >
        <div className="border-b border-[rgba(242,220,171,0.35)] bg-[linear-gradient(180deg,#003d55_0%,#002637_100%)] px-4 pb-4 pt-4 md:px-6 md:py-5">
          <div className="flex items-center justify-between md:mb-0">
            <div>
              <div className="stitch-kicker text-[rgba(242,220,171,0.72)]">
                {role === "gym_admin" ? "Hallenverwaltung" : "Admin"}
              </div>
              <div className="stitch-headline text-lg tracking-tight text-[#f2dcab] md:text-xl">Kletterliga NRW</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab]/40 md:hidden"
              aria-label="Menü schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto bg-[linear-gradient(180deg,#faf8f5_0%,#ffffff_55%)] p-2 md:gap-1 md:p-3">
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
                    "flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-semibold tracking-tight transition-colors md:min-h-0 md:gap-2 md:py-2",
                    "touch-manipulation",
                    isActive
                      ? "bg-[#003d55] text-[#f2dcab] shadow-[0_10px_24px_rgba(0,61,85,0.22)]"
                      : "text-[#002637]/78 hover:bg-[rgba(0,61,85,0.08)] active:bg-[rgba(0,61,85,0.12)]",
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[rgba(242,220,171,0.35)] bg-white/90 p-2 backdrop-blur md:p-3">
          <StitchButton
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-[#c41e3a]/35 text-[0.62rem] text-[#b42318] hover:bg-[#c41e3a]/08"
            onClick={() => {
              signOut();
              setMobileMenuOpen(false);
            }}
          >
            <LogOut className="h-4 w-4 shrink-0 text-[#b42318]" />
            <span className="truncate">Abmelden</span>
          </StitchButton>
        </div>
      </aside>

      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      ) : null}

      <main className="min-w-0 flex-1 p-4 md:p-5 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};
