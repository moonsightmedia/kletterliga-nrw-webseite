import type { Gym, Profile, Result, Route, Stage } from "@/services/appTypes";

export const WILDCARD_TARGET = 8;

export type LeagueValue = "toprope" | "lead";
export type RankingLeagueScope = LeagueValue | "all";
export type RankingGenderScope = "m" | "w";
export type RankingAgeScope = "all" | "U15" | "UE15" | "UE40";

export type RankingStageRange = {
  start: Date;
  end: Date;
};

export type RankingRowData = {
  profileId: string;
  rank: number;
  name: string;
  avatarUrl: string | null;
  homeGymName: string | null;
  homeGymCity: string | null;
  points: number;
  visitedGyms: number;
  flashCount: number;
  totalRoutes: number;
  points10: number;
  points7_5: number;
  points5: number;
  points2_5: number;
  points0: number;
};

export const buildRankingVisibilityWindow = (
  rows: RankingRowData[],
  currentProfileId: string | null,
  expanded: boolean,
) => {
  if (rows.length === 0) {
    return {
      visibleRows: [] as RankingRowData[],
      separatorBeforeProfileId: null as string | null,
      hasHiddenRows: false,
    };
  }

  if (expanded) {
    return {
      visibleRows: rows,
      separatorBeforeProfileId: null,
      hasHiddenRows: false,
    };
  }

  const podiumRows = rows.slice(0, Math.min(3, rows.length));
  const currentIndex = currentProfileId ? rows.findIndex((row) => row.profileId === currentProfileId) : -1;

  if (currentIndex < 0) {
    return {
      visibleRows: podiumRows,
      separatorBeforeProfileId: null,
      hasHiddenRows: rows.length > podiumRows.length,
    };
  }

  const windowStart = Math.max(0, currentIndex - 2);
  const windowEnd = Math.min(rows.length, currentIndex + 3);
  const currentWindowRows = rows.slice(windowStart, windowEnd);

  const visibleRows = [...podiumRows, ...currentWindowRows].filter(
    (row, index, list) => list.findIndex((candidate) => candidate.profileId === row.profileId) === index,
  );

  const firstWindowRow = currentWindowRows.find((row) => !podiumRows.some((podiumRow) => podiumRow.profileId === row.profileId));

  if (windowStart <= podiumRows.length - 1) {
    return {
      visibleRows,
      separatorBeforeProfileId: null,
      hasHiddenRows: visibleRows.length < rows.length,
    };
  }

  return {
    visibleRows,
    separatorBeforeProfileId: firstWindowRow?.profileId ?? null,
    hasHiddenRows: visibleRows.length < rows.length,
  };
};

export const getDateBoundaryTimeRanking = (value: string, boundary: "start" | "end") => {
  const suffix = boundary === "end" ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const time = new Date(`${value}${suffix}`).getTime();
  return Number.isNaN(time) ? null : time;
};

export const getCreatedAtTimeRanking = (value: string | null | undefined) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

type RankingStats = {
  visitedGymIds: Set<string>;
  flashCount: number;
  totalRoutes: number;
  points10: number;
  points7_5: number;
  points5: number;
  points2_5: number;
  points0: number;
};

export type ParticipantProgressSlot = {
  id: string;
  gym: Gym | null;
  status: "done" | "open" | "empty";
  lastActivity: string | null;
};

export type ParticipantRouteCell = {
  routeId: string;
  code: string;
  hasResult: boolean;
  flash: boolean;
  points: number | null;
};

export type ParticipantGymRouteGroup = {
  gym: Gym;
  totalRoutes: number;
  loggedRoutes: number;
  lastActivity: string | null;
  totalPoints: number;
  cells: ParticipantRouteCell[];
};

export type ParticipantAscentItem = {
  id: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  gymId: string;
  gymName: string;
  gradeLabel: string | null;
  points: number;
  flash: boolean;
  timestamp: string | null;
  relativeTime: string;
};

