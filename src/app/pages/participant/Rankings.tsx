import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Award,
  ChevronDown,
  MapPin,
  Medal,
  Route as RouteIcon,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import {
  StitchBadge,
  StitchButton,
  StitchCard,
  StitchSectionHeading,
} from "@/app/components/StitchPrimitives";
import { listGyms, listProfiles, listResults, listRoutes } from "@/services/appApi";
import { useSeasonSettings } from "@/services/seasonSettings";
import type { Gym, Result, Route } from "@/services/appTypes";
import { cn } from "@/lib/utils";

type RankingRow = {
  rank: number;
  name: string;
  points: number;
  profile_id: string;
  visitedGyms: number;
  flashes: number;
  tops: number;
  points_7_5: number;
  points_5: number;
  points_2_5: number;
  points_0: number;
  totalRoutes: number;
};

const normalizeDiscipline = (discipline: string) =>
  discipline === "vorstieg" ? "lead" : discipline === "toprope" ? "toprope" : discipline;

const getStageRange = (stageKey: string, stages: Array<{ key: string; start: string; end: string }>) => {
  const stage = stages.find((item) => item.key === stageKey);
  if (!stage) return null;
  return {
    start: new Date(`${stage.start}T00:00:00Z`),
    end: new Date(`${stage.end}T23:59:59Z`),
  };
};

const getClassLabel = (value: string) => {
  switch (value) {
    case "U15-m":
      return "U15 männlich";
    case "U15-w":
      return "U15 weiblich";
    case "Ü15-m":
      return "Ü15 männlich";
    case "Ü15-w":
      return "Ü15 weiblich";
    case "Ü40-m":
      return "Ü40 männlich";
    case "Ü40-w":
      return "Ü40 weiblich";
    default:
      return value;
  }
};

