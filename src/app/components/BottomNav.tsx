import { NavLink } from "react-router-dom";
import { Home, ListOrdered, Lock, MapPinned, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { isParticipantFeatureLocked } from "@/config/launch";

const featureLocked = isParticipantFeatureLocked();

const items = [
  { to: "/app", label: "Home", icon: Home, locked: false },
  { to: "/app/gyms", label: "Hallen", icon: MapPinned, locked: featureLocked },
  { to: "/app/rankings", label: "Rangliste", icon: ListOrdered, locked: featureLocked },
  { to: "/app/profile", label: "Profil", icon: User, locked: false },
];

export const BottomNav = () => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-0">
      <div className="mx-auto w-full max-w-md stitch-dock rounded-t-[1.9rem] rounded-b-none border-t border-[rgba(242,220,171,0.08)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.22)]">
        <div className="grid grid-cols-4 gap-3">
          {items.map((item) => {
            const Icon = item.icon;

            if (item.locked) {
              return (
                <div
                  key={item.to}
                  className="flex min-h-[4rem] flex-col items-center justify-center gap-1.5 rounded-[1rem] py-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(242,220,171,0.46)]"
                >
                  <div className="relative">
                    <Icon className="h-4 w-4" />
                    <Lock className="absolute -bottom-1 -right-2 h-3 w-3" />
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
                    "flex min-h-[4rem] flex-col items-center justify-center gap-1.5 rounded-[1rem] px-2 py-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] transition-all",
                    isActive
                      ? "bg-[#a15523] text-white shadow-[0_12px_28px_rgba(161,85,35,0.28)]"
                      : "text-[rgba(242,220,171,0.68)] hover:bg-[rgba(242,220,171,0.08)]",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
