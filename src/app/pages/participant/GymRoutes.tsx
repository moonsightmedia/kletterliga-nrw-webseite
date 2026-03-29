import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, Lock, Rocket, Trophy } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import { useParticipantGymDetailQuery } from "@/app/pages/participant/participantQueries";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import type { Gym, Result, Route } from "@/services/appTypes";
import { cn } from "@/lib/utils";

const sortByCode = (a: Route, b: Route) => {
  const numA = Number(a.code.replace(/\D/g, "")) || 0;
  const numB = Number(b.code.replace(/\D/g, "")) || 0;
  if (numA !== numB) return numA - numB;
  return a.code.localeCompare(b.code);
};

const getRouteScore = (result: Result | undefined) => (result?.points ?? 0) + (result?.flash ? 1 : 0);

const getRouteStatus = (result: Result | undefined) => {
  if (result?.flash) {
    return {
      label: "Flash",
      icon: CheckCircle2,
      rowClass: "bg-[#f5f3f0]",
      badgeClass: "bg-[#a15523] text-[#f2dcab] shadow-[0_10px_18px_rgba(161,85,35,0.22)]",
      iconClass: "fill-current text-[#a15523]",
      labelClass: "text-[#a15523]",
      titleClass: "text-[#002637]",
    };
  }

  if ((result?.points ?? 0) > 0) {
    return {
      label: "Top",
      icon: CheckCircle2,
      rowClass: "bg-white",
      badgeClass: "bg-[#003d55] text-[#f2dcab] shadow-[0_10px_18px_rgba(0,61,85,0.2)]",
      iconClass: "text-[#002637]",
      labelClass: "text-[#003d55]",
      titleClass: "text-[#002637]",
    };
  }

  return {
    label: "Nicht geklettert",
    icon: Circle,
    rowClass: "bg-white",
    badgeClass: "bg-[#003d55] text-[#f2dcab] shadow-[0_10px_18px_rgba(0,61,85,0.2)]",
    iconClass: "text-[rgba(0,38,55,0.22)]",
    labelClass: "text-[rgba(27,28,26,0.34)]",
    titleClass: "text-[#002637]",
  };
};

const getHeroVisual = (gym: Gym | null) => {
  if (!gym?.logo_url) return null;
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_34%,rgba(242,220,171,0.16),transparent_24%),radial-gradient(circle_at_82%_58%,rgba(255,255,255,0.08),transparent_28%)]" />
      <img
        src={gym.logo_url}
        alt={gym.name}
        className="absolute inset-y-3 right-[-2.5rem] h-[82%] w-[72%] object-contain opacity-[0.16] mix-blend-screen saturate-0"
      />
    </>
  );
};

