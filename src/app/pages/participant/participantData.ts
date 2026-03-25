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
  points: number;
  flash: boolean;
  timestamp: string | null;
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
  routesLogged: number;
  flashCount: number;
  flashRate: number;
  averagePoints: number;
  visitedGyms: number;
  gymProgressSlots: ParticipantProgressSlot[];
  gymRouteGroups: ParticipantGymRouteGroup[];
  recentAscents: ParticipantAscentItem[];
  historyItems: ParticipantAscentItem[];
};

const getResultTimestamp = (result: Result) => result.updated_at || result.created_at || null;

const getTimeValue = (value: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getResultScore = (result: Result) => (result.points ?? 0) + (result.flash ? 1 : 0);

const sortByCode = (a: Route, b: Route) => {
  const numA = Number(a.code.replace(/\D/g, "")) || 0;
  const numB = Number(b.code.replace(/\D/g, "")) || 0;
  if (numA !== numB) return numA - numB;
  return a.code.localeCompare(b.code);
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
        points: getResultScore(result),
        flash: result.flash,
        timestamp: getResultTimestamp(result),
      };
    })
    .filter((item): item is ParticipantAscentItem => item !== null);

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
    routesLogged,
    flashCount,
    flashRate: routesLogged > 0 ? (flashCount / routesLogged) * 100 : 0,
    averagePoints: routesLogged > 0 ? totalPoints / routesLogged : 0,
    visitedGyms,
    gymProgressSlots: progressSlots,
    gymRouteGroups,
    recentAscents: historyItems.slice(0, 5),
    historyItems,
  };
};
