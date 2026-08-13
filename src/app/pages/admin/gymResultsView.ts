import type {
  GymAdminResultItem,
  GymAdminRouteResultStats,
  GymRouteCommunityStats,
  Route,
} from "@/services/appTypes";

export type GymRouteSortMode = "route" | "results" | "rating" | "score";
export type GymResultSortMode = "newest" | "oldest" | "route" | "points" | "rating";
export type GymResultStatusFilter = "all" | "climbed" | "not_climbed";
export type GymRatingFilter = "all" | "rated" | "unrated";
export type GymDisciplineFilter = "all" | "toprope" | "lead";

export type GymRouteResultSummary = {
  route: Route;
  resultCount: number;
  flashCount: number;
  averageScore: number | null;
  ratingAvailable: boolean;
  ratingCount: number;
  averageRating: number | null;
};

const routeCollator = new Intl.Collator("de-DE", {
  numeric: true,
  sensitivity: "base",
});

const compareNullableDescending = (left: number | null, right: number | null) => {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
};

export const compareGymRoutes = (left: Route, right: Route) => {
  const codeComparison = routeCollator.compare(left.code, right.code);
  if (codeComparison !== 0) return codeComparison;

  const nameComparison = routeCollator.compare(left.name ?? "", right.name ?? "");
  if (nameComparison !== 0) return nameComparison;
  return left.id.localeCompare(right.id);
};

export const isGymResultClimbed = (result: GymAdminResultItem) => {
  if (result.status === "not_climbed") return false;
  if (result.status === "climbed") return true;
  return result.points > 0;
};

export const buildGymRouteResultSummaries = ({
  routes,
  resultStats,
  ratingStats,
}: {
  routes: Route[];
  resultStats: GymAdminRouteResultStats[];
  ratingStats: GymRouteCommunityStats[];
}): GymRouteResultSummary[] => {
  const resultStatsByRoute = new Map(resultStats.map((item) => [item.route_id, item]));
  const ratingStatsByRoute = new Map(ratingStats.map((item) => [item.route_id, item]));

  return routes.map((route) => {
    const result = resultStatsByRoute.get(route.id);
    const rating = ratingStatsByRoute.get(route.id);
    const resultCount = Math.max(0, result?.result_count ?? 0);
    const ratingCount = Math.max(0, rating?.rating_count ?? 0);

    return {
      route,
      resultCount,
      flashCount: Math.max(0, result?.flash_count ?? 0),
      averageScore: resultCount > 0 ? (result?.average_score ?? null) : null,
      ratingAvailable: route.active,
      ratingCount: route.active ? ratingCount : 0,
      averageRating:
        route.active && ratingCount > 0 && Number.isFinite(rating?.average_rating)
          ? (rating?.average_rating ?? null)
          : null,
    };
  });
};

export const filterAndSortGymRouteSummaries = ({
  summaries,
  search,
  discipline,
  ratingFilter,
  sortMode,
}: {
  summaries: GymRouteResultSummary[];
  search: string;
  discipline: GymDisciplineFilter;
  ratingFilter: GymRatingFilter;
  sortMode: GymRouteSortMode;
}) => {
  const query = search.trim().toLocaleLowerCase("de-DE");
  const filtered = summaries.filter((item) => {
    const routeLabel = `${item.route.code} ${item.route.name ?? ""}`.toLocaleLowerCase("de-DE");
    const matchesSearch = !query || routeLabel.includes(query);
    const matchesDiscipline = discipline === "all" || item.route.discipline === discipline;
    const hasRating = item.ratingAvailable && item.ratingCount > 0 && item.averageRating !== null;
    const matchesRating =
      ratingFilter === "all" ||
      (ratingFilter === "rated" && hasRating) ||
      (ratingFilter === "unrated" && item.ratingAvailable && !hasRating);
    return matchesSearch && matchesDiscipline && matchesRating;
  });

  return filtered.sort((left, right) => {
    if (sortMode === "results") {
      const resultDifference = right.resultCount - left.resultCount;
      return resultDifference || compareGymRoutes(left.route, right.route);
    }
    if (sortMode === "rating") {
      const ratingDifference = compareNullableDescending(left.averageRating, right.averageRating);
      return ratingDifference || compareGymRoutes(left.route, right.route);
    }
    if (sortMode === "score") {
      const scoreDifference = compareNullableDescending(left.averageScore, right.averageScore);
      return scoreDifference || compareGymRoutes(left.route, right.route);
    }
    return compareGymRoutes(left.route, right.route);
  });
};

export const filterAndSortLoadedGymResults = ({
  results,
  routeMap,
  search,
  routeId,
  discipline,
  statusFilter,
  ratingFilter,
  sortMode,
}: {
  results: GymAdminResultItem[];
  routeMap: Map<string, Route>;
  search: string;
  routeId: string;
  discipline: GymDisciplineFilter;
  statusFilter: GymResultStatusFilter;
  ratingFilter: GymRatingFilter;
  sortMode: GymResultSortMode;
}) => {
  const query = search.trim().toLocaleLowerCase("de-DE");
  const filtered = results.filter((result) => {
    const route = routeMap.get(result.route_id);
    const routeLabel = `${route?.code ?? ""} ${route?.name ?? ""}`.toLocaleLowerCase("de-DE");
    const matchesSearch = !query || routeLabel.includes(query);
    const matchesRoute = routeId === "all" || result.route_id === routeId;
    const matchesDiscipline = discipline === "all" || route?.discipline === discipline;
    const climbed = isGymResultClimbed(result);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "climbed" && climbed) ||
      (statusFilter === "not_climbed" && !climbed);
    const hasRating = result.rating !== null;
    const matchesRating =
      ratingFilter === "all" ||
      (ratingFilter === "rated" && hasRating) ||
      (ratingFilter === "unrated" && !hasRating);
    return matchesSearch && matchesRoute && matchesDiscipline && matchesStatus && matchesRating;
  });

  return filtered.sort((left, right) => {
    const leftRoute = routeMap.get(left.route_id);
    const rightRoute = routeMap.get(right.route_id);
    const dateDifference = right.submitted_on.localeCompare(left.submitted_on);

    if (sortMode === "oldest") {
      return left.submitted_on.localeCompare(right.submitted_on);
    }
    if (sortMode === "route") {
      const routeDifference =
        leftRoute && rightRoute
          ? compareGymRoutes(leftRoute, rightRoute)
          : left.route_id.localeCompare(right.route_id);
      return routeDifference || dateDifference;
    }
    if (sortMode === "points") {
      return right.points - left.points || dateDifference;
    }
    if (sortMode === "rating") {
      return compareNullableDescending(left.rating, right.rating) || dateDifference;
    }
    return dateDifference;
  });
};
