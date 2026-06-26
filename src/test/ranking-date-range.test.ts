import { describe, expect, it } from "vitest";
import {
  buildSeasonRangeFromQualification,
  getDateBoundaryTimeRanking,
  getStageRange,
} from "@/app/pages/participant/participantData";

describe("getStageRange", () => {
  const stages = [{ key: "2026-05", label: "Mai", start: "2026-05-01", end: "2026-05-31" }];

  it("uses the same end boundary as getDateBoundaryTimeRanking", () => {
    const range = getStageRange("2026-05", stages);
    expect(range).not.toBeNull();

    const endMs = getDateBoundaryTimeRanking("2026-05-31", "end");
    expect(range?.end.getTime()).toBe(endMs);
  });

  it("includes a result at the last millisecond of the stage end day", () => {
    const range = getStageRange("2026-05", stages);
    expect(range).not.toBeNull();

    const endMs = getDateBoundaryTimeRanking("2026-05-31", "end");
    const createdAt = new Date(endMs ?? 0);
    expect(createdAt >= range!.start && createdAt <= range!.end).toBe(true);
  });
});

describe("buildSeasonRangeFromQualification", () => {
  it("returns null when qualification dates are missing", () => {
    expect(buildSeasonRangeFromQualification(null, "2026-09-13")).toBeNull();
    expect(buildSeasonRangeFromQualification("2026-05-01", null)).toBeNull();
  });

  it("builds an inclusive qualification range", () => {
    const range = buildSeasonRangeFromQualification("2026-05-01", "2026-09-13");
    expect(range).not.toBeNull();
    expect(range?.start.getTime()).toBe(getDateBoundaryTimeRanking("2026-05-01", "start"));
    expect(range?.end.getTime()).toBe(getDateBoundaryTimeRanking("2026-09-13", "end"));
  });
});
