import { Suspense, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Share2, User } from "lucide-react";
import { BottomNav } from "@/app/components/BottomNav";
import { useAuth } from "@/app/auth/AuthProvider";
import { useMarkAppStartupSplashSeen } from "@/app/startup/appStartupSplash";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import {
  getMarketingEmailStatusHint,
  getMarketingEmailStatusLabel,
} from "@/data/participationConsent";
import { cn } from "@/lib/utils";

const getPageTitle = (path: string) => {
  if (path.startsWith("/app/participation/redeem")) return "Teilnahme";
  if (path.startsWith("/app/gyms/redeem")) return "Code einlösen";
  if (path.includes("/app/gyms/") && path.endsWith("/routes")) return "Routen";
  if (path.includes("/app/gyms/") && path.includes("/result")) return "Punkte eintragen";
  if (path.startsWith("/app/gyms/")) return "Hallenprofil";
  if (path.startsWith("/app/gyms")) return "Partnerhallen";
  if (/^\/app\/rankings\/profile\/[^/]+\/history$/.test(path)) return "Verlauf";
  if (/^\/app\/rankings\/profile\/[^/]+$/.test(path)) return "Teilnehmerprofil";
  if (path.startsWith("/app/rankings")) return "Rangliste";
  if (path.startsWith("/app/age-group-rankings")) return "Altersklassen";
  if (path.startsWith("/app/finale")) return "Finale";
  if (path === "/app/profile/edit") return "Profil bearbeiten";
  if (path === "/app/profile/history") return "Verlauf";
  if (path.startsWith("/app/profile")) return "Profil";
  return "Dashboard";
};

const isGymDetailPath = (path: string) =>
  /^\/app\/gyms\/[^/]+$/.test(path) && !path.startsWith("/app/gyms/redeem");

const isRouteFlowPath = (path: string) =>
  /^\/app\/gyms\/[^/]+\/routes(?:\/[^/]+\/result)?$/.test(path);

const getGymIdFromPath = (path: string) => path.match(/^\/app\/gyms\/([^/]+)/)?.[1] ?? null;

const getParticipantBackTarget = (path: string) => {
  if (/^\/app\/rankings\/profile\/[^/]+\/history$/.test(path)) return path.replace(/\/history$/, "");
  if (/^\/app\/rankings\/profile\/[^/]+$/.test(path)) return "/app/rankings";
  if (path === "/app/profile/edit") return "/app/profile";
  if (path === "/app/profile/history") return "/app/profile";
  return null;
};

const isShareableParticipantProfilePath = (path: string) =>
  /^\/app\/rankings\/profile\/[^/]+$/.test(path);
const isParticipantProfileHistoryPath = (path: string) =>
  /^\/app\/rankings\/profile\/[^/]+\/history$/.test(path);