export type ParticipantHistorySession = {
  id: string;
  gymId: string;
  gymName: string;
  gymCity: string | null;
  sessionDate: string;
  totalPoints: number;
  routeCount: number;
  monthKey: string;
  monthLabel: string;
  lastTimestamp: string | null;
};

export type ParticipantProfileData = {
  profile: Profile;
  displayName: string;
  avatarUrl: string | null;
  league: LeagueValue | null;
  leagueLabel: string;
  className: string | null;
  homeGym: Gym | null;
  homeGymLabel: string;
  rank: number | null;
  totalParticipants: number;
  points: number;
  formattedPoints: string;
  topGrade: string | null;
  sessionCount: number;
  routesLogged: number;
  flashCount: number;
  flashRate: number;
  averagePoints: number;
  visitedGyms: number;
  gymProgressSlots: ParticipantProgressSlot[];
  gymRouteGroups: ParticipantGymRouteGroup[];
  recentAscents: ParticipantAscentItem[];
  historyItems: ParticipantAscentItem[];
  historySessions: ParticipantHistorySession[];
};

const getResultTimestamp = (result: Result) => result.updated_at || result.created_at || null;
const relativeTimeFormatter = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });
const monthLabelFormatter = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  timeZone: "UTC",
});

const getTimeValue = (value: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getResultDayKey = (result: Result) => {
  const source = result.created_at || getResultTimestamp(result);
  return source?.slice(0, 10) ?? null;
};

const getDateFromDayKey = (dayKey: string) => {
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const getMonthLabel = (dayKey: string) => {
  const date = getDateFromDayKey(dayKey);
  if (!date) return dayKey;
  return monthLabelFormatter.format(date);
};

const getResultScore = (result: Result) => (result.points ?? 0) + (result.flash ? 1 : 0);

const sortByCode = (a: Route, b: Route) => {
  const numA = Number(a.code.replace(/\D/g, "")) || 0;
  const numB = Number(b.code.replace(/\D/g, "")) || 0;
  if (numA !== numB) return numA - numB;
  return a.code.localeCompare(b.code);
};

const getGradeSortValue = (gradeLabel: string | null | undefined) => {
  if (!gradeLabel) return Number.NEGATIVE_INFINITY;

  const matches = gradeLabel.toUpperCase().match(/\d+\s*[ABC]?[+-]?/g);
  const candidate = matches?.[matches.length - 1]?.replace(/\s+/g, "") ?? gradeLabel.toUpperCase();
  const parts = candidate.match(/(\d+)([ABC]?)([+-]?)/);
  if (!parts) return Number.NEGATIVE_INFINITY;

  const numberValue = Number(parts[1]);
  const letterValue = parts[2] === "A" ? 0 : parts[2] === "B" ? 10 : parts[2] === "C" ? 20 : 0;
  const modifierValue = parts[3] === "+" ? 5 : parts[3] === "-" ? -5 : 0;

  return numberValue * 100 + letterValue + modifierValue;
};

const formatPoints = (value: number) => {
  const hasFraction = Math.abs(value % 1) > 0.001;
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: hasFraction ? 1 : 0,
  }).format(value);
};

const formatRelativeTime = (value: string | null) => {
  if (!value) return "ohne Datum";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ohne Datum";

  const diffInMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  const absMinutes = Math.abs(diffInMinutes);

  if (absMinutes < 60) {
    return relativeTimeFormatter.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) {
    return relativeTimeFormatter.format(diffInHours, "hour");
  }

  const diffInDays = Math.round(diffInHours / 24);
  if (Math.abs(diffInDays) < 30) {
    return relativeTimeFormatter.format(diffInDays, "day");
  }

  return date.toLocaleDateString("de-DE");
};

export const normalizeDiscipline = (discipline: string | null | undefined) => {
  if (discipline === "vorstieg") return "lead";
  if (discipline === "toprope" || discipline === "lead") return discipline;
  return discipline ?? null;
};