const GymRoutes = () => {
  const { gymId } = useParams();
  const { profile, user } = useAuth();
  const league = profile?.league || (user?.user_metadata?.league as string | undefined);
  const { gym, routes, results, codeRedeemed, loading, error } =
    useParticipantGymDetailQuery(gymId, profile?.id);

  const resultMap = useMemo(
    () =>
      results.reduce<Record<string, Result>>((acc, result) => {
        acc[result.route_id] = result;
        return acc;
      }, {}),
    [results],
  );

  const activeLeague = league === "lead" || league === "toprope" ? league : null;

  const currentRoutes = useMemo(() => {
    const scopedRoutes = activeLeague ? routes.filter((route) => route.discipline === activeLeague) : routes;
    const activeRoutes = scopedRoutes.filter((route) => route.active);
    return [...(activeRoutes.length > 0 ? activeRoutes : scopedRoutes)].sort(sortByCode);
  }, [routes, activeLeague]);

  const climbedRoutes = useMemo(
    () => currentRoutes.filter((route) => getRouteScore(resultMap[route.id]) > 0).length,
    [currentRoutes, resultMap],
  );

  const hallPoints = useMemo(
    () => currentRoutes.reduce((sum, route) => sum + getRouteScore(resultMap[route.id]), 0),
    [currentRoutes, resultMap],
  );

  const disciplineBadge = useMemo(() => {
    const discipline = activeLeague ?? currentRoutes[0]?.discipline ?? null;

    if (discipline === "lead") {
      return { short: "V", label: "Vorstieg" };
    }

    if (discipline === "toprope") {
      return { short: "T", label: "Toprope" };
    }

    return { short: "-", label: "Liga" };
  }, [activeLeague, currentRoutes]);

  if (loading) {
    return (
      <ParticipantStateCard
        title="Routen laden"
        description="Die Routen dieser Halle werden gerade für den Teilnehmerbereich vorbereitet."
      />
    );
  }

  if (error) {
    return <ParticipantStateCard title="Routen nicht verfügbar" description={error} />;
  }

  if (!gym) {
    return (
      <StitchCard tone="navy" className="mx-4 mt-6 p-6">
        <div className="stitch-headline text-2xl text-[#f2dcab]">Halle nicht gefunden</div>
        <p className="mt-3 text-sm leading-6 text-[rgba(242,220,171,0.72)]">
          Für diese Halle konnten keine Routen geladen werden.
        </p>
      </StitchCard>
    );
  }

  return (
    <div className="min-h-full bg-[#fbf9f6] pb-8 text-[#1b1c1a]">
      <section
        className="relative h-64 overflow-hidden bg-[linear-gradient(180deg,#003d55_0%,#002637_100%)]"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 85%, 0% 100%)" }}
      >
        {getHeroVisual(gym)}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,61,85,0.18),rgba(0,38,55,0.24)_38%,rgba(0,38,55,0.72)_100%)]" />
        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: "linear-gradient(to right, rgba(242,220,171,0.16) 1px, transparent 1px)", backgroundSize: "92px 100%" }} />
        <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(circle at 18% 28%, rgba(242,220,171,0.2) 0 2px, transparent 3px), radial-gradient(circle at 56% 22%, rgba(242,220,171,0.16) 0 2px, transparent 3px), radial-gradient(circle at 72% 48%, rgba(242,220,171,0.16) 0 2px, transparent 3px)", backgroundSize: "160px 160px" }} />

        {!gym.logo_url ? (
          <>
            <div className="absolute right-[-2rem] top-6 h-40 w-40 rounded-full bg-[rgba(242,220,171,0.08)] blur-3xl" />
            <div className="absolute left-[-1rem] top-14 h-28 w-28 rounded-full bg-[rgba(161,85,35,0.18)] blur-3xl" />
          </>
        ) : null}

        <div className="absolute inset-x-0 bottom-11 px-6">
          <div className="flex items-end justify-between gap-5">
            <div className="min-w-0 max-w-[13.75rem]">
              <div className="mb-1 text-[0.76rem] font-['Space_Grotesk'] font-bold uppercase tracking-[0.24em] text-[rgba(242,220,171,0.72)]">
                Aktuelle Halle
              </div>
              <div className="font-['Space_Grotesk'] text-[2.15rem] font-bold leading-[0.94] tracking-[-0.055em] text-[#f2dcab]">
                {gym.name}
              </div>
            </div>

            <div className="flex h-[5.75rem] w-[5.75rem] shrink-0 flex-col items-center justify-center rounded-[1.1rem] bg-[#a15523] px-3 text-center text-[#f2dcab] shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
              <div className="font-['Space_Grotesk'] text-[1.8rem] font-bold leading-none tracking-[-0.05em]">
                {disciplineBadge.short}
              </div>
              <div className="mt-2 text-[0.72rem] font-bold uppercase tracking-[0.16em]">{disciplineBadge.label}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-6 px-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-[1.05rem] border-b-[3px] border-[rgba(161,85,35,0.2)] bg-white p-5 shadow-[0_8px_18px_rgba(0,38,55,0.08)]">
            <Rocket className="mb-2 h-5 w-5 text-[#a15523]" />
            <div className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[rgba(0,38,55,0.56)]">
              Dein Fortschritt
            </div>
            <div className="mt-2 font-['Space_Grotesk'] text-[1.95rem] font-bold tracking-[-0.055em] text-[#002637]">
              {climbedRoutes} / {currentRoutes.length}
            </div>
          </div>

          <div className="rounded-[1.05rem] border-b-[3px] border-[rgba(0,61,85,0.18)] bg-white p-5 shadow-[0_8px_18px_rgba(0,38,55,0.08)]">
            <Trophy className="mb-2 h-5 w-5 text-[#003d55]" />
            <div className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[rgba(0,38,55,0.56)]">
              Deine Punkte
            </div>
            <div className="mt-2 font-['Space_Grotesk'] text-[1.95rem] font-bold tracking-[-0.055em] text-[#002637]">
              {hallPoints}
            </div>
          </div>
        </div>
      </section>

      {!codeRedeemed ? (
        <section className="mt-6 px-6">
          <StitchCard tone="cream" className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(161,85,35,0.12)] text-[#a15523]">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <div className="text-lg font-semibold text-[#002637]">Diese Halle ist noch gesperrt</div>
                <p className="text-sm leading-6 text-[rgba(27,28,26,0.66)]">
                  Du siehst die Routen bereits, kannst Ergebnisse aber erst nach dem Einlösen des Hallencodes
                  speichern.
                </p>
                <StitchButton asChild size="sm">
                  <Link to={`/app/gyms/redeem?gymId=${encodeURIComponent(gym.id)}`}>
                    Code einlösen
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </StitchButton>
              </div>
            </div>
          </StitchCard>
        </section>
      ) : null}

      <section className="mt-11 px-6">
        <div className="mb-7">
          <div className="font-['Space_Grotesk'] text-[1.95rem] font-bold tracking-[-0.055em] text-[#003d55]">
            Routenliste
          </div>
        </div>

        <div className="space-y-4">
          {currentRoutes.length > 0 ? (
            currentRoutes.map((route) => {
              const result = resultMap[route.id];
              const status = getRouteStatus(result);
              const Icon = status.icon;
              const title = route.name || route.code;

              const content = (
                <div
                  className={cn(
                    "flex items-center gap-5 rounded-[1.05rem] border border-[rgba(0,38,55,0.04)] p-4 shadow-[0_8px_18px_rgba(0,38,55,0.04)] transition-colors",
                    status.rowClass,
                    codeRedeemed && "hover:bg-[#f5f3f0]",
                    !codeRedeemed && "opacity-90",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem] font-['Space_Grotesk'] text-[1.35rem] font-bold",
                      status.badgeClass,
                    )}
                  >
                    {route.code}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={cn("truncate font-['Space_Grotesk'] text-[1.05rem] font-bold leading-tight", status.titleClass)}>
                      {title}
                    </div>
                    <div className={cn("mt-1 text-[0.68rem] font-bold uppercase tracking-[0.12em]", status.labelClass)}>
                      {status.label}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Icon className={cn("h-6 w-6", status.iconClass)} />
                  </div>
                </div>
              );

              if (!codeRedeemed) {
                return <div key={route.id}>{content}</div>;
              }

              return (
                <Link key={route.id} to={`/app/gyms/${gymId}/routes/${route.id}/result`} className="block">
                  {content}
                </Link>
              );
            })
          ) : (
            <StitchCard tone="surface" className="p-6">
              <div className="stitch-headline text-2xl text-[#002637]">Noch keine Routen vorhanden</div>
              <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.66)]">
                Für diese Halle wurden aktuell noch keine Routen hinterlegt.
              </p>
            </StitchCard>
          )}
        </div>
      </section>
    </div>
  );
};

export default GymRoutes;