const ParticipantRouteFallback = ({
  home,
  immersive,
}: {
  home: boolean;
  immersive: boolean;
}) => {
  if (immersive) {
    return (
      <div className="animate-pulse">
        <div className="h-72 bg-[linear-gradient(180deg,#003d55_0%,#002637_100%)]" />
        <div className="-mt-8 space-y-4 px-4 pb-4">
          <div className="rounded-[1.6rem] bg-white/95 p-5 shadow-[0_16px_34px_rgba(0,38,55,0.08)]">
            <div className="h-5 w-24 rounded-full bg-[#003d55]/10" />
            <div className="mt-4 h-10 w-2/3 rounded-full bg-[#003d55]/10" />
            <div className="mt-6 h-4 w-full rounded-full bg-[#003d55]/8" />
            <div className="mt-2 h-4 w-4/5 rounded-full bg-[#003d55]/8" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[1.25rem] bg-white/90 p-5 shadow-[0_12px_28px_rgba(0,38,55,0.06)]">
              <div className="h-4 w-20 rounded-full bg-[#003d55]/8" />
              <div className="mt-4 h-8 w-16 rounded-full bg-[#003d55]/10" />
            </div>
            <div className="rounded-[1.25rem] bg-white/90 p-5 shadow-[0_12px_28px_rgba(0,38,55,0.06)]">
              <div className="h-4 w-20 rounded-full bg-[#003d55]/8" />
              <div className="mt-4 h-8 w-16 rounded-full bg-[#003d55]/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md animate-pulse space-y-5">
      <div
        className={cn(
          "overflow-hidden rounded-[1.7rem] border border-[rgba(242,220,171,0.08)] p-5 shadow-[0_20px_44px_rgba(0,0,0,0.18)]",
          home ? "bg-[linear-gradient(180deg,#003d55_0%,#002637_100%)]" : "bg-white/92 backdrop-blur",
        )}
      >
        <div className={cn("h-4 w-28 rounded-full", home ? "bg-[#f2dcab]/14" : "bg-[#003d55]/8")} />
        <div
          className={cn(
            "mt-4 h-12 w-3/4 rounded-[1rem]",
            home ? "bg-[#f2dcab]/12" : "bg-[#003d55]/10",
          )}
        />
        <div className={cn("mt-5 h-4 w-full rounded-full", home ? "bg-[#f2dcab]/10" : "bg-[#003d55]/8")} />
        <div className={cn("mt-2 h-4 w-5/6 rounded-full", home ? "bg-[#f2dcab]/10" : "bg-[#003d55]/8")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[1.55rem] bg-white/92 p-5 shadow-[0_12px_28px_rgba(0,38,55,0.06)] backdrop-blur">
          <div className="h-4 w-20 rounded-full bg-[#003d55]/8" />
          <div className="mt-4 h-8 w-16 rounded-full bg-[#003d55]/10" />
        </div>
        <div className="rounded-[1.55rem] bg-white/92 p-5 shadow-[0_12px_28px_rgba(0,38,55,0.06)] backdrop-blur">
          <div className="h-4 w-20 rounded-full bg-[#003d55]/8" />
          <div className="mt-4 h-8 w-16 rounded-full bg-[#003d55]/10" />
        </div>
      </div>

      <div className="rounded-[1.55rem] bg-white/92 p-5 shadow-[0_12px_28px_rgba(0,38,55,0.06)] backdrop-blur">
        <div className="h-4 w-28 rounded-full bg-[#003d55]/8" />
        <div className="mt-4 space-y-3">
          <div className="h-16 rounded-[1rem] bg-[#003d55]/6" />
          <div className="h-16 rounded-[1rem] bg-[#003d55]/6" />
          <div className="h-16 rounded-[1rem] bg-[#003d55]/6" />
        </div>
      </div>
    </div>
  );
};

export const ParticipantLayout = () => {
  useMarkAppStartupSplashSeen();

  const location = useLocation();
  const navigate = useNavigate();
  const { profileConsent } = useAuth();
  const title = getPageTitle(location.pathname);
  const isHome = location.pathname === "/app";
  const isGymDetail = isGymDetailPath(location.pathname);
  const isRouteFlow = isRouteFlowPath(location.pathname);
  const isImmersivePage = isHome || isGymDetail || isRouteFlow;
  const routeFlowGymId = getGymIdFromPath(location.pathname);
  const routeFlowBackTarget = routeFlowGymId
    ? location.pathname.includes("/result")
      ? `/app/gyms/${routeFlowGymId}/routes`
      : `/app/gyms/${routeFlowGymId}`
    : "/app/gyms";
  const participantBackTarget = getParticipantBackTarget(location.pathname);
  const isShareableParticipantProfile = isShareableParticipantProfilePath(location.pathname);
  const isParticipantProfileScreen =
    isShareableParticipantProfile || isParticipantProfileHistoryPath(location.pathname);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationStatusLabel = getMarketingEmailStatusLabel(
    profileConsent?.marketing_email_status ?? "not_subscribed",
  );
  const notificationStatusHint = getMarketingEmailStatusHint(
    profileConsent?.marketing_email_status ?? "not_subscribed",
  );

  const handleSharePage = async () => {
    if (typeof navigator === "undefined") return;

    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link kopiert", description: "Der Seitenlink wurde in die Zwischenablage kopiert." });
    } catch (error) {
      console.error("Failed to share page", error);
    }
  };

  return (
    <div
      className={cn(
        "stitch-app",
        isImmersivePage
          ? "min-h-screen bg-[radial-gradient(circle_at_top,rgba(161,85,35,0.08),transparent_24%),linear-gradient(180deg,#003d55_0%,#002637_100%)] text-[#f2dcab]"
          : "stitch-app-shell",
      )}
    >
      <header className="stitch-topbar border-b-0 bg-[rgba(0,61,85,0.94)]">
        <div
          className={cn(
            "mx-auto flex w-full max-w-md items-center justify-between gap-4",
            "h-16 px-6",
          )}
        >
          {isGymDetail ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/app/gyms")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.12)]"
                aria-label="Zurück zu den Hallen"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "stitch-headline truncate text-[#f2dcab]",
                    isParticipantProfileScreen ? "text-lg" : "text-xl",
                  )}
                >
                  {title}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSharePage()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.12)]"
                aria-label="Seite teilen"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </>
          ) : isRouteFlow ? (
            <>
              <button
                type="button"
                onClick={() => navigate(routeFlowBackTarget)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.12)]"
                aria-label="Zurück"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="stitch-headline truncate text-xl text-[#f2dcab]">{title}</div>
              </div>

              <div className="h-9 w-9 shrink-0" aria-hidden="true" />
            </>
          ) : participantBackTarget ? (
            <>
              <button
                type="button"
                onClick={() => navigate(participantBackTarget)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.12)]"
                aria-label="Zurück"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "stitch-headline truncate text-[#f2dcab]",
                    isParticipantProfileScreen ? "text-lg" : "text-xl",
                  )}
                >
                  {title}
                </div>
              </div>

              {isShareableParticipantProfile ? (
                <button
                  type="button"
                  onClick={() => void handleSharePage()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.12)]"
                  aria-label="Seite teilen"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              ) : (
                <div className="h-9 w-9 shrink-0" aria-hidden="true" />
              )}
            </>
          ) : (
            <>
              <Link to="/app" className="min-w-0">
                <div className="stitch-headline truncate text-xl text-[#f2dcab]">{title}</div>
              </Link>

              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.12)]"
                    aria-label={notificationsOpen ? "Benachrichtigungen schließen" : "Benachrichtigungen öffnen"}
                    aria-expanded={notificationsOpen}
                  >
                    <Bell className="h-5 w-5" />
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={12}
                  collisionPadding={16}
                  className="w-[min(92vw,24rem)] overflow-hidden rounded-[1.9rem] border border-[rgba(161,85,35,0.14)] bg-[linear-gradient(180deg,#f2dcab_0%,#eed6a0_100%)] p-0 text-[#002637] shadow-[0_24px_60px_rgba(0,0,0,0.34)]"
                >
                  <div className="border-b border-[rgba(0,38,55,0.1)] px-5 py-5">
                    <div className="stitch-kicker text-[rgba(0,38,55,0.52)]">Benachrichtigungen</div>
                  </div>

                  <div className="space-y-3 px-4 py-4">
                    <div className="rounded-[1.35rem] bg-white/38 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[#a15523] text-white">
                          <Bell className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-['Space_Grotesk'] text-lg font-bold text-[#002637]">
                            Freiwillige E-Mail-Infos
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[rgba(0,38,55,0.72)]">
                            {notificationStatusLabel}: {notificationStatusHint}
                          </p>
                          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[#003d55]">
                            Einstellungen vorübergehend pausiert
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.35rem] bg-white/38 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[#003d55] text-[#f2dcab]">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-['Space_Grotesk'] text-lg font-bold text-[#002637]">
                            Profil und Hilfe
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[rgba(0,38,55,0.72)]">
                            Einstellungen, Hilfe und Logout findest du aktuell gesammelt im Profil.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </header>

      <main
        className={cn(
          "stitch-page-pad mx-auto w-full",
          isGymDetail || isRouteFlow || isParticipantProfileScreen
            ? "max-w-md px-0 pb-32 pt-0"
            : isHome
              ? "max-w-md px-4 pb-32 pt-6 sm:px-6"
              : "max-w-6xl px-4 pb-32 pt-6 sm:px-6",
        )}
      >
        <Suspense
          fallback={
            <ParticipantRouteFallback
              home={isHome}
              immersive={isGymDetail || isRouteFlow || isParticipantProfileScreen}
            />
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <BottomNav />
    </div>
  );
};
