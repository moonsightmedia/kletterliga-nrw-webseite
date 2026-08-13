import {
  buildGymRouteResultSummaries,
  filterAndSortGymRouteSummaries,
  filterAndSortLoadedGymResults,
} from "@/app/pages/admin/gymResultsView";
import type { GymAdminResultItem, Route } from "@/services/appTypes";

const routes: Route[] = [
  {
    id: "route-10",
    gym_id: "gym-1",
    discipline: "lead",
    code: "T10",
    name: "Zehn",
    setter: null,
    color: null,
    grade_range: null,
    active: true,
  },
  {
    id: "route-2",
    gym_id: "gym-1",
    discipline: "toprope",
    code: "T2",
    name: "Zwei",
    setter: null,
    color: null,
    grade_range: null,
    active: true,
  },
  {
    id: "route-1",
    gym_id: "gym-1",
    discipline: "toprope",
    code: "T1",
    name: "Eins",
    setter: null,
    color: null,
    grade_range: null,
    active: false,
  },
];

describe("gym results view helpers", () => {
  it("builds a complete route overview and naturally sorts route codes", () => {
    const summaries = buildGymRouteResultSummaries({
      routes,
      resultStats: [
        { route_id: "route-10", result_count: 5, flash_count: 2, average_score: 7.4 },
        { route_id: "route-2", result_count: 2, flash_count: 1, average_score: 8 },
        { route_id: "foreign-route", result_count: 99, flash_count: 99, average_score: 10 },
      ],
      ratingStats: [
        { route_id: "route-2", rating_count: 3, average_rating: 4.5, entry_count: 2 },
        { route_id: "foreign-route", rating_count: 99, average_rating: 5, entry_count: 99 },
      ],
    });

    const sorted = filterAndSortGymRouteSummaries({
      summaries,
      search: "",
      discipline: "all",
      ratingFilter: "all",
      sortMode: "route",
    });

    expect(sorted.map((item) => item.route.code)).toEqual(["T1", "T2", "T10"]);
    expect(sorted.find((item) => item.route.id === "route-1")).toMatchObject({
      resultCount: 0,
      averageScore: null,
      ratingAvailable: false,
      ratingCount: 0,
      averageRating: null,
    });
    expect(sorted).toHaveLength(3);
  });

  it("filters all route summaries and keeps missing ratings last when sorting", () => {
    const summaries = buildGymRouteResultSummaries({
      routes,
      resultStats: [
        { route_id: "route-10", result_count: 5, flash_count: 2, average_score: 7.4 },
        { route_id: "route-2", result_count: 2, flash_count: 1, average_score: 8 },
      ],
      ratingStats: [
        { route_id: "route-10", rating_count: 1, average_rating: 3, entry_count: 5 },
        { route_id: "route-2", rating_count: 3, average_rating: 4.5, entry_count: 2 },
      ],
    });

    const ratedToprope = filterAndSortGymRouteSummaries({
      summaries,
      search: "zwei",
      discipline: "toprope",
      ratingFilter: "rated",
      sortMode: "rating",
    });
    expect(ratedToprope.map((item) => item.route.id)).toEqual(["route-2"]);

    const ratingSorted = filterAndSortGymRouteSummaries({
      summaries,
      search: "",
      discipline: "all",
      ratingFilter: "all",
      sortMode: "rating",
    });
    expect(ratingSorted.map((item) => item.route.id)).toEqual(["route-2", "route-10", "route-1"]);

    const unrated = filterAndSortGymRouteSummaries({
      summaries,
      search: "",
      discipline: "all",
      ratingFilter: "unrated",
      sortMode: "route",
    });
    expect(unrated).toEqual([]);
  });

  it("normalizes empty aggregate pairs and does not present inactive routes as unrated", () => {
    const [summary] = buildGymRouteResultSummaries({
      routes: [routes[1]],
      resultStats: [{ route_id: "route-2", result_count: 0, flash_count: 2, average_score: 8 }],
      ratingStats: [
        { route_id: "route-2", rating_count: 0, average_rating: 5, entry_count: 0 },
      ],
    });

    expect(summary).toMatchObject({
      resultCount: 0,
      averageScore: null,
      ratingAvailable: true,
      ratingCount: 0,
      averageRating: null,
    });
  });

  it("filters and sorts only the supplied anonymous result page", () => {
    const results: GymAdminResultItem[] = [
      {
        route_id: "route-10",
        points: 3,
        flash: false,
        status: "not_climbed",
        rating: null,
        submitted_on: "2026-08-12",
        edited: false,
      },
      {
        route_id: "route-2",
        points: 7,
        flash: true,
        status: "climbed",
        rating: 4,
        submitted_on: "2026-08-10",
        edited: false,
      },
      {
        route_id: "route-1",
        points: 5,
        flash: false,
        status: "climbed",
        rating: 5,
        submitted_on: "2026-08-11",
        edited: true,
      },
      {
        route_id: "route-2",
        points: 0,
        flash: false,
        status: "sent",
        rating: null,
        submitted_on: "2026-08-09",
        edited: false,
      },
    ];
    const routeMap = new Map(routes.map((route) => [route.id, route]));

    const climbedByRoute = filterAndSortLoadedGymResults({
      results,
      routeMap,
      search: "",
      routeId: "all",
      discipline: "toprope",
      statusFilter: "climbed",
      ratingFilter: "rated",
      sortMode: "route",
    });

    expect(climbedByRoute.map((result) => result.route_id)).toEqual(["route-1", "route-2"]);

    const notClimbed = filterAndSortLoadedGymResults({
      results,
      routeMap,
      search: "",
      routeId: "all",
      discipline: "all",
      statusFilter: "not_climbed",
      ratingFilter: "all",
      sortMode: "newest",
    });
    expect(notClimbed.map((result) => `${result.route_id}:${result.points}`)).toEqual([
      "route-10:3",
      "route-2:0",
    ]);

    const byPoints = filterAndSortLoadedGymResults({
      results,
      routeMap,
      search: "",
      routeId: "all",
      discipline: "all",
      statusFilter: "all",
      ratingFilter: "all",
      sortMode: "points",
    });
    expect(byPoints.map((result) => result.points)).toEqual([7, 5, 3, 0]);

    const byRating = filterAndSortLoadedGymResults({
      results,
      routeMap,
      search: "",
      routeId: "all",
      discipline: "all",
      statusFilter: "all",
      ratingFilter: "all",
      sortMode: "rating",
    });
    expect(byRating.map((result) => result.rating)).toEqual([5, 4, null, null]);

    const oldestFirst = filterAndSortLoadedGymResults({
      results,
      routeMap,
      search: "",
      routeId: "all",
      discipline: "all",
      statusFilter: "all",
      ratingFilter: "all",
      sortMode: "oldest",
    });
    expect(oldestFirst.map((result) => result.submitted_on)).toEqual([
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);

    const sameDayApiOrder = [
      { ...results[0], route_id: "route-10", submitted_on: "2026-08-12" },
      { ...results[1], route_id: "route-2", submitted_on: "2026-08-12" },
    ];
    const sameDayNewest = filterAndSortLoadedGymResults({
      results: sameDayApiOrder,
      routeMap,
      search: "",
      routeId: "all",
      discipline: "all",
      statusFilter: "all",
      ratingFilter: "all",
      sortMode: "newest",
    });
    expect(sameDayNewest.map((result) => result.route_id)).toEqual(["route-10", "route-2"]);
  });
});
