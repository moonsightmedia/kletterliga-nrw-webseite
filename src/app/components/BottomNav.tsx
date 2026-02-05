import { NavLink } from "react-router-dom";
import { Home, ListOrdered, MapPinned, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/gyms", label: "Hallen", icon: MapPinned },
  { to: "/app/rankings", label: "Ranglisten", icon: ListOrdered },
  { to: "/app/profile", label: "Profil", icon: User },
];

export const BottomNav = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
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
