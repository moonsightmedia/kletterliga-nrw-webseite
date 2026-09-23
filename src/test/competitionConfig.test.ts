import { describe, expect, it } from "vitest";
import { exactCompetitionEmailPattern, validateCompetitionConfig, validateCompetitionRouteDraft } from "@/lib/competitionConfig";
import type { CompetitionConfig } from "@/services/competitionDay";

const config = (): CompetitionConfig => ({
  routes: Array.from({ length: 12 }, (_, i) => ({ number: i + 1, name: `Route ${i + 1}`, grade: "", color: "" })),
  assignments: [{ league: "lead", class_label: "Ü15 männlich", route_numbers: [1, 3, 5, 7, 12] }],
  zone_points: Array.from({ length: 11 }, (_, i) => i), flash_bonus: 1,
});
describe("competition configuration", () => {
  it("treats underscores and percent in email lookup literally", () => expect(exactCompetitionEmailPattern(" staff_one%two@example.invalid ")).toBe("staff\\_one\\%two@example.invalid"));
  it("accepts five physical routes from a pool", () => expect(validateCompetitionConfig(config(), config().assignments)).toBeNull());
  it("allows a route-only draft without invented scoring or class assignments", () => {
    expect(validateCompetitionRouteDraft(config().routes)).toBeNull();
    expect(validateCompetitionRouteDraft(config().routes.slice(0, 4))).toContain("5 und 30");
    expect(validateCompetitionRouteDraft([...config().routes, config().routes[0]])).toContain("eindeutig");
  });
  it("allows routes shared by multiple classes", () => {
    const value = config(); value.assignments.push({ ...value.assignments[0], class_label: "U15 weiblich" });
    expect(validateCompetitionConfig(value, value.assignments)).toBeNull();
  });
  it("rejects incomplete scoring rather than inventing it", () => {
    expect(validateCompetitionConfig({ ...config(), zone_points: Array(11).fill(0) }, [])).toContain("Wertung");
  });
  it("rejects unknown, duplicate and missing routes", () => {
    for (const route_numbers of [[1, 2, 3], [1, 2, 2, 3, 4], [1, 2, 3, 4, 99]]) {
      const value = config(); value.assignments[0].route_numbers = route_numbers;
      expect(validateCompetitionConfig(value, [])).toContain("fünf");
    }
  });
  it("requires all eligible registered classes", () => expect(validateCompetitionConfig(config(), [{ league: "toprope", class_label: "U15", route_numbers: [] }])).toContain("Nicht alle"));
  it("rejects nonfinite, falling or negative scoring", () => {
    for (const points of [-1, NaN, Infinity, 0]) {
      const value = config(); value.zone_points[5] = points;
      expect(validateCompetitionConfig(value, [])).not.toBeNull();
    }
  });
});