export const getLeagueLabel = (league: LeagueValue | null) => {
  if (league === "lead") return "Vorstieg";
  if (league === "toprope") return "Toprope";
  return "Noch offen";
};

export const getClassLabel = (value: string | null) => {
  switch (value) {
    case "U15-m":
      return "U15 m\u00e4nnlich";
    case "U15-w":
      return "U15 weiblich";
    case "\u00dc15-m":
      return "\u00dc15 m\u00e4nnlich";
    case "\u00dc15-w":
      return "\u00dc15 weiblich";
    case "\u00dc40-m":
      return "\u00dc40 m\u00e4nnlich";
    case "\u00dc40-w":
      return "\u00dc40 weiblich";
    default:
      return value ?? "Noch offen";
  }
};

export const getDisplayName = (profile: Profile) =>
  `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email || "Unbekannt";

export const getStageRange = (
  stageKey: string,
  stages: Array<Pick<Stage, "key" | "start" | "end">>,
): RankingStageRange | null => {
  const stage = stages.find((item) => item.key === stageKey);
  if (!stage) return null;

  return {
    start: new Date(`${stage.start}T00:00:00Z`),
    end: new Date(`${stage.end}T23:59:59Z`),
  };
};

/** Ob zur aktuellen Uhrzeit die Etappenwertung bereits läuft (Start: Mitternacht UTC am Kalendertag `stage.start`, Ende inklusive `stage.end`). */
export const stageRankingPeriodHasBegun = (
  stage: Pick<Stage, "start">,
  nowMs: number = Date.now(),
): boolean => {
  const boundary = getDateBoundaryTimeRanking(stage.start, "start");
  return boundary !== null && nowMs >= boundary;
};

/** Ob die Etappe vorbei ist (nach Ende des letzten Wertungskalendertags `stage.end`, Ende inkl. 23:59:59.999 UTC). */
export const stageRankingPeriodHasEnded = (
  stage: Pick<Stage, "end">,
  nowMs: number = Date.now(),
): boolean => {
  const boundary = getDateBoundaryTimeRanking(stage.end, "end");
  return boundary !== null && nowMs > boundary;
};

const middayUtcFromYmd = (ymd: string) => new Date(`${ymd}T12:00:00.000Z`);

/** Kalendertag für Anzeige (de-DE); Mittag UTC vermeidet Verschiebungen über lokale Zeitzonen. */
export const formatRankingStageBoundaryDateDe = (ymd: string) =>
  middayUtcFromYmd(ymd).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Satzteil „vom … bis …“ bzw. „am …“, passend zur Erklär der Etappenwertung. */
export const formatRankingStagePeriodSentenceDe = (stage: Pick<Stage, "start" | "end">): string => {
  const from = formatRankingStageBoundaryDateDe(stage.start);
  const to = formatRankingStageBoundaryDateDe(stage.end);
  return stage.start === stage.end ? `am ${from}` : `vom ${from} bis ${to}`;
};

const isResultInStageRange = (result: Result, stageRange: RankingStageRange | null) => {
  if (!stageRange) return true;
  const createdAt = result.created_at ? new Date(result.created_at) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
  return createdAt >= stageRange.start && createdAt <= stageRange.end;
};

const createEmptyRankingStats = (): RankingStats => ({
  visitedGymIds: new Set<string>(),
  flashCount: 0,
  totalRoutes: 0,
  points10: 0,
  points7_5: 0,
  points5: 0,
  points2_5: 0,
  points0: 0,
});

const buildRankingRowsBase = ({
  profiles,
  results,
  routeMap,
  gymMap,
  stageRange,
  includeProfile,
}: {
  profiles: Profile[];
  results: Result[];
  routeMap: Map<string, Route>;
  gymMap: Map<string, Gym>;
  stageRange: RankingStageRange | null;
  includeProfile: (profile: Profile) => boolean;
}): RankingRowData[] => {
  const totals = results.reduce<Record<string, number>>((acc, result) => {
    const route = routeMap.get(result.route_id);
    if (!route) return acc;
    if (!isResultInStageRange(result, stageRange)) return acc;

    acc[result.profile_id] = (acc[result.profile_id] ?? 0) + getResultScore(result);
    return acc;
  }, {});

  const stats = results.reduce<Record<string, RankingStats>>((acc, result) => {
    const route = routeMap.get(result.route_id);
    if (!route) return acc;
    if (!isResultInStageRange(result, stageRange)) return acc;

    if (!acc[result.profile_id]) {
      acc[result.profile_id] = createEmptyRankingStats();
    }

    const stat = acc[result.profile_id];
    stat.visitedGymIds.add(route.gym_id);
    stat.totalRoutes += 1;
    if (result.flash) stat.flashCount += 1;
    if (result.points === 10) stat.points10 += 1;
    if (result.points === 7.5) stat.points7_5 += 1;
    if (result.points === 5) stat.points5 += 1;
    if (result.points === 2.5) stat.points2_5 += 1;
    if (result.points === 0) stat.points0 += 1;
    return acc;
  }, {});

  return profiles
    .filter(includeProfile)
    .map((item) => {
      const stat = stats[item.id] ?? createEmptyRankingStats();
      const homeGym = item.home_gym_id ? gymMap.get(item.home_gym_id) ?? null : null;

      return {
        profileId: item.id,
        rank: 0,
        name: getDisplayName(item),
        avatarUrl: item.avatar_url ?? null,
        homeGymName: homeGym?.name ?? null,
        homeGymCity: homeGym?.city ?? null,
        points: totals[item.id] ?? 0,
        visitedGyms: stat.visitedGymIds.size,
        flashCount: stat.flashCount,
        totalRoutes: stat.totalRoutes,
        points10: stat.points10,
        points7_5: stat.points7_5,
        points5: stat.points5,
        points2_5: stat.points2_5,
        points0: stat.points0,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name, "de");
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
};

type BuildRankingRowsInput = {
  profiles: Profile[];
  results: Result[];
  routes: Route[];
  gyms: Gym[];
  league: LeagueValue;
  className: string;
  stageRange?: RankingStageRange | null;
  getClassName: (birthDate: string | null | undefined, gender: "m" | "w" | null | undefined) => string | null;
};

export const buildRankingRows = ({
  profiles,
  results,
  routes,
  gyms,
  league,
  className,
  stageRange = null,
  getClassName,
}: BuildRankingRowsInput): RankingRowData[] => {
  const scopedRoutes = routes.filter((route) => normalizeDiscipline(route.discipline) === league);
  const routeMap = new Map(scopedRoutes.map((route) => [route.id, route]));
  const gymMap = new Map(gyms.map((gym) => [gym.id, gym]));

  return buildRankingRowsBase({
    profiles,
    results,
    routeMap,
    gymMap,
    stageRange,
    includeProfile: (item) => {
      if (item.role === "gym_admin" || item.role === "league_admin") return false;
      if (!item.participation_activated_at) return false;
      if (item.league !== null && normalizeDiscipline(item.league) !== league) return false;
      return getClassName(item.birth_date, item.gender) === className;
    },
  });
};

type BuildRankingRowsForScopeInput = {
  profiles: Profile[];
  results: Result[];
  routes: Route[];
  gyms: Gym[];
  leagueScope: RankingLeagueScope;
  gender: RankingGenderScope;
  ageScope: RankingAgeScope;
  stageRange?: RankingStageRange | null;
  getClassName: (birthDate: string | null | undefined, gender: "m" | "w" | null | undefined) => string | null;
};

export const buildRankingRowsForScope = ({
  profiles,
  results,
  routes,
  gyms,
  leagueScope,
  gender,
  ageScope,
  stageRange = null,
  getClassName,
}: BuildRankingRowsForScopeInput): RankingRowData[] => {
  const scopedRoutes = getScopedRoutes(routes, leagueScope);
  const routeMap = new Map(scopedRoutes.map((route) => [route.id, route]));
  const gymMap = new Map(gyms.map((gym) => [gym.id, gym]));

  return buildRankingRowsBase({
    profiles,
    results,
    routeMap,
    gymMap,
    stageRange,
    includeProfile: (item) => {
      if (item.role === "gym_admin" || item.role === "league_admin") return false;
      if (!item.participation_activated_at) return false;
      if (item.gender !== gender) return false;

      const className = getClassName(item.birth_date, item.gender);
      if (!className) return false;

      const profileLeague = normalizeDiscipline(item.league) as LeagueValue | null;
      if (leagueScope !== "all" && profileLeague !== null && profileLeague !== leagueScope) return false;

      if (ageScope === "all") return true;
      if (ageScope === "U15") return className.startsWith("U15-");
      if (ageScope === "UE15") return className.startsWith("\u00dc15-");
      return className.startsWith("\u00dc40-");
    },
  });
};

const getScopedRoutes = (routes: Route[], league: LeagueValue | RankingLeagueScope | null) => {
  if (!league || league === "all") return routes;
  return routes.filter((route) => normalizeDiscipline(route.discipline) === league);
};

const getGymRouteSet = (routes: Route[], gymId: string) => {
  const scopedRoutes = routes.filter((route) => route.gym_id === gymId);
  const activeRoutes = scopedRoutes.filter((route) => route.active);
  return (activeRoutes.length > 0 ? activeRoutes : scopedRoutes).sort(sortByCode);
};

type BuildParticipantProfileDataInput = {
  selectedProfile: Profile | null;
  allProfiles: Profile[];
  results: Result[];
  routes: Route[];
  gyms: Gym[];
  stageRange?: RankingStageRange | null;
  getClassName: (birthDate: string | null | undefined, gender: "m" | "w" | null | undefined) => string | null;
};

export const buildParticipantProfileData = ({
  selectedProfile,
  allProfiles,
  results,
  routes,
  gyms,
  stageRange = null,
  getClassName,
}: BuildParticipantProfileDataInput): ParticipantProfileData | null => {
  if (!selectedProfile) return null;

  const league = normalizeDiscipline(selectedProfile.league) as LeagueValue | null;
  const className = getClassName(selectedProfile.birth_date, selectedProfile.gender);
  const homeGym = selectedProfile.home_gym_id
    ? gyms.find((gym) => gym.id === selectedProfile.home_gym_id) ?? null
    : null;
  const scopedRoutes = getScopedRoutes(routes, league);
  const routeMap = new Map(scopedRoutes.map((route) => [route.id, route]));
  const gymMap = new Map(gyms.map((gym) => [gym.id, gym]));

  const participantResults = results
    .filter(
      (result) =>
        result.profile_id === selectedProfile.id &&
        routeMap.has(result.route_id) &&
        isResultInStageRange(result, stageRange),
    )
    .sort((a, b) => getTimeValue(getResultTimestamp(b)) - getTimeValue(getResultTimestamp(a)));

  const latestResultByRoute = participantResults.reduce<Map<string, Result>>((acc, result) => {
    if (!acc.has(result.route_id)) {
      acc.set(result.route_id, result);
    }
    return acc;
  }, new Map());

  const historyItems: ParticipantAscentItem[] = participantResults
    .map((result) => {
      const route = routeMap.get(result.route_id);
      if (!route) return null;
      const gym = gymMap.get(route.gym_id);
      if (!gym) return null;

      return {
        id: result.id,
        routeId: route.id,
        routeCode: route.code,
        routeName: route.name || route.code,
        gymId: gym.id,
        gymName: gym.name,
        gradeLabel: route.grade_range ?? null,
        points: getResultScore(result),
        flash: result.flash,
        timestamp: getResultTimestamp(result),
        relativeTime: formatRelativeTime(getResultTimestamp(result)),
      };
    })
    .filter((item): item is ParticipantAscentItem => item !== null);

  const historySessionsMap = participantResults.reduce<
    Map<
      string,
      {
        gym: Gym;
        sessionDate: string;
        lastTimestamp: string | null;
        routeResults: Map<string, Result>;
      }
    >
  >((acc, result) => {
    const route = routeMap.get(result.route_id);
    if (!route) return acc;

    const gym = gymMap.get(route.gym_id);
    if (!gym) return acc;

    const sessionDate = getResultDayKey(result);
    if (!sessionDate) return acc;

    const sessionKey = `${gym.id}:${sessionDate}`;
    const existingSession = acc.get(sessionKey);
    if (!existingSession) {
      acc.set(sessionKey, {
        gym,
        sessionDate,
        lastTimestamp: getResultTimestamp(result),
        routeResults: new Map([[route.id, result]]),
      });
      return acc;
    }

    const nextTimestamp = getResultTimestamp(result);
    if (getTimeValue(nextTimestamp) > getTimeValue(existingSession.lastTimestamp)) {
      existingSession.lastTimestamp = nextTimestamp;
    }

    const existingRouteResult = existingSession.routeResults.get(route.id);
    if (!existingRouteResult || getTimeValue(nextTimestamp) > getTimeValue(getResultTimestamp(existingRouteResult))) {
      existingSession.routeResults.set(route.id, result);
    }

    return acc;
  }, new Map());

  const historySessions = Array.from(historySessionsMap.values())
    .map<ParticipantHistorySession>((session) => ({
      id: `${session.gym.id}-${session.sessionDate}`,
      gymId: session.gym.id,
      gymName: session.gym.name,
      gymCity: session.gym.city ?? null,
      sessionDate: session.sessionDate,
      totalPoints: Array.from(session.routeResults.values()).reduce((sum, result) => sum + getResultScore(result), 0),
      routeCount: session.routeResults.size,
      monthKey: session.sessionDate.slice(0, 7),
      monthLabel: getMonthLabel(session.sessionDate),
      lastTimestamp: session.lastTimestamp,
    }))
    .sort((a, b) => {
      if (a.sessionDate !== b.sessionDate) return b.sessionDate.localeCompare(a.sessionDate);
      const timeDiff = getTimeValue(b.lastTimestamp) - getTimeValue(a.lastTimestamp);
      if (timeDiff !== 0) return timeDiff;
      return a.gymName.localeCompare(b.gymName, "de");
    });

  const visitedGymActivity = new Map<string, string | null>();
  latestResultByRoute.forEach((result, routeId) => {
    const route = routeMap.get(routeId);
    if (!route) return;
    const existing = visitedGymActivity.get(route.gym_id);
    const nextValue = getResultTimestamp(result);
    if (!existing || getTimeValue(nextValue) > getTimeValue(existing)) {
      visitedGymActivity.set(route.gym_id, nextValue);
    }
  });

  const gymRouteGroups = Array.from(visitedGymActivity.entries())
    .map(([gymId, lastActivity]) => {
      const gym = gymMap.get(gymId);
      if (!gym) return null;

      const gymRoutes = getGymRouteSet(scopedRoutes, gymId);
      const cells = gymRoutes.map<ParticipantRouteCell>((route) => {
        const result = latestResultByRoute.get(route.id);
        return {
          routeId: route.id,
          code: route.code,
          hasResult: Boolean(result),
          flash: Boolean(result?.flash),
          points: result ? getResultScore(result) : null,
        };
      });

      return {
        gym,
        totalRoutes: cells.length,
        loggedRoutes: cells.filter((cell) => cell.hasResult).length,
        lastActivity,
        totalPoints: cells.reduce((sum, cell) => sum + (cell.points ?? 0), 0),
        cells,
      };
    })
    .filter((group): group is ParticipantGymRouteGroup => group !== null)
    .sort((a, b) => {
      const timeDiff = getTimeValue(b.lastActivity) - getTimeValue(a.lastActivity);
      if (timeDiff !== 0) return timeDiff;
      return a.gym.name.localeCompare(b.gym.name, "de");
    });

  const progressSlots: ParticipantProgressSlot[] = [];
  const visited = Array.from(visitedGymActivity.entries())
    .map(([gymId, lastActivity]) => ({
      id: `done-${gymId}`,
      gym: gymMap.get(gymId) ?? null,
      status: "done" as const,
      lastActivity,
    }))
    .filter((slot) => slot.gym !== null)
    .sort((a, b) => getTimeValue(b.lastActivity) - getTimeValue(a.lastActivity))
    .slice(0, WILDCARD_TARGET);

  progressSlots.push(...visited);

  const unvisited = gyms
    .filter((gym) => !visitedGymActivity.has(gym.id))
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .slice(0, Math.max(0, WILDCARD_TARGET - progressSlots.length))
    .map<ParticipantProgressSlot>((gym) => ({
      id: `open-${gym.id}`,
      gym,
      status: "open",
      lastActivity: null,
    }));

  progressSlots.push(...unvisited);

  while (progressSlots.length < WILDCARD_TARGET) {
    progressSlots.push({
      id: `empty-${progressSlots.length}`,
      gym: null,
      status: "empty",
      lastActivity: null,
    });
  }

  let rank: number | null = null;
  let totalParticipants = 0;

  if (league && className) {
    const rows = buildRankingRows({
      profiles: allProfiles,
      results,
      routes,
      gyms,
      league,
      className,
      stageRange,
      getClassName,
    });
    totalParticipants = rows.length;
    rank = rows.find((row) => row.profileId === selectedProfile.id)?.rank ?? null;
  }

  const totalPoints = participantResults.reduce((sum, result) => sum + getResultScore(result), 0);
  const topGrade = participantResults.reduce<string | null>((currentTopGrade, result) => {
    const route = routeMap.get(result.route_id);
    const nextGrade = route?.grade_range ?? null;
    if (!nextGrade) return currentTopGrade;
    if (!currentTopGrade) return nextGrade;
    return getGradeSortValue(nextGrade) > getGradeSortValue(currentTopGrade) ? nextGrade : currentTopGrade;
  }, null);
  const sessionCount = new Set(
    participantResults.map((result) => result.created_at?.slice(0, 10) ?? null).filter((day): day is string => Boolean(day)),
  ).size;
  const routesLogged = participantResults.length;
  const flashCount = participantResults.filter((result) => result.flash).length;
  const visitedGyms = new Set(
    participantResults
      .map((result) => routeMap.get(result.route_id)?.gym_id)
      .filter((gymId): gymId is string => Boolean(gymId)),
  ).size;

  return {
    profile: selectedProfile,
    displayName: getDisplayName(selectedProfile),
    avatarUrl: selectedProfile.avatar_url ?? null,
    league,
    leagueLabel: getLeagueLabel(league),
    className,
    homeGym,
    homeGymLabel: homeGym ? `${homeGym.name}${homeGym.city ? ` (${homeGym.city})` : ""}` : "Noch keine Auswahl",
    rank,
    totalParticipants,
    points: totalPoints,
    formattedPoints: formatPoints(totalPoints),
    topGrade,
    sessionCount,
    routesLogged,
    flashCount,
    flashRate: routesLogged > 0 ? (flashCount / routesLogged) * 100 : 0,
    averagePoints: routesLogged > 0 ? totalPoints / routesLogged : 0,
    visitedGyms,
    gymProgressSlots: progressSlots,
    gymRouteGroups,
    recentAscents: historyItems.slice(0, 5),
    historyItems,
    historySessions,
  };
};
