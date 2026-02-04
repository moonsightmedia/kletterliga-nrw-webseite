import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Trophy, Flag, MapPinned, ArrowRight, CalendarDays, Timer, TrendingUp, Target, Zap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGyms, listResultsForUser, listRoutes, listProfiles, listResults } from "@/services/appApi";
import type { Gym, Result, Route, Profile } from "@/services/appTypes";
import { useSeasonSettings } from "@/services/seasonSettings";
import type { Stage } from "@/services/appTypes";

const Home = () => {
  const { profile, user, role } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.first_name || (user?.user_metadata?.first_name as string | undefined);
  const league = profile?.league || (user?.user_metadata?.league as string | undefined);
  const birthDate = profile?.birth_date ?? (user?.user_metadata?.birth_date as string | undefined);
  const gender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as "m" | "w" | undefined;
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allResults, setAllResults] = useState<Result[]>([]);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const { getAgeAt, getClassName, getStages, getSeasonYear, getPreparationStart, getPreparationEnd, getFinaleDate, getFinaleEnabled } = useSeasonSettings();

  // Redirect Admins zum Admin-Bereich
  useEffect(() => {
    if (role === "gym_admin") {
      navigate("/app/admin/gym", { replace: true });
    } else if (role === "league_admin") {
      navigate("/app/admin/league", { replace: true });
    }
  }, [role, navigate]);

  useEffect(() => {
    listGyms().then(({ data }) => setGyms(data ?? []));
    listRoutes().then(({ data }) => setRoutes(data ?? []));
    listProfiles().then(({ data }) => setAllProfiles(data ?? []));
    listResults().then(({ data }) => setAllResults(data ?? []));
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    listResultsForUser(profile.id).then(({ data }) => setResults(data ?? []));
  }, [profile?.id]);

  // Berechne aktuellen Rang
  useEffect(() => {
    const loadRank = async () => {
      if (!profile?.id || !allProfiles.length || !allResults.length || !routes.length) {
        setCurrentRank(null);
        return;
      }
      const leagueKey = league === "lead" || league === "toprope" ? league : null;
      if (!leagueKey) {
        setCurrentRank(null);
        return;
      }
      const classKey = getClassName(birthDate ?? null, gender ?? null);
      if (!classKey) {
        setCurrentRank(null);
        return;
      }
      const routeMap = new Map(routes.map((route) => [route.id, route.discipline]));
      const totals = allResults.reduce<Record<string, number>>((acc, result) => {
        if (routeMap.get(result.route_id) !== leagueKey) return acc;
        acc[result.profile_id] =
          (acc[result.profile_id] ?? 0) + (result.points ?? 0) + (result.flash ? 1 : 0);
        return acc;
      }, {});
      const rows = allProfiles
        .filter((item) => {
          if (item.role === "gym_admin" || item.role === "league_admin") {
            return false;
          }
          return true;
        })
        .map((item) => ({
          id: item.id,
          className: getClassName(item.birth_date, item.gender) || null,
          points: totals[item.id] ?? 0,
        }))
        .filter((row) => row.className === classKey)
        .sort((a, b) => b.points - a.points);
      const index = rows.findIndex((row) => row.id === profile.id);
      setCurrentRank(index >= 0 ? index + 1 : null);
    };
    loadRank();
  }, [profile?.id, birthDate, gender, league, allProfiles, allResults, routes]);

  const { points, visitedGyms, routesClimbed, flashCount, avgPointsPerRoute } = useMemo(() => {
    const routeMap = new Map(routes.map((route) => [route.id, route]));
    const leagueKey = league === "lead" || league === "toprope" ? league : null;
    const filteredResults = leagueKey
      ? results.filter((res) => routeMap.get(res.route_id)?.discipline === leagueKey)
      : results;
    const pointsSum = filteredResults.reduce((sum, item) => sum + (item.points ?? 0) + (item.flash ? 1 : 0), 0);
    const gymIds = new Set(filteredResults.map((res) => routeMap.get(res.route_id)?.gym_id).filter(Boolean) as string[]);
    const routesClimbedCount = filteredResults.filter((r) => r.points > 0).length;
    const flashCountValue = filteredResults.filter((r) => r.flash).length;
    const avgPoints = routesClimbedCount > 0 ? pointsSum / routesClimbedCount : 0;
    
    return {
      points: pointsSum,
      visitedGyms: gymIds.size,
      routesClimbed: routesClimbedCount,
      flashCount: flashCountValue,
      avgPointsPerRoute: avgPoints,
    };
  }, [results, routes, league]);

  // Berechne Durchschnittswerte für Vergleich
  const { avgPointsAll, avgRoutesAll, avgFlashRate } = useMemo(() => {
    if (!allProfiles.length || !allResults.length || !routes.length) {
      return { avgPointsAll: 0, avgRoutesAll: 0, avgFlashRate: 0 };
    }
    const routeMap = new Map(routes.map((route) => [route.id, route]));
    const leagueKey = league === "lead" || league === "toprope" ? league : null;
    const classKey = getClassName(birthDate ?? null, gender ?? null);
    
    if (!leagueKey || !classKey) {
      return { avgPointsAll: 0, avgRoutesAll: 0, avgFlashRate: 0 };
    }

    const participantProfiles = allProfiles.filter(
      (p) => p.role === "participant" && getClassName(p.birth_date, p.gender) === classKey
    );

    const participantStats = participantProfiles.map((profile) => {
      const profileResults = allResults.filter(
        (r) => r.profile_id === profile.id && routeMap.get(r.route_id)?.discipline === leagueKey
      );
      const totalPoints = profileResults.reduce((sum, r) => sum + (r.points ?? 0) + (r.flash ? 1 : 0), 0);
      const routesClimbed = profileResults.filter((r) => r.points > 0).length;
      const flashCount = profileResults.filter((r) => r.flash).length;
      return { totalPoints, routesClimbed, flashCount };
    });

    const avgPoints = participantStats.length > 0
      ? participantStats.reduce((sum, s) => sum + s.totalPoints, 0) / participantStats.length
      : 0;
    const avgRoutes = participantStats.length > 0
      ? participantStats.reduce((sum, s) => sum + s.routesClimbed, 0) / participantStats.length
      : 0;
    const totalFlash = participantStats.reduce((sum, s) => sum + s.flashCount, 0);
    const totalRoutes = participantStats.reduce((sum, s) => sum + s.routesClimbed, 0);
    const flashRate = totalRoutes > 0 ? (totalFlash / totalRoutes) * 100 : 0;

    return {
      avgPointsAll: avgPoints,
      avgRoutesAll: avgRoutes,
      avgFlashRate: flashRate,
    };
  }, [allProfiles, allResults, routes, league, birthDate, gender, getClassName]);

  const totalGyms = gyms.length || 0;
  const progress = totalGyms ? Math.round((visitedGyms / totalGyms) * 100) : 0;
  const today = new Date();
  
  // Baue Etappen-Liste aus Settings
  const stagesFromSettings = getStages();
  const prepStart = getPreparationStart();
  const prepEnd = getPreparationEnd();
  const finaleDate = getFinaleDate();
  
  const stages: Array<Stage & { range: string; label: string }> = useMemo(() => {
    const result: Array<Stage & { range: string; label: string }> = [];
    
    // Schraubphase hinzufügen
    if (prepStart && prepEnd) {
      const prepStartDate = new Date(prepStart);
      const prepEndDate = new Date(prepEnd);
      result.push({
        key: "preparation",
        label: "Schraubphase",
        start: prepStart,
        end: prepEnd,
        range: `${prepStartDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – ${prepEndDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`,
      });
    }
    
    // Etappen hinzufügen
    stagesFromSettings.forEach((stage) => {
      const startDate = new Date(stage.start);
      const monthName = startDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
      result.push({
        ...stage,
        range: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      });
    });
    
    // Finale hinzufügen
    if (finaleDate) {
      const finaleDateObj = new Date(finaleDate);
      result.push({
        key: "finale",
        label: "Finale",
        start: finaleDate,
        end: finaleDate,
        range: finaleDateObj.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }),
      });
    }
    
    return result;
  }, [stagesFromSettings, prepStart, prepEnd, finaleDate]);
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const center = container.scrollLeft + container.clientWidth / 2;
      let closest = 0;
      let minDistance = Number.POSITIVE_INFINITY;

      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const distance = Math.abs(center - cardCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closest = index;
        }
      });

      setActiveIndex(closest);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const className = getClassName(birthDate, gender) || "-";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border border-t-4 border-t-secondary bg-white shadow-[0_12px_40px_-32px_rgba(0,0,0,0.35)]">
        <div className="grid gap-5 p-6 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-secondary">Saison {getSeasonYear() || new Date().getFullYear().toString()}</div>
              <h2 className="font-headline text-2xl text-primary mt-2">
                {firstName ? `Willkommen zurück, ${firstName}` : "Saisonüberblick"}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Deine Saison im Überblick.
              </p>
            </div>
            <div className="h-12 w-12 bg-background border border-secondary/40 flex items-center justify-center -skew-x-6">
              <div className="skew-x-6">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="border border-primary/20 bg-background px-3 py-1 text-xs text-muted-foreground -skew-x-6">
              <span className="skew-x-6 inline-block">Liga: {league === "lead" ? "Vorstieg" : "Toprope"}</span>
            </span>
            <span className="border border-secondary bg-secondary/10 text-secondary px-3 py-1 text-xs -skew-x-6">
              <span className="skew-x-6 inline-block">Wertungsklasse: {className}</span>
            </span>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-secondary -skew-x-6">
                <span className="skew-x-6 inline-block">Etappen</span>
              </div>
              <div className="text-xs text-muted-foreground -skew-x-6">
                <span className="skew-x-6 inline-block">Aktiv & als Nächstes</span>
              </div>
            </div>
            <div
              ref={scrollRef}
              className="-mx-6 pl-6 pr-0 overflow-x-auto overflow-y-visible scroll-smooth pt-3 snap-x snap-mandatory hide-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex pb-4 items-center" style={{ width: 'max-content' }}>
                <div className="flex-none" style={{ width: "calc(50% - 80px)" }} />
                {stages.map((stage, index) => {
                  const startDate = new Date(`${stage.start}T00:00:00`);
                  const endDate = new Date(`${stage.end}T23:59:59`);
                  const startsInMs = startDate.getTime() - today.getTime();
                  const endsInMs = endDate.getTime() - today.getTime();
                  const startsInDays = Math.max(0, Math.ceil(startsInMs / (1000 * 60 * 60 * 24)));
                  const daysLeft = Math.max(0, Math.ceil(endsInMs / (1000 * 60 * 60 * 24)));
                  const isUpcoming = today.getTime() < startDate.getTime();
                  const isCurrent = today.getTime() >= startDate.getTime() && today.getTime() <= endDate.getTime();
                  const currentIndex = stages.findIndex((s) => {
                    const sStart = new Date(`${s.start}T00:00:00`).getTime();
                    const sEnd = new Date(`${s.end}T23:59:59`).getTime();
                    return today.getTime() >= sStart && today.getTime() <= sEnd;
                  });
                  const nextIndex = stages.findIndex((s) => new Date(`${s.start}T00:00:00`).getTime() > today.getTime());
                  const isNext = currentIndex === -1 && index === nextIndex;
                  const chipText = isUpcoming ? `Startet in ${startsInDays} Tagen` : `Läuft ${daysLeft} Tage`;
                  const isFront = index === activeIndex;
                  const zIndex = isFront ? stages.length + 1 : stages.length - index;
                  const scaleClass = isFront ? "scale-[1.02] shadow-lg" : "scale-[0.96]";
                  const isClickable = Boolean(stage.key);
                  return (
                    <div
                      key={stage.label}
                      ref={(el) => {
                        cardRefs.current[index] = el;
                      }}
                      className={`relative w-[160px] flex-none border px-3 py-2 text-center transition-transform snap-center -skew-x-6 ${
                        index === 0 ? "" : "-ml-6"
                      } ${isClickable ? "cursor-pointer hover:shadow-xl" : ""} ${
                        isCurrent || isNext
                          ? "bg-accent/70 border-secondary text-primary"
                          : "bg-background border-primary/10"
                      } ${scaleClass}`}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : -1}
                      style={{ zIndex }}
                      data-snap="card"
                      onClick={() => {
                        if (!stage.key) return;
                        navigate(`/app/rankings?tab=stage&stage=${stage.key}`);
                      }}
                      onKeyDown={(event) => {
                        if (!stage.key) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/app/rankings?tab=stage&stage=${stage.key}`);
                        }
                      }}
                    >
                      <div className="flex h-full flex-col gap-2 skew-x-6">
                        <div className="text-[11px] uppercase tracking-widest text-secondary">{stage.label}</div>
                        <div className="text-sm text-primary leading-tight whitespace-nowrap">{stage.range}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-2">
                          <Timer className="h-3.5 w-3.5" />
                          <span className="font-semibold text-primary">{chipText}</span>
                        </div>
                      </div>
                      <div className="absolute inset-0 pointer-events-none border border-border/40" />
                    </div>
                  );
                })}
                <div className="flex-none" style={{ width: "calc(50% - 80px)" }} />
                <div className="flex-none w-[160px] h-[1px] opacity-0" aria-hidden="true" />
              </div>
            </div>
            {getFinaleEnabled() && (
              <Button variant="secondary" className="w-full" asChild>
                <Link to="/app/finale">
                  <span className="skew-x-6 flex items-center gap-2">
                    Finale-Infos <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-widest text-secondary">Punkte</div>
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div className="font-headline text-2xl text-primary">{points}</div>
            {avgPointsAll > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Ø {Math.round(avgPointsAll)} · {points >= avgPointsAll ? (
                  <span className="text-green-600">+{Math.round(points - avgPointsAll)}</span>
                ) : (
                  <span className="text-red-600">{Math.round(points - avgPointsAll)}</span>
                )}
              </div>
            )}
          </Card>
          {currentRank && (
            <Card className="p-4 border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-widest text-secondary">Rang</div>
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div className="font-headline text-2xl text-primary">#{currentRank}</div>
              <div className="text-xs text-muted-foreground mt-1">In deiner Klasse</div>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-widest text-secondary">Routen</div>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="font-headline text-2xl text-primary">{routesClimbed}</div>
            {avgRoutesAll > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Ø {Math.round(avgRoutesAll)} · {routesClimbed >= avgRoutesAll ? (
                  <span className="text-green-600">+{Math.round(routesClimbed - avgRoutesAll)}</span>
                ) : (
                  <span className="text-red-600">{Math.round(routesClimbed - avgRoutesAll)}</span>
                )}
              </div>
            )}
          </Card>
          <Card className="p-4 border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-widest text-secondary">Flash</div>
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="font-headline text-2xl text-primary">{flashCount}</div>
            {routesClimbed > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round((flashCount / routesClimbed) * 100)}% Rate · Ø {Math.round(avgFlashRate)}%
              </div>
            )}
          </Card>
        </div>

        <Card className="p-4 border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-widest text-secondary">Ø Punkte/Route</div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="font-headline text-2xl text-primary">
            {routesClimbed > 0 ? avgPointsPerRoute.toFixed(1) : "0.0"}
          </div>
          {avgPointsAll > 0 && routesClimbed > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Ø {Math.round(avgPointsAll / Math.max(avgRoutesAll, 1) * 10) / 10} · {avgPointsPerRoute >= (avgPointsAll / Math.max(avgRoutesAll, 1)) ? (
                <span className="text-green-600">Überdurchschnittlich</span>
              ) : (
                <span className="text-red-600">Unterdurchschnittlich</span>
              )}
            </div>
          )}
        </Card>

        <Card className="p-5 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-secondary">Wildcardqualifikation</div>
              <div className="font-headline text-3xl text-primary mt-2">
                {visitedGyms}/{totalGyms}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Hallen besucht</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-accent/70 flex items-center justify-center">
              <Flag className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground mt-2">{progress}% der Hallen abgeschlossen</div>
          </div>
        </Card>
      </section>

      <section className="grid gap-3">
        <Card className="p-4 border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-accent/70 flex items-center justify-center">
              <MapPinned className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-primary">Code einlösen</div>
              <div className="text-xs text-muted-foreground">Halle freischalten</div>
            </div>
          </div>
          <Button size="sm" asChild>
            <Link to="/app/gyms/redeem">
              <span className="skew-x-6 flex items-center gap-2">
                Los <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </Button>
        </Card>
        <Card className="p-4 border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-accent/70 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-primary">Ergebnisse eintragen</div>
              <div className="text-xs text-muted-foreground">Routenpunkte erfassen</div>
            </div>
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/app/gyms">
              <span className="skew-x-6 flex items-center gap-2">
                Start <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </Button>
        </Card>
      </section>
    </div>
  );
};

export default Home;
