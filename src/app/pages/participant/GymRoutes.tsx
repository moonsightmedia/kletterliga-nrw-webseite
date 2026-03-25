import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  Lock,
  MapPin,
  PlusCircle,
  Route as RouteIcon,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { Progress } from "@/components/ui/progress";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { checkGymCodeRedeemed, getGym, listGyms, listResultsForUser, listRoutes } from "@/services/appApi";
import type { Gym, Result, Route } from "@/services/appTypes";
import { cn } from "@/lib/utils";

const sortByCode = (a: Route, b: Route) => {
  const numA = Number(a.code.replace(/\D/g, "")) || 0;
  const numB = Number(b.code.replace(/\D/g, "")) || 0;
  return numA - numB;
};

const GymRoutes = () => {
  const { gymId } = useParams();
  const { profile, user } = useAuth();
  const league = profile?.league || (user?.user_metadata?.league as string | undefined);
  const [gym, setGym] = useState<Gym | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [codeRedeemed, setCodeRedeemed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gymId || !profile?.id) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [gymResult, gymsResult, routesResult, resultsResult, redeemedResult] = await Promise.all([
          getGym(gymId),
          listGyms(),
          listRoutes(),
          listResultsForUser(profile.id),
          checkGymCodeRedeemed(gymId, profile.id),
        ]);

        if (!active) return;
        setGym(gymResult.data ?? null);
        setGyms(gymsResult.data ?? []);
        setRoutes(routesResult.data ?? []);
        setResults(resultsResult.data ?? []);
        setCodeRedeemed(Boolean(redeemedResult.data));
      } catch (error) {
        console.error("Failed to load gym results detail", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [gymId, profile?.id]);

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
    const filtered = routes.filter((route) => route.gym_id === gymId);
    const scoped = activeLeague ? filtered.filter((route) => route.discipline === activeLeague) : filtered;
    return scoped.sort(sortByCode);
  }, [routes, gymId, activeLeague]);

  const gymSummary = useMemo(() => {
    const routesByGym = routes.reduce<Record<string, Route[]>>((acc, route) => {
      if (activeLeague && route.discipline !== activeLeague) return acc;
      acc[route.gym_id] = acc[route.gym_id] ?? [];
      acc[route.gym_id].push(route);
      return acc;
    }, {});

    const gymMap = new Map(gyms.map((item) => [item.id, item]));

    return gyms
      .map((item) => {
        const gymRoutes = routesByGym[item.id] ?? [];
        const gymResults = gymRoutes.map((route) => resultMap[route.id]).filter(Boolean) as Result[];
        const climbed = gymResults.filter((result) => result.points > 0).length;
        const points = gymResults.reduce((sum, result) => sum + (result.points ?? 0) + (result.flash ? 1 : 0), 0);

        return {
          gym: gymMap.get(item.id) ?? item,
          climbed,
          points,
          visited: climbed > 0,
          totalRoutes: gymRoutes.length,
        };
      })
      .sort((a, b) => {
        if (a.gym.id === gymId) return -1;
        if (b.gym.id === gymId) return 1;
        if (a.visited !== b.visited) return a.visited ? -1 : 1;
        return b.points - a.points;
      });
  }, [routes, activeLeague, gyms, resultMap, gymId]);

  const currentGymSummary = gymSummary.find((item) => item.gym.id === gymId);
  const currentPoints = currentGymSummary?.points ?? 0;
  const currentClimbed = currentGymSummary?.climbed ?? 0;
  const currentTotal = currentGymSummary?.totalRoutes ?? currentRoutes.length;
  const progress = currentTotal > 0 ? Math.round((currentClimbed / currentTotal) * 100) : 0;

  if (loading) {
    return <div className="text-sm text-[rgba(27,28,26,0.6)]">Ergebnisse werden geladen...</div>;
  }

  if (!gym) {
    return (
      <StitchCard tone="surface" className="p-6">
        <div className="stitch-headline text-2xl text-[#002637]">Halle nicht gefunden</div>
        <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
          Für diese Halle konnten keine Ergebnisse geladen werden.
        </p>
      </StitchCard>
    );
  }

  return (
    <div className="space-y-6">
      <StitchCard tone="navy" className="p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StitchBadge tone="cream">Meine Ergebnisse</StitchBadge>
              <StitchBadge tone="terracotta">{`Saison ${String(new Date().getFullYear()).slice(-2)}`}</StitchBadge>
              {activeLeague ? (
                <StitchBadge tone="ghost">{activeLeague === "lead" ? "Vorstieg" : "Toprope"}</StitchBadge>
              ) : null}
            </div>

            <div>
              <div className="stitch-headline text-4xl text-[#f2dcab] sm:text-5xl">{gym.name}</div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgba(242,220,171,0.76)]">
                Dein Hallen-Log bündelt alle eingetragenen Routen, den Fortschritt in dieser Location und die nächsten
                offenen Projekte.
              </p>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4 text-right">
            <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Hallenpunkte</div>
            <div className="stitch-metric mt-3 text-5xl text-[#f2dcab]">{currentPoints}</div>
            <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">
              {currentClimbed} von {currentTotal} Routen
            </p>
          </div>
        </div>
      </StitchCard>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="stitch-kicker text-[#a15523]">Hallenübersicht</div>
            <div className="mt-2 text-lg font-semibold text-[#002637]">Deine besuchten und offenen Hallen</div>
          </div>
          <div className="rounded-full bg-[#a15523] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white">
            {gymSummary.filter((item) => item.visited).length} besucht
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {gymSummary.slice(0, 8).map((item) => {
            const isCurrent = item.gym.id === gymId;

            return (
              <Link key={item.gym.id} to={`/app/gyms/${item.gym.id}/routes`}>
                <StitchCard
                  tone={item.visited || isCurrent ? "cream" : "navy"}
                  className={cn(
                    "aspect-square p-4 transition-transform hover:-translate-y-0.5",
                    isCurrent && "ring-2 ring-[#a15523]",
                  )}
                >
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <StitchBadge tone={item.visited || isCurrent ? "terracotta" : "ghost"}>
                        {item.visited || isCurrent ? "Besucht" : "Offen"}
                      </StitchBadge>
                      {item.visited || isCurrent ? (
                        <CheckCircle2 className="h-5 w-5 text-[#003d55]" />
                      ) : (
                        <Lock className="h-5 w-5 text-[#f2dcab]" />
                      )}
                    </div>

                    <div>
                      <div
                        className={cn(
                          "stitch-headline text-xl",
                          item.visited || isCurrent ? "text-[#002637]" : "text-[#f2dcab]",
                        )}
                      >
                        {item.gym.name}
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-xs font-semibold uppercase tracking-[0.22em]",
                          item.visited || isCurrent ? "text-[rgba(0,38,55,0.52)]" : "text-[rgba(242,220,171,0.58)]",
                        )}
                      >
                        {item.gym.city || "NRW"}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "text-right text-sm font-semibold",
                        item.visited || isCurrent ? "text-[#a15523]" : "text-[#f2dcab]",
                      )}
                    >
                      {item.visited || isCurrent ? `${item.points} Punkte` : "Noch offen"}
                    </div>
                  </div>
                </StitchCard>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <StitchCard tone="cream" className="p-5 sm:p-6">
            <div className="space-y-5">
              <div>
                <div className="stitch-kicker text-[#a15523]">Detailansicht</div>
                <div className="stitch-headline mt-2 text-3xl text-[#002637]">{gym.name}</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="stitch-kicker text-[rgba(0,38,55,0.52)]">Punkte</div>
                  <div className="stitch-metric mt-3 text-6xl text-[#002637]">{currentPoints}</div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="stitch-kicker text-[rgba(0,38,55,0.52)]">Geklettert</div>
                    <div className="mt-2 text-2xl font-semibold text-[#002637]">{currentClimbed} Routen</div>
                  </div>
                  <div>
                    <div className="stitch-kicker text-[rgba(0,38,55,0.52)]">Status</div>
                    <div className="mt-2 text-2xl font-semibold text-[#a15523]">
                      {codeRedeemed ? "Freigeschaltet" : "Noch gesperrt"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.2rem] bg-white/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="stitch-kicker text-[#a15523]">Fortschritt</div>
                    <div className="text-sm font-semibold text-[#002637]">
                      {currentClimbed} von {currentTotal} Routen in dieser Halle
                    </div>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#003d55] text-[#f2dcab]">
                    <Trophy className="h-5 w-5" />
                  </div>
                </div>
                <Progress value={progress} className="mt-4 h-3 rounded-full bg-[rgba(0,38,55,0.08)] [&>*]:bg-[#a15523]" />
              </div>

              <div className="rounded-[1.2rem] bg-white/70 p-4">
                <div className="flex items-center gap-2 text-sm text-[rgba(27,28,26,0.64)]">
                  <MapPin className="h-4 w-4 text-[#a15523]" />
                  {gym.city || "Nordrhein-Westfalen"}
                </div>
                <p className="mt-2 text-sm leading-6 text-[rgba(27,28,26,0.68)]">
                  {codeRedeemed
                    ? "Die Halle ist aktiv. Öffne einzelne Routen, bearbeite Ergebnisse oder ergänze neue Tops direkt aus dem Log."
                    : "Zum Eintragen neuer Ergebnisse benötigst du zuerst den Hallencode dieser Location."}
                </p>
              </div>
            </div>
          </StitchCard>

          {!codeRedeemed ? (
            <StitchCard tone="surface" className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(161,85,35,0.08)] text-[#a15523]">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-lg font-semibold text-[#002637]">Diese Halle ist noch gesperrt</div>
                    <p className="mt-1 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                      Löse erst den Hallencode ein, damit du Ergebnisse für diese Location speichern kannst.
                    </p>
                  </div>
                  <StitchButton asChild size="sm">
                    <Link to="/app/gyms/redeem">
                      Code einlösen
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </StitchButton>
                </div>
              </div>
            </StitchCard>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Route Log</div>
              <div className="mt-2 text-lg font-semibold text-[#002637]">Alle Routen dieser Halle</div>
            </div>
            <RouteIcon className="h-5 w-5 text-[#003d55]" />
          </div>

          <div className="space-y-3">
            {currentRoutes.length > 0 ? (
              currentRoutes.map((route) => {
                const result = resultMap[route.id];
                const score = result ? result.points + (result.flash ? 1 : 0) : 0;
                const hasResult = Boolean(result);

                return (
                  <StitchCard key={route.id} tone="navy" className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="rounded-[0.9rem] bg-[#a15523] px-3 py-2 font-['Space_Grotesk'] text-lg font-bold text-[#f2dcab]">
                            {route.grade_range || "?"}
                          </div>
                          <div>
                            <div className="stitch-headline text-xl text-[#f2dcab]">{route.code}</div>
                            <div className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-[rgba(242,220,171,0.46)]">
                              {(route.name || "Route").toUpperCase()}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <StitchBadge tone="ghost">{route.discipline === "lead" ? "Vorstieg" : "Toprope"}</StitchBadge>
                          {route.color ? <StitchBadge tone="ghost">{route.color}</StitchBadge> : null}
                          {route.setter ? <StitchBadge tone="ghost">Setter: {route.setter}</StitchBadge> : null}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="stitch-metric text-3xl text-[#f2dcab]">{hasResult ? score : "—"}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[rgba(242,220,171,0.46)]">
                          {hasResult ? (result?.flash ? "Flash" : "Gespeichert") : "Offen"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-[rgba(242,220,171,0.72)]">
                        {hasResult
                          ? `Du hast diese Route bereits mit ${score} Punkten eingetragen.`
                          : "Noch kein Ergebnis vorhanden."}
                      </div>
                      <StitchButton
                        asChild
                        variant={hasResult ? "outline" : "cream"}
                        size="sm"
                        className={cn(!codeRedeemed && "pointer-events-none opacity-50")}
                      >
                        <Link to={`/app/gyms/${gymId}/routes/${route.id}/result`}>
                          {hasResult ? (
                            <>
                              <Edit3 className="h-4 w-4" />
                              Ergebnis bearbeiten
                            </>
                          ) : (
                            <>
                              <PlusCircle className="h-4 w-4" />
                              Ergebnis eintragen
                            </>
                          )}
                        </Link>
                      </StitchButton>
                    </div>
                  </StitchCard>
                );
              })
            ) : (
              <StitchCard tone="surface" className="p-6">
                <div className="stitch-headline text-2xl text-[#002637]">Noch keine Routen vorhanden</div>
                <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                  Für diese Halle wurden aktuell noch keine Routen hinterlegt.
                </p>
              </StitchCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GymRoutes;
