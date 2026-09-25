import { describe, expect, it } from "vitest";
import { canUseCompetitionProbe, COMPETITION_PROBE_PROFILE_ID, shouldUseCompetitionProbe } from "@/lib/competitionProbeAccess";

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

  it("opens the draft probe automatically only for the allowlisted account", () => {
    expect(shouldUseCompetitionProbe(COMPETITION_PROBE_PROFILE_ID, false, "draft", false)).toBe(true);
    expect(shouldUseCompetitionProbe("another-participant", false, "draft", true)).toBe(false);
    expect(shouldUseCompetitionProbe(null, false, "draft", true)).toBe(false);
    expect(shouldUseCompetitionProbe(COMPETITION_PROBE_PROFILE_ID, false, "open", false)).toBe(false);
    expect(shouldUseCompetitionProbe(COMPETITION_PROBE_PROFILE_ID, false, "closed", false)).toBe(false);
    expect(shouldUseCompetitionProbe(COMPETITION_PROBE_PROFILE_ID, false, "open", true)).toBe(true);
  });
});
