import { Outlet, useLocation, Link } from "react-router-dom";
import { Bell, ListOrdered, User } from "lucide-react";
import { BottomNav } from "@/app/components/BottomNav";
import { useAuth } from "@/app/auth/AuthProvider";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatUnlockDate, isParticipantFeatureLocked } from "@/config/launch";
import logo from "@/assets/logo.png";

const getPageTitle = (path: string) => {
  if (path.startsWith("/app/participation/redeem")) return "Teilnahme";
  if (path.startsWith("/app/gyms/redeem")) return "Code einlösen";
  if (path.includes("/app/gyms/") && path.endsWith("/routes")) return "Routen";
  if (path.includes("/app/gyms/") && path.includes("/result")) return "Ergebnis";
  if (path.startsWith("/app/gyms/")) return "Hallenprofil";
  if (path.startsWith("/app/gyms")) return "Partnerhallen";
  if (path.startsWith("/app/rankings")) return "Rangliste";
  if (path.startsWith("/app/age-group-rankings")) return "Altersklassen";
  if (path.startsWith("/app/finale")) return "Finale";
  if (path.startsWith("/app/profile")) return "Profil";
  return "Dashboard";
};

const featureLocked = isParticipantFeatureLocked();

export const ParticipantLayout = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const title = getPageTitle(location.pathname);
  const participationInactive =
    profile && profile.role === "participant" && !profile.participation_activated_at;
  const unlockDate = formatUnlockDate();

  return (
    <div className="stitch-app stitch-app-shell">
      <Sheet>
        <header className="stitch-topbar">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link to="/app" className="flex min-w-0 items-center gap-3">
              <div className="rounded-[1rem] bg-[#f2dcab] p-2.5 shadow-[0_16px_30px_rgba(0,0,0,0.18)]">
                <img src={logo} alt="Kletterliga NRW" className="h-10 w-10 object-contain" />
              </div>
              <div className="min-w-0">
                <div className="stitch-kicker text-[rgba(242,220,171,0.68)]">Kletterliga NRW</div>
                <div className="stitch-headline truncate text-xl text-[#f2dcab]">{title}</div>
              </div>
            </Link>

            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(242,220,171,0.14)] bg-[rgba(242,220,171,0.08)] text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.12)]"
                aria-label="Benachrichtigungen öffnen"
              >
                <Bell className="h-5 w-5" />
              </button>
            </SheetTrigger>
          </div>
        </header>

        <SheetContent
          side="right"
          className="stitch-app stitch-rope-texture w-[88vw] max-w-sm border-l-0 bg-[linear-gradient(180deg,#003d55_0%,#002637_100%)] px-5 py-14 text-[#f2dcab]"
        >
          <SheetHeader className="space-y-4 text-left">
            <div>
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">
                Benachrichtigungen
              </div>
              <SheetTitle className="stitch-headline text-3xl text-[#f2dcab]">
                Noch alles ruhig
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="mt-8 space-y-4">
            <StitchCard tone="glass" className="p-5">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Liga-App</div>
              <p className="mt-3 text-sm leading-6 text-[rgba(242,220,171,0.76)]">
                Sobald es echte Benachrichtigungen gibt, erscheinen sie hier. Wichtige
                Einstellungen, Hilfe und Logout findest du aktuell im Profil.
              </p>
            </StitchCard>

            <StitchButton asChild variant="cream" className="w-full justify-start text-[#002637]">
              <Link to="/app/profile">
                <User className="h-4 w-4" />
                Zum Profil
              </Link>
            </StitchButton>

            {!featureLocked ? (
              <StitchButton
                asChild
                variant="outline"
                className="w-full justify-start border-[rgba(242,220,171,0.18)] bg-[rgba(242,220,171,0.06)] text-[#f2dcab] hover:bg-[rgba(242,220,171,0.12)]"
              >
                <Link to="/app/rankings">
                  <ListOrdered className="h-4 w-4" />
                  Zur Rangliste
                </Link>
              </StitchButton>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <main className="stitch-page-pad mx-auto w-full max-w-6xl px-4 pb-8 pt-5 sm:px-6">
        {featureLocked ? (
          <StitchCard tone="navy" className="mb-4 px-5 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="stitch-kicker text-[rgba(242,220,171,0.68)]">Pre-Launch</div>
                <div className="stitch-headline text-2xl text-[#f2dcab]">
                  Dein Dashboard ist offen, die Liga startet am {unlockDate}.
                </div>
                <p className="max-w-2xl text-sm leading-6 text-[rgba(242,220,171,0.72)]">
                  Profil, Vorbereitung und persönliche Statistiken sind bereits verfügbar.
                  Hallen, Codes und Ranglisten öffnen gesammelt zum Saisonstart.
                </p>
              </div>
              <div className="stitch-headline inline-flex items-center rounded-full bg-[#f2dcab] px-3 py-1 text-[0.58rem] font-bold tracking-[0.22em] text-[#002637]">
                Freischaltung {unlockDate}
              </div>
            </div>
          </StitchCard>
        ) : null}

        {participationInactive ? (
          <StitchCard tone="cream" className="mb-4 px-5 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="stitch-kicker text-[#a15523]">Teilnahme fehlt</div>
                <div className="mt-1 text-sm leading-6 text-[rgba(27,28,26,0.7)]">
                  Deine Ergebnisse werden erst nach dem Einlösen des Mastercodes in den
                  Ranglisten berücksichtigt.
                </div>
              </div>
              <StitchButton asChild size="sm">
                <Link to="/app/participation/redeem">Mastercode einlösen</Link>
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
