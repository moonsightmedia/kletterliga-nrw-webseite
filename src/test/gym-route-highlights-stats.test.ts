import { describe, expect, it } from "vitest";
import { buildGymRouteHighlights } from "../../supabase/functions/get-gym-route-highlights/stats";

describe("buildGymRouteHighlights", () => {
  it("aggregates only active routes and active participant results without exposing raw rows", () => {
    const stats = buildGymRouteHighlights({
      gymId: "gym-1",
      participantIds: ["participant-1", "participant-2"],
      routes: [
        { id: "route-1", gym_id: "gym-1", active: true },
        { id: "route-2", gym_id: "gym-1", active: true },
        { id: "route-inactive", gym_id: "gym-1", active: false },
        { id: "route-other-gym", gym_id: "gym-2", active: true },
      ],
      results: [
        { profile_id: "participant-1", route_id: "route-1", rating: 5 },
        { profile_id: "participant-2", route_id: "route-1", rating: 3 },
        { profile_id: "participant-1", route_id: "route-2", rating: null },
        { profile_id: "admin-1", route_id: "route-1", rating: 1 },
        { profile_id: "participant-1", route_id: "route-inactive", rating: 1 },
        { profile_id: "participant-1", route_id: "route-other-gym", rating: 1 },
      ],
    });

    expect(stats).toEqual({
      gym_id: "gym-1",
      rating_count: 2,
      average_rating: 4,
      route_stats: [
        {
          route_id: "route-1",
          rating_count: 2,
          average_rating: 4,
          entry_count: 2,
        },
        {
          route_id: "route-2",
          rating_count: 0,
          average_rating: null,
          entry_count: 1,
        },
      ],
    });
    expect(JSON.stringify(stats)).not.toContain("profile_id");
  });

  it("returns a stable empty aggregate when the gym has no results", () => {
    expect(
      buildGymRouteHighlights({
        gymId: "gym-1",
        participantIds: [],
        routes: [{ id: "route-1", gym_id: "gym-1", active: true }],
        results: [],
      }),
    ).toEqual({
      gym_id: "gym-1",
      rating_count: 0,
      average_rating: null,
      route_stats: [
        {
          route_id: "route-1",
          rating_count: 0,
          average_rating: null,
          entry_count: 0,
        },
      ],
    });
  });
});
