import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Flag,
  MapPinned,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/app/auth/AuthProvider";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { listGyms, listProfiles, listResults, listResultsForUser, listRoutes } from "@/services/appApi";
import type { Gym, Profile, Result, Route, Stage } from "@/services/appTypes";
import { useSeasonSettings } from "@/services/seasonSettings";
import { formatUnlockDate, isBeforeAppUnlock } from "@/config/launch";

const Home = () => {
  const { profile, user, role } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.first_name || (user?.user_metadata?.first_name as string | undefined);
  const league = profile?.league || (user?.user_metadata?.league as string | undefined);
  const birthDate = profile?.birth_date ?? (user?.user_metadata?.birth_date as string | undefined);
  const gender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as "m" | "w" | undefined;
  const prelaunchActive = isBeforeAppUnlock();
  const unlockDate = formatUnlockDate();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allResults, setAllResults] = useState<Result[]>([]);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const {
    getAgeAt,
    getClassName,
    getStages,
    getSeasonYear,
    getPreparationEnd,
    getPreparationStart,
    getFinaleDate,
    getFinaleEnabled,
  } = useSeasonSettings();

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
        .filter((item) => item.role !== "gym_admin" && item.role !== "league_admin")
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

    void loadRank();
  }, [profile?.id, birthDate, gender, league, allProfiles, allResults, routes, getClassName]);

  const { points, visitedGyms, routesClimbed, flashCount, avgPointsPerRoute } = useMemo(() => {
    const routeMap = new Map(routes.map((route) => [route.id, route]));
    const leagueKey = league === "lead" || league === "toprope" ? league : null;
    const filteredResults = leagueKey
      ? results.filter((res) => routeMap.get(res.route_id)?.discipline === leagueKey)
      : results;
    const pointsSum = filteredResults.reduce((sum, item) => sum + (item.points ?? 0) + (item.flash ? 1 : 0), 0);
    const gymIds = new Set(filteredResults.map((res) => routeMap.get(res.route_id)?.gym_id).filter(Boolean) as string[]);
    const routesClimbedCount = filteredResults.filter((result) => result.points > 0).length;
    const flashCountValue = filteredResults.filter((result) => result.flash).length;
    const avgPoints = routesClimbedCount > 0 ? pointsSum / routesClimbedCount : 0;

    return {
      points: pointsSum,
      visitedGyms: gymIds.size,
      routesClimbed: routesClimbedCount,
      flashCount: flashCountValue,
      avgPointsPerRoute: avgPoints,
    };
  }, [results, routes, league]);

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
      (item) =>
        item.role === "participant" &&
        item.participation_activated_at &&
        getClassName(item.birth_date, item.gender) === classKey,
    );

    const participantStats = participantProfiles.map((participant) => {
      const participantResults = allResults.filter(
        (result) => result.profile_id === participant.id && routeMap.get(result.route_id)?.discipline === leagueKey,
      );
      const totalPoints = participantResults.reduce(
        (sum, result) => sum + (result.points ?? 0) + (result.flash ? 1 : 0),
        0,
      );
      const climbed = participantResults.filter((result) => result.points > 0).length;
      const flashes = participantResults.filter((result) => result.flash).length;
      return { totalPoints, climbed, flashes };
    });

    const pointsAvg =
      participantStats.length > 0
        ? participantStats.reduce((sum, item) => sum + item.totalPoints, 0) / participantStats.length
        : 0;
    const routesAvg =
      participantStats.length > 0
        ? participantStats.reduce((sum, item) => sum + item.climbed, 0) / participantStats.length
        : 0;
    const totalFlash = participantStats.reduce((sum, item) => sum + item.flashes, 0);
    const totalRoutes = participantStats.reduce((sum, item) => sum + item.climbed, 0);
    const flashRate = totalRoutes > 0 ? (totalFlash / totalRoutes) * 100 : 0;

    return {
      avgPointsAll: pointsAvg,
      avgRoutesAll: routesAvg,
      avgFlashRate: flashRate,
    };
  }, [allProfiles, allResults, routes, league, birthDate, gender, getClassName]);

  const totalGyms = gyms.length || 0;
  const progress = totalGyms ? Math.round((visitedGyms / totalGyms) * 100) : 0;
  const today = new Date();
  const stagesFromSettings = getStages();
  const prepStart = getPreparationStart();
  const prepEnd = getPreparationEnd();
  const finaleDate = getFinaleDate();

  const stages: Array<Stage & { range: string }> = useMemo(() => {
    const items: Array<Stage & { range: string }> = [];

    if (prepStart && prepEnd) {
      const prepStartDate = new Date(prepStart);
      const prepEndDate = new Date(prepEnd);
      items.push({
        key: "preparation",
        label: "Schraubphase",
        start: prepStart,
        end: prepEnd,
        range: `${prepStartDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} - ${prepEndDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`,
      });
    }

    stagesFromSettings.forEach((stage) => {
      const startDate = new Date(stage.start);
      const monthName = startDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
      items.push({
        ...stage,
        range: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      });
    });

    if (finaleDate) {
      const finaleDateObj = new Date(finaleDate);
      items.push({
        key: "finale",
        label: "Finale",
        start: finaleDate,
        end: finaleDate,
        range: finaleDateObj.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      });
    }

    return items;
  }, [stagesFromSettings, prepStart, prepEnd, finaleDate]);

  const classLabel = getClassName(birthDate, gender) || "-";
  const leagueLabel =
    league === "lead" ? "Vorstieg" : league === "toprope" ? "Toprope" : "Noch nicht gesetzt";
  const age = birthDate ? getAgeAt(birthDate) : null;

  const comparisonTone =
    avgPointsAll > 0 && points >= avgPointsAll ? "text-emerald-600" : "text-[#a15523]";

  return (
    <div className="space-y-6">
      {prelaunchActive && role === "participant" ? (
        <StitchCard tone="cream" className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="stitch-kicker text-[#a15523]">Pre-Launch</div>
              <div className="stitch-headline text-2xl text-[#002637] sm:text-3xl">
                Dein Account ist aktiv. Der Rest startet am {unlockDate}.
              </div>
              <p className="max-w-3xl text-sm leading-6 text-[rgba(27,28,26,0.68)]">
                Du kannst dich schon jetzt einloggen, dein Profil prüfen und dich mit der App vertraut
                machen. Hallen, Codes, Ranglisten und weitere Wettbewerbsbereiche werden automatisch am{" "}
                {unlockDate} freigeschaltet.
              </p>
            </div>

            <StitchButton asChild>
              <Link to="/app/profile">
                Profil vervollständigen
                <ArrowRight className="h-4 w-4" />
              </Link>
            </StitchButton>
          </div>
        </StitchCard>
      ) : null}

      <StitchCard tone="navy" className="p-5 sm:p-6 lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StitchBadge tone="cream">Saison {getSeasonYear() || new Date().getFullYear().toString()}</StitchBadge>
              <StitchBadge tone="terracotta">{leagueLabel}</StitchBadge>
              <StitchBadge tone="ghost">{classLabel}</StitchBadge>
            </div>

            <div className="space-y-3">
              <div className="stitch-kicker text-[rgba(242,220,171,0.66)]">Dashboard Home</div>
              <h1 className="stitch-headline text-4xl leading-[0.9] text-[#f2dcab] sm:text-5xl">
                {firstName ? `Willkommen zurück, ${firstName}` : "Deine Saison im Überblick"}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[rgba(242,220,171,0.76)]">
                Editorialer Überblick über deine Liga, deinen Fortschritt und die nächsten Saison-Momente.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StitchButton asChild variant="cream">
                <Link to="/app/gyms">
                  Hallen öffnen
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </StitchButton>
              <StitchButton asChild variant="outline" className="border-[rgba(242,220,171,0.18)] bg-[rgba(242,220,171,0.08)] text-[#f2dcab] hover:bg-[rgba(242,220,171,0.14)]">
                <Link to="/app/rankings">Rangliste ansehen</Link>
              </StitchButton>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Aktueller Rang</div>
              <div className="stitch-metric mt-3 text-4xl text-[#f2dcab]">{currentRank ? `#${currentRank}` : "--"}</div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">In deiner Klasse</p>
            </div>
            <div className="rounded-[1.5rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Freischaltung</div>
              <div className="stitch-metric mt-3 text-4xl text-[#f2dcab]">{unlockDate}</div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">Liga-Features live</p>
            </div>
            <div className="rounded-[1.5rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Wertung</div>
              <div className="mt-3 text-lg font-semibold text-[#f2dcab]">{classLabel}</div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">
                {age !== null ? `${age} Jahre` : "Geburtsdatum noch offen"}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Wildcard</div>
              <div className="stitch-metric mt-3 text-4xl text-[#f2dcab]">{visitedGyms}/{totalGyms}</div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">Hallen besucht</p>
            </div>
          </div>
        </div>
      </StitchCard>

      <StitchCard tone="surface" className="p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Saison-Timeline</div>
              <div className="stitch-headline mt-2 text-2xl text-[#002637] sm:text-3xl">Aktuelle und nächste Etappen</div>
            </div>
            {getFinaleEnabled() ? <StitchBadge tone="navy">Finale aktiv</StitchBadge> : null}
          </div>

          <div className="stitch-scroll-x -mx-1 overflow-x-auto px-1">
            <div className="flex gap-3 pb-1">
              {stages.map((stage) => {
                const startDate = new Date(`${stage.start}T00:00:00`);
                const endDate = new Date(`${stage.end}T23:59:59`);
                const isUpcoming = today.getTime() < startDate.getTime();
                const isCurrent = today.getTime() >= startDate.getTime() && today.getTime() <= endDate.getTime();
                const startsInDays = Math.max(
                  0,
                  Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
                );
                const daysLeft = Math.max(
                  0,
                  Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
                );

                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => navigate(`/app/rankings?tab=stage&stage=${stage.key}`)}
                    className={`min-w-[220px] rounded-[1.45rem] border p-4 text-left transition-all ${
                      isCurrent
                        ? "border-[#a15523] bg-[#a15523] text-white shadow-[0_18px_32px_rgba(161,85,35,0.18)]"
                        : isUpcoming
                          ? "border-[rgba(0,38,55,0.12)] bg-[#f5efe6] text-[#002637]"
                          : "border-[rgba(0,38,55,0.08)] bg-white text-[#002637]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`stitch-kicker ${isCurrent ? "text-white/72" : "text-[#a15523]"}`}>
                          {stage.label}
                        </div>
                        <div className="stitch-headline mt-3 text-xl">{stage.range}</div>
                      </div>
                      <Timer className={`h-5 w-5 ${isCurrent ? "text-white/72" : "text-[#003d55]"}`} />
                    </div>
                    <p className={`mt-3 text-sm leading-6 ${isCurrent ? "text-white/82" : "text-[rgba(27,28,26,0.64)]"}`}>
                      {isUpcoming
                        ? `Startet in ${startsInDays} Tagen`
                        : isCurrent
                          ? `Läuft noch ${daysLeft} Tage`
                          : "Bereits abgeschlossen"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </StitchCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StitchCard tone="surface" className="p-5">
          <div className="flex items-center justify-between">
            <div className="stitch-kicker text-[#a15523]">Punkte</div>
            <Trophy className="h-5 w-5 text-[#003d55]" />
          </div>
          <div className="stitch-metric mt-4 text-5xl text-[#002637]">{points}</div>
          {avgPointsAll > 0 ? (
            <p className="mt-2 text-sm text-[rgba(27,28,26,0.62)]">
              Ø {Math.round(avgPointsAll)} · <span className={comparisonTone}>{Math.round(points - avgPointsAll)}</span>
            </p>
          ) : null}
        </StitchCard>

        <StitchCard tone="surface" className="p-5">
          <div className="flex items-center justify-between">
            <div className="stitch-kicker text-[#a15523]">Rang</div>
            <Award className="h-5 w-5 text-[#003d55]" />
          </div>
          <div className="stitch-metric mt-4 text-5xl text-[#002637]">{currentRank ? `#${currentRank}` : "--"}</div>
          <p className="mt-2 text-sm text-[rgba(27,28,26,0.62)]">In deiner Klasse</p>
        </StitchCard>

        <StitchCard tone="surface" className="p-5">
          <div className="flex items-center justify-between">
            <div className="stitch-kicker text-[#a15523]">Routen</div>
            <Target className="h-5 w-5 text-[#003d55]" />
          </div>
          <div className="stitch-metric mt-4 text-5xl text-[#002637]">{routesClimbed}</div>
          <p className="mt-2 text-sm text-[rgba(27,28,26,0.62)]">
            {avgRoutesAll > 0 ? `Ø ${Math.round(avgRoutesAll)} im Vergleich` : "Noch ohne Vergleichswert"}
          </p>
        </StitchCard>

        <StitchCard tone="surface" className="p-5">
          <div className="flex items-center justify-between">
            <div className="stitch-kicker text-[#a15523]">Flash</div>
            <Zap className="h-5 w-5 text-[#003d55]" />
          </div>
          <div className="stitch-metric mt-4 text-5xl text-[#002637]">{flashCount}</div>
          <p className="mt-2 text-sm text-[rgba(27,28,26,0.62)]">
            {routesClimbed > 0 ? `${Math.round((flashCount / routesClimbed) * 100)}% Rate · Ø ${Math.round(avgFlashRate)}%` : "Noch keine Rate verfügbar"}
          </p>
        </StitchCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <StitchCard tone="cream" className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Performance</div>
              <div className="stitch-headline mt-2 text-2xl text-[#002637]">Ø Punkte pro Route</div>
            </div>
            <TrendingUp className="h-6 w-6 text-[#003d55]" />
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="stitch-metric text-5xl text-[#002637]">
              {routesClimbed > 0 ? avgPointsPerRoute.toFixed(1) : "0.0"}
            </div>
            <div className="max-w-[220px] text-right text-sm leading-6 text-[rgba(27,28,26,0.64)]">
              {avgPointsAll > 0 && routesClimbed > 0
                ? `Ø aller Teilnehmenden: ${(avgPointsAll / Math.max(avgRoutesAll, 1)).toFixed(1)} Punkte pro Route`
                : "Sobald mehr Ergebnisse vorliegen, erscheint hier dein Vergleich."}
            </div>
          </div>
        </StitchCard>

        <StitchCard tone="surface" className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Wildcardqualifikation</div>
              <div className="stitch-headline mt-2 text-2xl text-[#002637]">Hallenfortschritt</div>
            </div>
            <Flag className="h-6 w-6 text-[#003d55]" />
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="stitch-metric text-5xl text-[#002637]">{visitedGyms}/{totalGyms}</div>
            <div className="text-sm text-[rgba(27,28,26,0.62)]">{progress}% abgeschlossen</div>
          </div>

          <div className="mt-4">
            <Progress value={progress} className="h-3 rounded-full bg-[rgba(0,38,55,0.08)] [&>*]:bg-[#a15523]" />
          </div>
        </StitchCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <StitchCard tone="surface" className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Code einlösen</div>
              <div className="stitch-headline mt-2 text-2xl text-[#002637]">Halle freischalten</div>
              <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                Mastercode oder Hallencode einlösen und direkt die passenden Routen öffnen.
              </p>
            </div>
            <MapPinned className="h-6 w-6 text-[#003d55]" />
          </div>
          <StitchButton asChild className="mt-5 w-full">
            <Link to="/app/gyms/redeem">
              Loslegen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </StitchButton>
        </StitchCard>

        <StitchCard tone="surface" className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Hallen Übersicht</div>
              <div className="stitch-headline mt-2 text-2xl text-[#002637]">Partnerhallen sehen</div>
              <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                Vertikale Hallenkarten mit Logos, Unlock-Status und deinem Fortschritt.
              </p>
            </div>
            <Flag className="h-6 w-6 text-[#003d55]" />
          </div>
          <StitchButton asChild variant="outline" className="mt-5 w-full">
            <Link to="/app/gyms">Zu den Hallen</Link>
          </StitchButton>
        </StitchCard>

        <StitchCard tone={getFinaleEnabled() ? "cream" : "surface"} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">{getFinaleEnabled() ? "Finale" : "Rangliste"}</div>
              <div className="stitch-headline mt-2 text-2xl text-[#002637]">
                {getFinaleEnabled() ? "Finale-Infos" : "Rangliste öffnen"}
              </div>
              <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                {getFinaleEnabled()
                  ? "Die Finalseite ist aktiv und kann direkt aus deinem Dashboard geöffnet werden."
                  : "Vergleiche deinen Stand in der Gesamt- oder Etappenwertung."}
              </p>
            </div>
            <CalendarDays className="h-6 w-6 text-[#003d55]" />
          </div>
          <StitchButton asChild variant={getFinaleEnabled() ? "navy" : "outline"} className="mt-5 w-full">
            <Link to={getFinaleEnabled() ? "/app/finale" : "/app/rankings"}>
              {getFinaleEnabled() ? "Finale ansehen" : "Zur Rangliste"}
            </Link>
          </StitchButton>
        </StitchCard>
      </div>
    </div>
  );
};

export default Home;
