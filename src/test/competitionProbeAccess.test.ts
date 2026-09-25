import { describe, expect, it } from "vitest";
import { canUseCompetitionProbe, COMPETITION_PROBE_PROFILE_ID } from "@/lib/competitionProbeAccess";

describe("competition probe account gate", () => {
  it("permits only Janosch's profile in a production build", () => {
    expect(canUseCompetitionProbe(COMPETITION_PROBE_PROFILE_ID, false)).toBe(true);
    expect(canUseCompetitionProbe("another-participant", false)).toBe(false);
    expect(canUseCompetitionProbe(null, false)).toBe(false);
  });

  it("retains local development testing for signed-in profiles", () => {
    expect(canUseCompetitionProbe("another-participant", true)).toBe(true);
    expect(canUseCompetitionProbe(null, true)).toBe(false);
  });
});
