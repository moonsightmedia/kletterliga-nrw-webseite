import { describe, expect, it } from "vitest";
import { competitionDeadlineReached } from "@/lib/competitionDeadline";
describe("semifinal cutoff in Europe/Berlin", () => {
  const cutoff = "2026-10-03T16:00:00+02:00";
  it("keeps entry open immediately before the cutoff and closes exactly at 16:00", () => {
    expect(
      competitionDeadlineReached(
        cutoff,
        Date.parse("2026-10-03T13:59:59.999Z"),
      ),
    ).toBe(false);
    expect(
      competitionDeadlineReached(
        cutoff,
        Date.parse("2026-10-03T14:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      competitionDeadlineReached(cutoff, Date.parse("2026-10-03T14:00:01Z")),
    ).toBe(true);
  });
  it("does not invent a cutoff for an unconfigured season", () => {
    expect(competitionDeadlineReached(null)).toBe(false);
    expect(competitionDeadlineReached("bad-date")).toBe(false);
  });
});
