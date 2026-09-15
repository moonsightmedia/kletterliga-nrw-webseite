export type QualificationPhase = "unavailable" | "upcoming" | "active" | "closed";

const berlinDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
});

function isDateOnly(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Presentation only. Database guards independently enforce the same Berlin calendar window. */
export function getQualificationPhase(
  start: string | null | undefined,
  end: string | null | undefined,
  now = new Date(),
): QualificationPhase {
  if (!isDateOnly(start) || !isDateOnly(end) || end < start || Number.isNaN(now.getTime())) {
    return "unavailable";
  }
  const parts = berlinDate.formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === name)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  if (today < start) return "upcoming";
  return today > end ? "closed" : "active";
}

export function formatCompetitionDate(value: string | null | undefined): string {
  if (!isDateOnly(value)) return "Termin folgt";
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/** The RPC returns the exclusive midnight boundary; present the last permitted minute. */
export function formatRegistrationDeadline(exclusive: string | null | undefined, fallback: string | null | undefined): string {
  const timestamp = exclusive ? Date.parse(exclusive) : NaN;
  if (!Number.isFinite(timestamp)) return isDateOnly(fallback) ? `${formatCompetitionDate(fallback)}, 23:59 Uhr` : "Termin folgt";
  return `${new Date(timestamp - 1).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })} Uhr`;
}
