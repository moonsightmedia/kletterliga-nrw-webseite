import { describe, expect, it } from "vitest";
import { buildRankingRows, buildSeasonRangeFromQualification } from "@/app/pages/participant/participantData";
import type { Gym, Profile, Result, Route } from "@/services/appTypes";

describe("qualification certificate placement", () => {
  it("gives equal scores the same place and skips the next place", () => {
    const profiles = ["A", "B", "C"].map((name) => ({
      id: name, first_name: name, last_name: "Test", role: "participant",
      participation_activated_at: "2026-05-01T10:00:00Z", league: "lead",
      birth_date: "2012-01-01", gender: "m",
    })) as Profile[];
    const route = { id: "route-1", discipline: "lead", gym_id: "gym-1" } as Route;
    const results = [10, 10, 5].map((points, index) => ({
      id: `result-${index}`, profile_id: profiles[index].id, route_id: route.id,
      points, flash: false, created_at: "2026-06-01T12:00:00Z",
    })) as Result[];
    const rows = buildRankingRows({
      profiles, results, routes: [route], gyms: [{ id: "gym-1" } as Gym], league: "lead", className: "U15-m",
      seasonRange: buildSeasonRangeFromQualification("2026-05-01", "2026-09-13"),
      getClassName: () => "U15-m",
    });
    expect(rows.map((row) => [row.profileId, row.rank])).toEqual([["A", 1], ["B", 1], ["C", 3]]);
  });
});
