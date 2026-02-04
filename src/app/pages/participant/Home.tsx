import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Flag, MapPinned, ArrowRight, CalendarDays, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGyms, listResultsForUser, listRoutes } from "@/services/appApi";
import type { Gym, Result, Route } from "@/services/appTypes";

const Home = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.first_name || (user?.user_metadata?.first_name as string | undefined);
  const league = profile?.league || (user?.user_metadata?.league as string | undefined);
  const birthDate = profile?.birth_date ?? (user?.user_metadata?.birth_date as string | undefined);
  const gender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as "m" | "w" | undefined;
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    listGyms().then(({ data }) => setGyms(data ?? []));
    listRoutes().then(({ data }) => setRoutes(data ?? []));
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    listResultsForUser(profile.id).then(({ data }) => setResults(data ?? []));
  }, [profile?.id]);

  const { points, visitedGyms } = useMemo(() => {
    const routeMap = new Map(routes.map((route) => [route.id, route]));
    const leagueKey = league === "lead" || league === "toprope" ? league : null;
    const filteredResults = leagueKey
      ? results.filter((res) => routeMap.get(res.route_id)?.discipline === leagueKey)
      : results;
    const pointsSum = filteredResults.reduce((sum, item) => sum + (item.points ?? 0) + (item.flash ? 1 : 0), 0);
    const gymIds = new Set(filteredResults.map((res) => routeMap.get(res.route_id)?.gym_id).filter(Boolean) as string[]);
    return { points: pointsSum, visitedGyms: gymIds.size };
  }, [results, routes, league]);

  const totalGyms = gyms.length || 0;
  const progress = totalGyms ? Math.round((visitedGyms / totalGyms) * 100) : 0;
  const seasonStart = new Date(Date.UTC(2026, 4, 1));
  const today = new Date();
  const stages = [
    { label: "Schraubphase", range: "15.04 – 30.04", start: "2026-04-15", end: "2026-04-30" },
    { key: "2026-05", label: "Etappe 1", range: "Mai 2026", start: "2026-05-01", end: "2026-05-31" },
    { key: "2026-06", label: "Etappe 2", range: "Juni 2026", start: "2026-06-01", end: "2026-06-30" },
    { key: "2026-07", label: "Etappe 3", range: "Juli 2026", start: "2026-07-01", end: "2026-07-31" },
    { key: "2026-08", label: "Etappe 4", range: "August 2026", start: "2026-08-01", end: "2026-08-31" },
    { label: "Finale", range: "03.10.2026", start: "2026-10-03", end: "2026-10-03" },
  ];
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

  const getAgeAt = (dateValue?: string | null) => {
    if (!dateValue) return null;
    const date = new Date(`${dateValue}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    let age = seasonStart.getUTCFullYear() - date.getUTCFullYear();
    const monthDiff = seasonStart.getUTCMonth() - date.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && seasonStart.getUTCDate() < date.getUTCDate())) {
      age -= 1;
    }
    return age;
  };

  const getClassName = () => {
    const age = getAgeAt(birthDate ?? null);
    if (age === null || !gender) return "-";
    if (age < 16) return `U16 (${gender})`;
    if (age < 40) return `Ü16 (${gender})`;
    return `Ü40 (${gender})`;
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border border-t-4 border-t-secondary bg-white shadow-[0_12px_40px_-32px_rgba(0,0,0,0.35)]">
        <div className="grid gap-5 p-6 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-secondary">Saison 2026</div>
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
              <span className="skew-x-6 inline-block">Wertungsklasse: {getClassName()}</span>
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
            >
              <div className="flex pb-4 items-center">
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
            <Button variant="secondary" className="w-full" asChild>
              <a href="/app/finale">
                <span className="skew-x-6 flex items-center gap-2">
                  Finale-Infos <ArrowRight className="h-4 w-4" />
                </span>
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <Card className="p-5 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-secondary">Punkte</div>
              <div className="font-headline text-3xl text-primary mt-2">{points}</div>
              <p className="text-sm text-muted-foreground mt-1">Aktueller Punktestand</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-accent/70 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
          </div>
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
            <a href="/app/gyms/redeem">
              <span className="skew-x-6 flex items-center gap-2">
                Los <ArrowRight className="h-4 w-4" />
              </span>
            </a>
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
            <a href="/app/gyms">
              <span className="skew-x-6 flex items-center gap-2">
                Start <ArrowRight className="h-4 w-4" />
              </span>
            </a>
          </Button>
        </Card>
      </section>
    </div>
  );
};

export default Home;
