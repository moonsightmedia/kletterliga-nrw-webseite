import { NavLink, Outlet } from "react-router-dom";
import { Building2, ChartLine, ClipboardList, Cog, Flag, Settings, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/auth/AuthProvider";

const adminNav = [
  { to: "/app/admin", label: "Dashboard", icon: ChartLine },
  { to: "/app/admin/gym", label: "Meine Halle", icon: Building2, role: "gym_admin" },
  { to: "/app/admin/gym/profile", label: "Hallenprofil", icon: Cog, role: "gym_admin" },
  { to: "/app/admin/gym/routes", label: "Routen", icon: ClipboardList, role: "gym_admin" },
  { to: "/app/admin/gym/codes", label: "Codes", icon: Flag, role: "gym_admin" },
  { to: "/app/admin/gym/stats", label: "Statistiken", icon: ChartLine, role: "gym_admin" },
  { to: "/app/admin/league", label: "Liga", icon: Shield, role: "league_admin" },
  { to: "/app/admin/league/season", label: "Saison", icon: Cog, role: "league_admin" },
  { to: "/app/admin/league/gyms", label: "Hallenverwaltung", icon: Building2, role: "league_admin" },
  { to: "/app/admin/league/participants", label: "Teilnehmer", icon: Users, role: "league_admin" },
  { to: "/app/admin/league/classes", label: "Wertungsklassen", icon: ClipboardList, role: "league_admin" },
  { to: "/app/admin/league/results", label: "Moderation", icon: Flag, role: "league_admin" },
  { to: "/app/admin/league/settings", label: "Einstellungen", icon: Settings, role: "league_admin" },
];

export const AdminLayout = () => {
  const { role } = useAuth();
  const visibleNav = adminNav.filter((item) => !item.role || item.role === role);

  return (
    <div className="min-h-screen bg-muted/40 md:flex">
      <aside className="md:w-64 bg-background border-b md:border-b-0 md:border-r border-border">
        <div className="px-6 py-5 border-b border-border">
          <div className="text-xs uppercase tracking-widest text-secondary">Admin</div>
          <div className="font-headline text-xl text-primary">Kletterliga NRW</div>
        </div>
        <nav className="p-3 grid grid-cols-2 md:flex md:flex-col gap-2">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                    isActive ? "bg-accent text-primary" : "text-foreground/70 hover:bg-accent/70",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-5 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};
