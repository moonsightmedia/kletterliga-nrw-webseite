import { useState, type TouchEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Share2, User } from "lucide-react";
import { BottomNav } from "@/app/components/BottomNav";
import { useAuth } from "@/app/auth/AuthProvider";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import { formatUnlockDate, isParticipantFeatureLocked } from "@/config/launch";
import { cn } from "@/lib/utils";

const getPageTitle = (path: string) => {
  if (path.startsWith("/app/participation/redeem")) return "Teilnahme";
  if (path.startsWith("/app/gyms/redeem")) return "Code einloesen";
  if (path.includes("/app/gyms/") && path.endsWith("/routes")) return "Routen";
  if (path.includes("/app/gyms/") && path.includes("/result")) return "Punkte eintragen";
  if (path.startsWith("/app/gyms/")) return "Hallenprofil";
  if (path.startsWith("/app/gyms")) return "Partnerhallen";
  if (/^\/app\/rankings\/profile\/[^/]+\/history$/.test(path)) return "Verlauf";
  if (/^\/app\/rankings\/profile\/[^/]+$/.test(path)) return "Teilnehmerprofil";
  if (path.startsWith("/app/rankings")) return "Rangliste";
  if (path.startsWith("/app/age-group-rankings")) return "Altersklassen";
  if (path.startsWith("/app/finale")) return "Finale";
  if (path === "/app/profile/history") return "Verlauf";
  if (path.startsWith("/app/profile")) return "Profil";
  return "Dashboard";
};

const featureLocked = isParticipantFeatureLocked();
const PARTICIPATION_DISMISS_THRESHOLD = 96;

const isGymDetailPath = (path: string) =>
  /^\/app\/gyms\/[^/]+$/.test(path) && !path.startsWith("/app/gyms/redeem");

const isRouteFlowPath = (path: string) =>
  /^\/app\/gyms\/[^/]+\/routes(?:\/[^/]+\/result)?$/.test(path);

const getGymIdFromPath = (path: string) => path.match(/^\/app\/gyms\/([^/]+)/)?.[1] ?? null;

const getParticipantBackTarget = (path: string) => {
  if (/^\/app\/rankings\/profile\/[^/]+\/history$/.test(path)) return path.replace(/\/history$/, "");
  if (/^\/app\/rankings\/profile\/[^/]+$/.test(path)) return "/app/rankings";
  if (path === "/app/profile/history") return "/app/profile";
  return null;
};

export const ParticipantLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [participationNoticeDismissed, setParticipationNoticeDismissed] = useState(false);
  const [participationTouchStartX, setParticipationTouchStartX] = useState<number | null>(null);
  const [participationSwipeOffset, setParticipationSwipeOffset] = useState(0);
  const participationInactive =
    profile && profile.role === "participant" && !profile.participation_activated_at;
  const unlockDate = formatUnlockDate();

  const handleParticipationTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setParticipationTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleParticipationTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (participationTouchStartX === null) return;
    const nextX = event.touches[0]?.clientX ?? participationTouchStartX;
    setParticipationSwipeOffset(nextX - participationTouchStartX);
  };

  const handleParticipationTouchEnd = () => {
    if (Math.abs(participationSwipeOffset) >= PARTICIPATION_DISMISS_THRESHOLD) {
      setParticipationNoticeDismissed(true);
    }
    setParticipationTouchStartX(null);
    setParticipationSwipeOffset(0);
  };

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
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {isGymDetail ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/app/gyms")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.12)]"
                aria-label="Zurueck zu den Hallen"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="stitch-headline truncate text-xl text-[#f2dcab]">{title}</div>
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
                aria-label="Zurueck"
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
                aria-label="Zurueck"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="stitch-headline truncate text-xl text-[#f2dcab]">{title}</div>
              </div>

              <div className="h-9 w-9 shrink-0" aria-hidden="true" />
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
                    aria-label={notificationsOpen ? "Benachrichtigungen schliessen" : "Benachrichtigungen oeffnen"}
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
                            Benachrichtigungen folgen
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[rgba(0,38,55,0.72)]">
                            Sobald es echte Updates gibt, erscheinen sie hier direkt unter der Glocke.
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
          isGymDetail || isRouteFlow
            ? "max-w-md px-0 pb-32 pt-0"
            : isHome
                ? "max-w-md px-4 pb-32 pt-6 sm:px-6"
                : "max-w-6xl px-4 pb-32 pt-6 sm:px-6",
        )}
      >
        {!isGymDetail && !isRouteFlow && featureLocked ? (
          <StitchCard
            tone={isHome ? "glass" : "navy"}
            className={cn(
              "mb-4 px-4 py-4 sm:px-5 sm:py-4",
              isHome && "border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.05)]",
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="stitch-kicker text-[rgba(242,220,171,0.68)]">Pre-Launch</div>
                <div className="stitch-headline text-xl text-[#f2dcab] sm:text-2xl">
                  Dein Dashboard ist offen, die Liga startet am {unlockDate}.
                </div>
                <p className="max-w-2xl text-sm leading-6 text-[rgba(242,220,171,0.72)]">
                  Profil, Vorbereitung und persoenliche Statistiken sind bereits verfuegbar. Hallen,
                  Codes und Ranglisten oeffnen gesammelt zum Saisonstart.
                </p>
              </div>
              <div className="stitch-headline inline-flex items-center rounded-full bg-[#f2dcab] px-3 py-1 text-[0.58rem] font-bold tracking-[0.22em] text-[#002637]">
                Freischaltung {unlockDate}
              </div>
            </div>
          </StitchCard>
        ) : null}

        {!isGymDetail && !isRouteFlow && participationInactive && !participationNoticeDismissed ? (
          <StitchCard
            tone={isHome ? "glass" : "cream"}
            className={cn(
              "mb-4 touch-pan-y px-4 py-4 transition-[transform,opacity] duration-200 sm:px-5 sm:py-4",
              isHome &&
                "border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.05)] text-[#f2dcab]",
            )}
            style={{
              transform: `translateX(${participationSwipeOffset}px)`,
              opacity:
                participationTouchStartX === null
                  ? 1
                  : Math.max(0.35, 1 - Math.abs(participationSwipeOffset) / 180),
            }}
            onTouchStart={handleParticipationTouchStart}
            onTouchMove={handleParticipationTouchMove}
            onTouchEnd={handleParticipationTouchEnd}
            onTouchCancel={handleParticipationTouchEnd}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="stitch-kicker text-[#a15523]">Teilnahme fehlt</div>
                <div
                  className={cn(
                    "mt-1 text-sm leading-6",
                    isHome ? "text-[rgba(242,220,171,0.78)]" : "text-[rgba(27,28,26,0.7)]",
                  )}
                >
                  Deine Ergebnisse werden erst nach dem Einloesen des Mastercodes in den Ranglisten
                  beruecksichtigt.
                </div>
              </div>
              <StitchButton asChild size="sm" className={cn(isHome && "shrink-0")}>
                <Link to="/app/participation/redeem">Mastercode einloesen</Link>
              </StitchButton>
            </div>
          </StitchCard>
        ) : null}

        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
};
