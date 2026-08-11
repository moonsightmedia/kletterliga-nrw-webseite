export type RouteStatsInput = {
  id: string;
  gym_id: string;
  active: boolean | null;
};

export type ResultStatsInput = {
  profile_id: string;
  route_id: string;
  rating: number | null;
};

export type GymRouteCommunityStats = {
  route_id: string;
  rating_count: number;
  average_rating: number | null;
  entry_count: number;
};

export type GymRouteHighlights = {
  gym_id: string;
  rating_count: number;
  average_rating: number | null;
  route_stats: GymRouteCommunityStats[];
};

type MutableRouteStats = {
  ratingTotal: number;
  ratingCount: number;
  entryCount: number;
};

export const buildGymRouteHighlights = ({
  gymId,
  participantIds,
  routes,
  results,
}: {
  gymId: string;
  participantIds: Iterable<string>;
  routes: RouteStatsInput[];
  results: ResultStatsInput[];
}): GymRouteHighlights => {
  const participantIdSet = new Set(participantIds);
  const activeRouteIds = new Set(
    routes
      .filter((route) => route.gym_id === gymId && route.active !== false)
      .map((route) => route.id),
  );
  const totalsByRoute = new Map<string, MutableRouteStats>();

  activeRouteIds.forEach((routeId) => {
    totalsByRoute.set(routeId, { ratingTotal: 0, ratingCount: 0, entryCount: 0 });
  });

  results.forEach((result) => {
    if (!participantIdSet.has(result.profile_id) || !activeRouteIds.has(result.route_id)) return;

    const totals = totalsByRoute.get(result.route_id);
    if (!totals) return;

    totals.entryCount += 1;
    if (typeof result.rating === "number" && Number.isFinite(result.rating)) {
      totals.ratingTotal += result.rating;
      totals.ratingCount += 1;
    }
  });

  let ratingTotal = 0;
  let ratingCount = 0;
  const routeStats = Array.from(totalsByRoute.entries())
    .map<GymRouteCommunityStats>(([routeId, totals]) => {
      ratingTotal += totals.ratingTotal;
      ratingCount += totals.ratingCount;

      return {
        route_id: routeId,
        rating_count: totals.ratingCount,
        average_rating:
          totals.ratingCount > 0 ? totals.ratingTotal / totals.ratingCount : null,
        entry_count: totals.entryCount,
      };
    })
    .sort((a, b) => a.route_id.localeCompare(b.route_id));

  return {
    gym_id: gymId,
    rating_count: ratingCount,
    average_rating: ratingCount > 0 ? ratingTotal / ratingCount : null,
    route_stats: routeStats,
  };
};
