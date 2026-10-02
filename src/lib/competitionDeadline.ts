export function competitionDeadlineReached(
  deadline: string | null | undefined,
  now = Date.now(),
) {
  const timestamp = deadline ? Date.parse(deadline) : NaN;
  return Number.isFinite(timestamp) && now >= timestamp;
}

export function formatCompetitionDeadline(deadline: string) {
  return new Date(deadline).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
