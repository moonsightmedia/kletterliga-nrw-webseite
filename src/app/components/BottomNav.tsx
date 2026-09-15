import { NavLink, useLocation } from "react-router-dom";
import { Home, ListOrdered, Lock, MapPinned, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLaunchSettings } from "@/config/launch";
import { useQualificationPhase } from "@/services/useQualificationPhase";

export const BottomNav = () => {
  const location = useLocation();
  const { participantFeatureLocked } = useLaunchSettings();
  const { hasEnded } = useQualificationPhase();
  const isParticipantProfileScreen = /^\/app\/rankings\/profile\/[^/]+(?:\/history)?$/.test(
    location.pathname,
  );
  const items = [
    { to: "/app", label: hasEnded ? "Halbfinale" : "Home", icon: hasEnded ? Trophy : Home, locked: false },
    { to: "/app/gyms", label: hasEnded ? "Ergebnisse" : "Hallen", icon: MapPinned, locked: participantFeatureLocked },
    { to: "/app/rankings", label: "Rangliste", icon: ListOrdered, locked: participantFeatureLocked },
    { to: "/app/profile", label: "Profil", icon: User, locked: false },
  ];

  const isItemActive = (to: string) => {
    if (to === "/app") return location.pathname === "/app" || location.pathname === "/app/finale";
    if (isParticipantProfileScreen) return to === "/app/rankings";
    if (to === "/app/rankings" && location.pathname.startsWith("/app/age-group-rankings")) {
      return true;
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <nav className="fixed inset-x-0 -bottom-px z-40 px-0">
      <div className="mx-auto w-full max-w-md stitch-dock rounded-t-xl rounded-b-none border-t border-[rgba(242,220,171,0.08)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <div className="grid grid-cols-4 gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.to);

            if (item.locked) {
              return (
                <div
                  key={item.to}
                  className="flex min-h-[4rem] flex-col items-center justify-center gap-1.5 rounded-xl py-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(242,220,171,0.46)]"
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
                className={() =>
                  cn(
                    "flex min-h-[4rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2dcab]",
                    isActive
                      ? "bg-[#a15523] text-[#f2dcab] shadow-[0_12px_28px_rgba(161,85,35,0.28)]"
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
