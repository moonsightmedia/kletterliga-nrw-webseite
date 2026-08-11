const appApiMocks = vi.hoisted(() => ({
  listGymAdminsByProfile: vi.fn(),
  listRoutesByGym: vi.fn(),
  getGymAdminResults: vi.fn(),
  getGymRouteHighlights: vi.fn(),
}));

vi.mock("@/services/appApi", () => ({
  listGymAdminsByProfile: appApiMocks.listGymAdminsByProfile,
  listRoutesByGym: appApiMocks.listRoutesByGym,
  getGymAdminResults: appApiMocks.getGymAdminResults,
  getGymRouteHighlights: appApiMocks.getGymRouteHighlights,
}));

import { fetchGymAdminOverviewData } from "@/app/pages/admin/gymAdminQueries";
import type { GymAdminResultsPayload, Route } from "@/services/appTypes";

const route: Route = {
  id: "route-1",
  gym_id: "gym-1",
  discipline: "toprope",
  code: "T1",
  name: "Testkante",
  setter: null,
  color: "blau",
  grade_range: null,
  active: true,
};

const resultsPayload: GymAdminResultsPayload = {
  gym_id: "gym-1",
  result_count: 1,
  participant_count: 1,
  flash_count: 1,
  average_score: 6,
  route_stats: [
    { route_id: "route-1", result_count: 1, flash_count: 1, average_score: 6 },
  ],
  daily_results: [],
  results: [
    {
      route_id: "route-1",
      points: 5,
      flash: true,
      status: "sent",
      rating: 4,
      submitted_on: "2026-08-10",
      edited: false,
    },
  ],
  next_cursor: null,
};

describe("fetchGymAdminOverviewData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails before loading hall data when the assignment request fails", async () => {
    appApiMocks.listGymAdminsByProfile.mockResolvedValue({
      data: null,
      error: { message: "Zuordnung nicht erreichbar" },
    });

    await expect(fetchGymAdminOverviewData("gym-admin-1")).rejects.toThrow(
      "Zuordnung nicht erreichbar",
    );
    expect(appApiMocks.listRoutesByGym).not.toHaveBeenCalled();
    expect(appApiMocks.getGymAdminResults).not.toHaveBeenCalled();
    expect(appApiMocks.getGymRouteHighlights).not.toHaveBeenCalled();
  });

  it("returns a stable empty overview when no hall is assigned", async () => {
    appApiMocks.listGymAdminsByProfile.mockResolvedValue({ data: [], error: null });

    await expect(fetchGymAdminOverviewData("gym-admin-1")).resolves.toEqual({
      gymId: null,
      routes: [],
      results: null,
      highlights: null,
      highlightsError: null,
    });
    expect(appApiMocks.listRoutesByGym).not.toHaveBeenCalled();
    expect(appApiMocks.getGymAdminResults).not.toHaveBeenCalled();
    expect(appApiMocks.getGymRouteHighlights).not.toHaveBeenCalled();
  });

  it("loads routes and anonymous results only for the assigned hall", async () => {
    appApiMocks.listGymAdminsByProfile.mockResolvedValue({
      data: [{ gym_id: "gym-1" }],
      error: null,
    });
    appApiMocks.listRoutesByGym.mockResolvedValue({ data: [route], error: null });
    appApiMocks.getGymAdminResults.mockResolvedValue({ data: resultsPayload, error: null });
    appApiMocks.getGymRouteHighlights.mockResolvedValue({
      data: {
        gym_id: "gym-1",
        rating_count: 1,
        average_rating: 4,
        route_stats: [
          { route_id: "route-1", rating_count: 1, average_rating: 4, entry_count: 1 },
        ],
      },
      error: null,
    });

    const result = await fetchGymAdminOverviewData("gym-admin-1");

    expect(appApiMocks.listRoutesByGym).toHaveBeenCalledWith("gym-1");
    expect(appApiMocks.getGymAdminResults).toHaveBeenCalledWith("gym-1");
    expect(appApiMocks.getGymRouteHighlights).toHaveBeenCalledWith("gym-1");
    expect(result.gymId).toBe("gym-1");
    expect(result.routes).toEqual([route]);
    expect(result.results).toEqual(resultsPayload);
    expect(result.highlights?.average_rating).toBe(4);
  });

  it("keeps overview results usable when route highlights reject", async () => {
    appApiMocks.listGymAdminsByProfile.mockResolvedValue({
      data: [{ gym_id: "gym-1" }],
      error: null,
    });
    appApiMocks.listRoutesByGym.mockResolvedValue({ data: [route], error: null });
    appApiMocks.getGymAdminResults.mockResolvedValue({ data: resultsPayload, error: null });
    appApiMocks.getGymRouteHighlights.mockRejectedValue(new Error("highlight network error"));

    await expect(fetchGymAdminOverviewData("gym-admin-1")).resolves.toEqual({
      gymId: "gym-1",
      routes: [route],
      results: resultsPayload,
      highlights: null,
      highlightsError: "Routenbewertungen konnten nicht geladen werden.",
    });
  });
});
