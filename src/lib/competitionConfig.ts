import type { CompetitionConfig, CompetitionAssignment, CompetitionRouteInput } from "@/services/competitionDay";
import type { AdminSemifinalRegistration } from "@/services/semifinalAdminApi";

export const competitionZonePoints = Array.from({ length: 11 }, (_, zone) => zone);

export const competitionClassKey = (row: Pick<CompetitionAssignment, "league" | "class_label">) => `${row.league}:${row.class_label}`;
export const exactCompetitionEmailPattern = (email: string) => email.trim().replace(/[\\%_]/g, "\\$&");

export function registeredCompetitionClasses(rows: AdminSemifinalRegistration[]) {
  const classes = new Map<string, CompetitionAssignment & { count: number }>();
  for (const row of rows) {
    if (row.eligibility_status !== "eligible" || !row.approved_league || !row.approved_class_label) continue;
    const value = { league: row.approved_league, class_label: row.approved_class_label, route_numbers: [], count: 1 };
    const key = competitionClassKey(value);
    const previous = classes.get(key);
    classes.set(key, previous ? { ...previous, count: previous.count + 1 } : value);
  }
  return [...classes.values()].sort((a, b) => competitionClassKey(a).localeCompare(competitionClassKey(b), "de"));
}

export function validateCompetitionRouteDraft(routes: CompetitionRouteInput[]): string | null {
  if (routes.length < 5 || routes.length > 30) return "Bitte lege zwischen 5 und 30 physische Routen an.";
  const numbers = routes.map((route) => route.number);
  if (new Set(numbers).size !== numbers.length || numbers.some((number) => !Number.isInteger(number) || number < 1 || number > 99)) return "Routennummern müssen eindeutig sein und zwischen 1 und 99 liegen.";
  if (routes.some((route) => !route.name.trim() || route.name.length > 100 || route.grade.length > 40 || route.color.length > 40)) return "Bitte gib jeder Route einen gültigen Namen; Grad und Farbe dürfen höchstens 40 Zeichen lang sein.";
  return null;
}

export function validateCompetitionConfig(config: CompetitionConfig, requiredClasses: CompetitionAssignment[]): string | null {
  const routeError = validateCompetitionRouteDraft(config.routes);
  if (routeError) return routeError;
  const numbers = config.routes.map((route) => route.number);
  const values = config.zone_points;
  if (values.length !== 11 || values.some((n, i) => !Number.isFinite(n) || n < 0 || n > 1000 || (i > 0 && n < values[i - 1])) || values[0] !== 0 || values[10] <= 0) return "Bitte bestätige eine aufsteigende Wertung für die Zonen 0–10. Zone 0 muss 0 Punkte ergeben, Zone 10 mehr als 0.";
  if (!config.assignments.length) return "Es fehlt eine Klassenzuordnung.";
  if (new Set(config.assignments.map(competitionClassKey)).size !== config.assignments.length) return "Eine Klasse wurde doppelt zugeordnet.";
  for (const row of config.assignments) {
    if (row.route_numbers.length !== 5 || new Set(row.route_numbers).size !== 5 || row.route_numbers.some((n) => !numbers.includes(n))) return `${row.class_label}: Bitte genau fünf verschiedene vorhandene Routen zuordnen.`;
  }
  if (requiredClasses.some((required) => !config.assignments.some((a) => competitionClassKey(a) === competitionClassKey(required)))) return "Nicht alle angemeldeten Klassen sind zugeordnet.";
  return null;
}
