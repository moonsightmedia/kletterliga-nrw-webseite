import { getQualificationPhase, formatCompetitionDate, formatRegistrationDeadline } from "@/services/qualificationPhase";

describe("Berlin qualification window", () => {
  const phase = (at: string) => getQualificationPhase("2026-05-01", "2026-09-13", new Date(at));
  it("includes the entire final day in Berlin", () => {
    expect(phase("2026-09-13T21:59:59.999Z")).toBe("active");
    expect(phase("2026-09-13T22:00:00.000Z")).toBe("closed");
  });
  it("includes the first Berlin midnight", () => {
    expect(phase("2026-04-30T21:59:59.999Z")).toBe("upcoming");
    expect(phase("2026-04-30T22:00:00.000Z")).toBe("active");
  });
  it("handles winter time and DST calendar changes", () => {
    expect(getQualificationPhase("2026-10-25", "2026-10-25", new Date("2026-10-25T22:59:59Z"))).toBe("active");
    expect(getQualificationPhase("2026-10-25", "2026-10-25", new Date("2026-10-25T23:00:00Z"))).toBe("closed");
  });
  it.each([
    [null, "2026-09-13"], ["2026-05-01", null], ["2026-09-14", "2026-09-13"],
    ["invalid", "2026-09-13"], ["2026-02-30", "2026-09-13"],
  ])("fails closed for unusable settings %s / %s", (start, end) => {
    expect(getQualificationPhase(start, end)).toBe("unavailable");
  });
  it("formats date-only values without timezone drift", () => {
    expect(formatCompetitionDate("2026-10-03")).toBe("03.10.2026");
    expect(formatCompetitionDate(null)).toBe("Termin folgt");
  });
  it("presents the exclusive registration boundary as the final permitted minute", () => {
    expect(formatRegistrationDeadline("2026-09-27T22:00:00Z", null)).toBe("27.09.2026, 23:59 Uhr");
    expect(formatRegistrationDeadline("2026-10-25T23:00:00Z", null)).toBe("25.10.2026, 23:59 Uhr");
    expect(formatRegistrationDeadline(null, "2026-09-27")).toBe("27.09.2026, 23:59 Uhr");
    expect(formatRegistrationDeadline("invalid", "invalid")).toBe("Termin folgt");
  });
});
