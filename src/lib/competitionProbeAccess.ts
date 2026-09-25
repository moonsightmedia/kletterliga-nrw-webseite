// This is only a UI preview allowlist. The server still controls real result submissions.
export const COMPETITION_PROBE_PROFILE_ID = "2e0f2267-a72c-4ece-8ca5-a3ce94520ab8";

export function canUseCompetitionProbe(profileId: string | null | undefined, localDevelopment: boolean): boolean {
  return Boolean(profileId) && (localDevelopment || profileId === COMPETITION_PROBE_PROFILE_ID);
}

export function shouldUseCompetitionProbe(
  profileId: string | null | undefined,
  localDevelopment: boolean,
  phase: "draft" | "open" | "closed" | null | undefined,
  requested: boolean,
): boolean {
  return (profileId === COMPETITION_PROBE_PROFILE_ID && phase === "draft") ||
    (requested && canUseCompetitionProbe(profileId, localDevelopment));
}
