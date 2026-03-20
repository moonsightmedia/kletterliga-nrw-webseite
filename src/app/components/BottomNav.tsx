import { NavLink } from "react-router-dom";
import { Home, ListOrdered, MapPinned, User, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { isParticipantFeatureLocked } from "@/config/launch";

const featureLocked = isParticipantFeatureLocked();

const items = [
  { to: "/app", label: "Home", icon: Home, locked: false },
  { to: "/app/gyms", label: "Hallen", icon: MapPinned, locked: featureLocked },
  { to: "/app/rankings", label: "Ranglisten", icon: ListOrdered, locked: featureLocked },
  { to: "/app/profile", label: "Profil", icon: User, locked: false },
];

export const BottomNav = () => {
  return (
    <nav className="mobile-nav-visible fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          if (item.locked) {
            return (
              <div
                key={item.to}
                className="py-3 flex flex-col items-center justify-center gap-1 text-xs font-medium text-foreground/40"
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  <Lock className="h-3 w-3 absolute -right-2 -bottom-1" />
                </div>
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "py-3 flex flex-col items-center justify-center gap-1 text-xs font-medium",
                  isActive ? "text-primary" : "text-foreground/60",
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