const Rankings = () => {
  const { profile, user } = useAuth();
  const { getClassName, getStages } = useSeasonSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const userLeague = (profile?.league || (user?.user_metadata?.league as string | undefined) || "toprope") as
    | "toprope"
    | "lead";
  const [leagueFilter, setLeagueFilter] = useState<"toprope" | "lead">(userLeague);
  const [className, setClassName] = useState("U15-m");
  const [genderFilter, setGenderFilter] = useState<"m" | "w">("m");
  const [ageFilter, setAgeFilter] = useState<"U15" | "Ü15" | "Ü40">("U15");
  const stages = getStages();
  const [tab, setTab] = useState(searchParams.get("tab") === "stage" ? "stage" : "overall");
  const [stageKey, setStageKey] = useState(searchParams.get("stage") || stages[0]?.key || "");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const birthDate = profile?.birth_date ?? (user?.user_metadata?.birth_date as string | undefined);
    const gender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as "m" | "w" | undefined;
    const derived = getClassName(birthDate ?? null, gender ?? null);
    if (derived) {
      setClassName(derived);
      const [age, genderValue] = derived.split("-") as ["U15" | "Ü15" | "Ü40", "m" | "w"];
      if (age) setAgeFilter(age);
      if (genderValue) setGenderFilter(genderValue);
    }
  }, [profile, user, getClassName]);

  useEffect(() => {
    const paramTab = searchParams.get("tab");
    const paramStage = searchParams.get("stage");

    if (paramTab === "stage" || paramTab === "overall") {
      setTab(paramTab);
    }

    if (paramStage && stages.some((stage) => stage.key === paramStage)) {
      setStageKey(paramStage);
    }
  }, [searchParams, stages]);

  useEffect(() => {
    if (!stageKey && stages[0]?.key) {
      setStageKey(stages[0].key);
    }
  }, [stageKey, stages]);

  useEffect(() => {
    const load = async () => {
      const [{ data: profiles }, { data: resultsData }, { data: routesData }, { data: gymsData }] =
        await Promise.all([listProfiles(), listResults(), listRoutes(), listGyms()]);

      if (!profiles || !resultsData || !routesData) {
        setRankings([]);
        return;
      }

      setResults(resultsData);
      setRoutes(routesData);
      if (gymsData) setGyms(gymsData);

      const routeMap = new Map(routesData.map((route) => [route.id, route]));
      const range = tab === "stage" && stages.length > 0 ? getStageRange(stageKey, stages) : null;

      const totals = resultsData.reduce<Record<string, number>>((acc, result) => {
        const route = routeMap.get(result.route_id);
        if (!route) return acc;
        if (normalizeDiscipline(route.discipline) !== leagueFilter) return acc;
        if (range) {
          const createdAt = result.created_at ? new Date(result.created_at) : null;
          if (!createdAt || createdAt < range.start || createdAt > range.end) return acc;
        }
        acc[result.profile_id] =
          (acc[result.profile_id] ?? 0) + (result.points ?? 0) + (result.flash ? 1 : 0);
        return acc;
      }, {});

      const stats = resultsData.reduce<
        Record<
          string,
          {
            visitedGyms: Set<string>;
            flashes: number;
            tops: number;
            points_7_5: number;
            points_5: number;
            points_2_5: number;
            points_0: number;
            totalRoutes: number;
          }
        >
      >((acc, result) => {
        const route = routeMap.get(result.route_id);
        if (!route) return acc;
        if (normalizeDiscipline(route.discipline) !== leagueFilter) return acc;
        if (range) {
          const createdAt = result.created_at ? new Date(result.created_at) : null;
          if (!createdAt || createdAt < range.start || createdAt > range.end) return acc;
        }

        if (!acc[result.profile_id]) {
          acc[result.profile_id] = {
            visitedGyms: new Set(),
            flashes: 0,
            tops: 0,
            points_7_5: 0,
            points_5: 0,
            points_2_5: 0,
            points_0: 0,
            totalRoutes: 0,
          };
        }

        const stat = acc[result.profile_id];
        stat.visitedGyms.add(route.gym_id);
        if (result.flash) stat.flashes += 1;
        if (result.points === 10) stat.tops += 1;
        if (result.points === 7.5) stat.points_7_5 += 1;
        if (result.points === 5) stat.points_5 += 1;
        if (result.points === 2.5) stat.points_2_5 += 1;
        if (result.points === 0) stat.points_0 += 1;
        stat.totalRoutes += 1;

        return acc;
      }, {});

      const rows = profiles
        .filter((item) => {
          if (item.role === "gym_admin" || item.role === "league_admin") return false;
          if (!item.participation_activated_at) return false;
          return item.league === null || item.league === leagueFilter;
        })
        .map((item) => {
          const stat = stats[item.id] || {
            visitedGyms: new Set<string>(),
            flashes: 0,
            tops: 0,
            points_7_5: 0,
            points_5: 0,
            points_2_5: 0,
            points_0: 0,
            totalRoutes: 0,
          };

          return {
            id: item.id,
            className: getClassName(item.birth_date, item.gender),
            name: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || item.email || "Unbekannt",
            points: totals[item.id] ?? 0,
            visitedGyms: stat.visitedGyms.size,
            flashes: stat.flashes,
            tops: stat.tops,
            points_7_5: stat.points_7_5,
            points_5: stat.points_5,
            points_2_5: stat.points_2_5,
            points_0: stat.points_0,
            totalRoutes: stat.totalRoutes,
          };
        })
        .filter((row) => row.className === className)
        .sort((a, b) => b.points - a.points)
        .map((row, index) => ({
          rank: index + 1,
          name: row.name,
          points: row.points,
          profile_id: row.id,
          visitedGyms: row.visitedGyms,
          flashes: row.flashes,
          tops: row.tops,
          points_7_5: row.points_7_5,
          points_5: row.points_5,
          points_2_5: row.points_2_5,
          points_0: row.points_0,
          totalRoutes: row.totalRoutes,
        }));

      setRankings(rows);
    };

    void load();
  }, [className, leagueFilter, tab, stageKey, stages, getClassName]);

  const getParticipantDetails = (profileId: string) => {
    if (!results.length || !routes.length || !gyms.length) return null;

    const routeMap = new Map(routes.map((route) => [route.id, route]));
    const gymMap = new Map(gyms.map((gym) => [gym.id, gym]));
    const range = tab === "stage" && stages.length > 0 ? getStageRange(stageKey, stages) : null;

    const participantResults = results.filter((result) => {
      if (result.profile_id !== profileId) return false;
      const route = routeMap.get(result.route_id);
      if (!route) return false;
      if (normalizeDiscipline(route.discipline) !== leagueFilter) return false;
      if (range) {
        const createdAt = result.created_at ? new Date(result.created_at) : null;
        if (!createdAt || createdAt < range.start || createdAt > range.end) return false;
      }
      return true;
    });

    const gymGroups = new Map<
      string,
      { gym: Gym; routes: Array<{ route: Route; result: Result; points: number }>; totalPoints: number }
    >();

    participantResults.forEach((result) => {
      const route = routeMap.get(result.route_id);
      if (!route) return;
      const gym = gymMap.get(route.gym_id);
      if (!gym) return;
      const points = result.points + (result.flash ? 1 : 0);

      if (!gymGroups.has(gym.id)) {
        gymGroups.set(gym.id, { gym, routes: [], totalPoints: 0 });
      }

      const group = gymGroups.get(gym.id);
      if (!group) return;
      group.routes.push({ route, result, points });
      group.totalPoints += points;
    });

    return Array.from(gymGroups.values()).sort((a, b) => b.totalPoints - a.totalPoints);
  };

  const updateSearch = (nextTab: "overall" | "stage", nextStage: string) => {
    setTab(nextTab);
    setStageKey(nextStage);
    setSearchParams(nextTab === "stage" ? { tab: nextTab, stage: nextStage } : { tab: nextTab, stage: nextStage });
  };

  const toggleRow = (profileId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  const currentUserRow = rankings.find((row) => row.profile_id === profile?.id) ?? null;
  const classLabel = getClassLabel(className);
  const leagueLabel = leagueFilter === "lead" ? "Vorstieg" : "Toprope";
  const stageLabel = stages.find((stage) => stage.key === stageKey)?.label || "Etappe";
  const topThree = rankings.slice(0, 3);
  const restRows = rankings.slice(3);
  const participationInactive = profile?.role === "participant" && !profile?.participation_activated_at;

  return (
    <div className="space-y-6">
      {participationInactive ? (
        <StitchCard tone="cream" className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="stitch-kicker text-[#a15523]">Teilnahme fehlt</div>
              <p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">
                Du erscheinst erst in den Ranglisten, wenn du deine Teilnahme freigeschaltet hast.
              </p>
            </div>
            <StitchButton asChild size="sm">
              <Link to="/app/participation/redeem">Jetzt freischalten</Link>
            </StitchButton>
          </div>
        </StitchCard>
      ) : null}

      <StitchCard tone="navy" className="p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StitchBadge tone="cream">{leagueLabel}</StitchBadge>
              <StitchBadge tone="terracotta">{classLabel}</StitchBadge>
              <StitchBadge tone="ghost">{tab === "stage" ? stageLabel : "Gesamtwertung"}</StitchBadge>
            </div>

            <StitchSectionHeading
              eyebrow="Rangliste"
              title="Rangliste deiner Klasse"
              description="Filter, Etappen und Detail-Ansichten im Stitch-Stil, aber mit deiner bestehenden Ranking-Logik."
              className="[&_.stitch-headline]:text-[#f2dcab] [&_.stitch-kicker]:text-[rgba(242,220,171,0.66)] [&_p]:text-[rgba(242,220,171,0.76)]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Dein Rang</div>
              <div className="stitch-metric mt-3 text-4xl text-[#f2dcab]">
                {currentUserRow ? `#${currentUserRow.rank}` : "--"}
              </div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">
                {currentUserRow ? `${currentUserRow.points} Punkte` : "Noch keine Platzierung"}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Modus</div>
              <div className="mt-3 text-lg font-semibold text-[#f2dcab]">
                {tab === "stage" ? `Etappe ${stageLabel}` : "Gesamtwertung"}
              </div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">{rankings.length} aktive Einträge</p>
            </div>
          </div>
        </div>
      </StitchCard>

      <StitchCard tone="surface" className="p-5 sm:p-6">
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[auto_auto_1fr] lg:items-end">
            <div className="space-y-2">
              <div className="stitch-kicker text-[#a15523]">Liga</div>
              <div className="flex flex-wrap gap-2">
                {(["toprope", "lead"] as const).map((leagueValue) => (
                  <button
                    key={leagueValue}
                    type="button"
                    onClick={() => setLeagueFilter(leagueValue)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                      leagueFilter === leagueValue
                        ? "bg-[#a15523] text-white"
                        : "bg-[#f5efe5] text-[#003d55] hover:bg-[#ece2d3]",
                    )}
                  >
                    {leagueValue === "lead" ? "Vorstieg" : "Toprope"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="stitch-kicker text-[#a15523]">Wertung</div>
              <div className="flex flex-wrap gap-2">
                {(["m", "w"] as const).map((genderValue) => (
                  <button
                    key={genderValue}
                    type="button"
                    onClick={() => {
                      setGenderFilter(genderValue);
                      setClassName(`${ageFilter}-${genderValue}`);
                    }}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                      genderFilter === genderValue
                        ? "bg-[#003d55] text-[#f2dcab]"
                        : "bg-[#f5efe5] text-[#003d55] hover:bg-[#ece2d3]",
                    )}
                  >
                    {genderValue.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="stitch-kicker text-[#a15523]">Klasse</div>
              <div className="flex flex-wrap gap-2">
                {(["U15", "Ü15", "Ü40"] as const).map((ageValue) => (
                  <button
                    key={ageValue}
                    type="button"
                    onClick={() => {
                      setAgeFilter(ageValue);
                      setClassName(`${ageValue}-${genderFilter}`);
                    }}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                      ageFilter === ageValue
                        ? "bg-[#003d55] text-[#f2dcab]"
                        : "bg-[#f5efe5] text-[#003d55] hover:bg-[#ece2d3]",
                    )}
                  >
                    {ageValue}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-start">
            <div className="space-y-2">
              <div className="stitch-kicker text-[#a15523]">Wertungstyp</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateSearch("overall", stageKey)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                    tab === "overall" ? "bg-[#a15523] text-white" : "bg-[#f5efe5] text-[#003d55] hover:bg-[#ece2d3]",
                  )}
                >
                  Gesamtwertung
                </button>
                <button
                  type="button"
                  onClick={() => updateSearch("stage", stageKey || stages[0]?.key || "")}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                    tab === "stage" ? "bg-[#a15523] text-white" : "bg-[#f5efe5] text-[#003d55] hover:bg-[#ece2d3]",
                  )}
                >
                  Etappenwertung
                </button>
              </div>
            </div>

            {tab === "stage" ? (
              <div className="space-y-2">
                <div className="stitch-kicker text-[#a15523]">Etappe</div>
                <div className="stitch-scroll-x -mx-1 overflow-x-auto px-1">
                  <div className="flex gap-2 pb-1">
                    {stages.map((stage) => (
                      <button
                        key={stage.key}
                        type="button"
                        onClick={() => updateSearch("stage", stage.key)}
                        className={cn(
                          "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all",
                          stageKey === stage.key
                            ? "bg-[#003d55] text-[#f2dcab]"
                            : "bg-[#f5efe5] text-[#003d55] hover:bg-[#ece2d3]",
                        )}
                      >
                        {stage.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </StitchCard>

      {rankings.length === 0 ? (
        <StitchCard tone="surface" className="p-6 text-center">
          <div className="stitch-headline text-2xl text-[#002637]">Noch keine Rangliste verfügbar</div>
          <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
            Sobald Ergebnisse für diese Kombination vorliegen, erscheint hier die Rangliste.
          </p>
        </StitchCard>
      ) : (
        <>
          {topThree.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {topThree.map((row) => {
                const Icon = row.rank === 1 ? Trophy : row.rank === 2 ? Medal : Award;
                const tone = row.rank === 1 ? "navy" : row.rank === 2 ? "surface" : "cream";

                return (
                  <StitchCard key={row.profile_id} tone={tone} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={cn("stitch-kicker", tone === "navy" ? "text-[rgba(242,220,171,0.62)]" : "text-[#a15523]")}>
                          Platz {row.rank}
                        </div>
                        <div
                          className={cn(
                            "stitch-headline mt-3 text-3xl",
                            tone === "navy" ? "text-[#f2dcab]" : "text-[#002637]",
                          )}
                        >
                          {row.name}
                        </div>
                      </div>
                      <Icon className={cn("h-6 w-6", tone === "navy" ? "text-[#f2dcab]" : "text-[#003d55]")} />
                    </div>

                    <div className={cn("stitch-metric mt-6 text-5xl", tone === "navy" ? "text-[#f2dcab]" : "text-[#002637]")}>
                      {row.points}
                    </div>
                    <p className={cn("mt-2 text-sm", tone === "navy" ? "text-[rgba(242,220,171,0.72)]" : "text-[rgba(27,28,26,0.64)]")}>
                      {row.totalRoutes} Routen · {row.visitedGyms} Hallen
                    </p>
                  </StitchCard>
                );
              })}
            </div>
          ) : null}

          <div className="space-y-3">
            {(topThree.length > 0 ? restRows : rankings).map((row) => {
              const isUser = row.profile_id === profile?.id;
              const details = expandedRows.has(row.profile_id) ? getParticipantDetails(row.profile_id) : null;
              const Icon = row.rank === 1 ? Trophy : row.rank === 2 ? Medal : row.rank === 3 ? Award : null;

              return (
                <StitchCard key={row.profile_id} tone={isUser ? "cream" : "surface"} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-[#003d55] text-[#f2dcab]">
                        {Icon ? <Icon className="h-5 w-5" /> : <span className="text-sm font-semibold">#{row.rank}</span>}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold text-[#002637]">{row.name}</div>
                          {isUser ? <StitchBadge tone="terracotta">Du</StitchBadge> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[rgba(27,28,26,0.64)]">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-[#003d55]" />
                            {row.visitedGyms} Hallen
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <RouteIcon className="h-4 w-4 text-[#003d55]" />
                            {row.totalRoutes} Routen
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-[#a15523]" />
                            {row.flashes} Flashes
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Target className="h-4 w-4 text-[#003d55]" />
                            {row.tops} Tops
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 lg:justify-end">
                      <div className="text-right">
                        <div className="stitch-metric text-4xl text-[#002637]">{row.points}</div>
                        <p className="text-sm text-[rgba(27,28,26,0.62)]">Punkte</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRow(row.profile_id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(0,38,55,0.08)] bg-white/70 text-[#003d55] transition hover:bg-white"
                        aria-label={expandedRows.has(row.profile_id) ? "Details ausblenden" : "Details anzeigen"}
                      >
                        <ChevronDown
                          className={cn("h-5 w-5 transition-transform", expandedRows.has(row.profile_id) && "rotate-180")}
                        />
                      </button>
                    </div>
                  </div>

                  {expandedRows.has(row.profile_id) ? (
                    <div className="mt-4 space-y-4 border-t border-[rgba(0,38,55,0.08)] pt-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-[1.2rem] bg-[#f5efe5] p-3">
                          <div className="stitch-kicker text-[#a15523]">Hallen</div>
                          <div className="mt-2 text-xl font-semibold text-[#002637]">{row.visitedGyms}</div>
                        </div>
                        <div className="rounded-[1.2rem] bg-[#f5efe5] p-3">
                          <div className="stitch-kicker text-[#a15523]">Routen</div>
                          <div className="mt-2 text-xl font-semibold text-[#002637]">{row.totalRoutes}</div>
                        </div>
                        <div className="rounded-[1.2rem] bg-[#f5efe5] p-3">
                          <div className="stitch-kicker text-[#a15523]">7,5 Punkte</div>
                          <div className="mt-2 text-xl font-semibold text-[#002637]">{row.points_7_5}</div>
                        </div>
                        <div className="rounded-[1.2rem] bg-[#f5efe5] p-3">
                          <div className="stitch-kicker text-[#a15523]">5 Punkte</div>
                          <div className="mt-2 text-xl font-semibold text-[#002637]">{row.points_5}</div>
                        </div>
                        <div className="rounded-[1.2rem] bg-[#f5efe5] p-3">
                          <div className="stitch-kicker text-[#a15523]">2,5 / 0</div>
                          <div className="mt-2 text-xl font-semibold text-[#002637]">
                            {row.points_2_5} / {row.points_0}
                          </div>
                        </div>
                      </div>

                      {details && details.length > 0 ? (
                        <div className="grid gap-3 lg:grid-cols-2">
                          {details.map((group) => (
                            <StitchCard key={group.gym.id} tone="muted" className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="stitch-kicker text-[#a15523]">{group.gym.city || "Halle"}</div>
                                  <div className="mt-2 text-lg font-semibold text-[#002637]">{group.gym.name}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-semibold text-[#002637]">{group.totalPoints}</div>
                                  <div className="text-xs text-[rgba(27,28,26,0.62)]">Punkte</div>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {group.routes.map(({ route, result, points }) => (
                                  <div
                                    key={result.id}
                                    className={cn(
                                      "rounded-full px-3 py-1.5 text-xs font-semibold",
                                      result.flash
                                        ? "bg-[#a15523] text-white"
                                        : "bg-white text-[#003d55]",
                                    )}
                                  >
                                    {route.code} · {points}
                                  </div>
                                ))}
                              </div>
                            </StitchCard>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[rgba(27,28,26,0.64)]">Keine Detailergebnisse gefunden.</p>
                      )}
                    </div>
                  ) : null}
                </StitchCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Rankings;
