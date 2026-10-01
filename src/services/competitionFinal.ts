import { supabase } from "@/services/supabase";

export type League = "toprope" | "lead";
export type FinalPhase =
  "preparation" | "published" | "running" | "review" | "final";
export interface SemifinalMissing {
  route_id: string;
  number: number;
  settled: boolean;
}
export interface SemifinalRow {
  profile_id: string;
  name: string;
  league: League;
  class_label: string;
  points: number;
  completed: number;
  rank: number;
  excluded: "dns" | "withdrawn" | null;
  missing: SemifinalMissing[];
}
export interface FinalRoute {
  id: string;
  number: number;
  name: string;
  max_grip: number;
}
export interface FinalEntry {
  entry_id: string;
  profile_id: string;
  name: string;
  semifinal_rank: number;
  semifinal_points: number;
  start_position: number;
  status: "ready" | "dns" | "incident";
  checked_at: string | null;
  attempt_id: string | null;
  is_top: boolean | null;
  grip: number | null;
  seconds: number | null;
  rank: number | null;
  entered_at: string | null;
}
export interface PublicFinalEntry {
  name: string;
  semifinal_rank: number;
  start_position: number;
  status: FinalEntry["status"];
  has_result: boolean;
  is_top: boolean | null;
  grip: number | null;
  seconds: number | null;
  rank: number | null;
}
export interface FinalClass {
  id: string;
  league: League;
  class_label: string;
  route_id: string | null;
  station_no: 1 | 2 | null;
  phase: FinalPhase;
  version: number;
  published_at: string | null;
  stale: boolean;
  entries: FinalEntry[];
}
export interface FinalAudit {
  entry_id?: string | null;
  result_id?: string | null;
  action: string;
  reason: string;
  created_at: string;
  actor?: string;
  station_no?: number;
  before_data?: unknown;
  after_data?: unknown;
}
export interface DisplaySettings {
  phase: "semifinal" | "final";
  class_keys: string[];
  pinned_key: string | null;
  interval_seconds: number;
}
export interface LiveNotice {
  id: string;
  title: string;
  body: string;
  show_app: boolean;
  show_tv: boolean;
  fullscreen: boolean;
  expires_at: string | null;
  withdrawn_at?: string | null;
}
export interface FinalAdmin {
  phase: "draft" | "open" | "closed";
  final_password_set?: boolean;
  submission_deadline_at?: string | null;
  classes: FinalClass[];
  routes: FinalRoute[];
  semifinal: SemifinalRow[];
  semifinal_results: Array<{
    id: string;
    profile_id: string;
    route_number: number;
    zone: number;
    points: number;
    created_at: string;
  }>;
  stations: { station_no: 1 | 2; updated_at: string }[];
  display: DisplaySettings | null;
  notices: LiveNotice[];
  audit: FinalAudit[];
  semifinal_audit: FinalAudit[];
}
export interface LiveClass {
  key: string;
  league: League;
  class_label: string;
  phase?: FinalPhase;
  entries: Array<
    | PublicFinalEntry
    | { name: string; rank: number; points: number; completed: number }
  >;
}
export interface LiveData {
  season: string;
  phase: "semifinal" | "final";
  pinned_key: string | null;
  interval_seconds: number;
  class_keys: string[];
  semifinal_open: boolean;
  updated_at: string;
  classes: LiveClass[];
  notices: LiveNotice[];
}
export interface StationClass extends Omit<
  FinalClass,
  "route_id" | "station_no" | "published_at" | "stale"
> {
  route: FinalRoute;
}

function errorText(error: unknown): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (raw.includes("FINAL_VERSION_CONFLICT"))
    return "Die Klasse wurde inzwischen geändert. Bitte neu laden und den aktuellen Stand prüfen.";
  if (
    raw.includes("FINAL_STATION_INVALID") ||
    raw.includes("FINAL_PASSWORD_INVALID")
  )
    return "Das Finalpasswort ist ungültig oder wurde geändert. Bitte erneut anmelden.";
  if (raw.includes("LEAGUE_ADMIN_REQUIRED"))
    return "Diese Aktion erfordert ein persönliches Liga-Admin-Konto. Bitte melde dich erneut an.";
  return raw || "Die Aktion konnte nicht abgeschlossen werden.";
}
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(errorText(error));
  return data as T;
}
export const getFinalAdmin = (season: string) =>
  rpc<FinalAdmin>("get_competition_final_admin", { p_season: season });
export const getLiveCompetition = (season: string) =>
  rpc<LiveData>("get_competition_live", { p_season: season });
export const getPublicFinal = (season: string) =>
  rpc<LiveClass[]>("get_competition_final_public", { p_season: season });
export const saveFinalRoute = (
  season: string,
  number: number,
  name: string,
  maxGrip: number,
) =>
  rpc<void>("set_competition_final_route", {
    p_season: season,
    p_number: number,
    p_name: name,
    p_max_grip: maxGrip,
  });
export const settleSemifinal = (
  season: string,
  profile: string,
  route: string,
  reason: string,
) =>
  rpc<void>("settle_competition_semifinal", {
    p_season: season,
    p_profile: profile,
    p_route: route,
    p_reason: reason,
  });
export const enterSemifinalResult = (
  season: string,
  profile: string,
  route: string,
  zone: number,
  reason: string,
) =>
  rpc<void>("enter_competition_semifinal_result", {
    p_season: season,
    p_profile: profile,
    p_route: route,
    p_zone: zone,
    p_reason: reason,
  });
export const setFinalExclusion = (
  season: string,
  profile: string,
  status: "dns" | "withdrawn" | null,
  reason: string,
) =>
  rpc<void>("set_competition_final_exclusion", {
    p_season: season,
    p_profile: profile,
    p_status: status,
    p_reason: reason,
  });
export const publishFinalClass = (
  season: string,
  league: League,
  classLabel: string,
  route: string,
  station: number,
  expectedVersion: number,
) =>
  rpc<void>("publish_competition_final_class", {
    p_season: season,
    p_league: league,
    p_label: classLabel,
    p_route: route,
    p_station: station,
    p_expected_version: expectedVersion,
  });
export const moveFinalEntry = (
  entry: string,
  position: number,
  version: number,
) =>
  rpc<void>("move_competition_final_entry", {
    p_entry: entry,
    p_position: position,
    p_expected_version: version,
  });
export const setFinalPhase = (
  id: string,
  phase: FinalPhase,
  version: number,
  reason = "",
) =>
  rpc<void>("set_competition_final_phase", {
    p_class: id,
    p_phase: phase,
    p_expected_version: version,
    p_reason: reason,
  });
export const setFinalEntryStatus = (
  entry: string,
  status: FinalEntry["status"],
  reason: string,
  version: number,
) =>
  rpc<void>("set_competition_final_entry_status", {
    p_entry: entry,
    p_status: status,
    p_reason: reason,
    p_expected_version: version,
  });
export const checkFinalEntry = (entry: string, version: number) =>
  rpc<void>("check_competition_final_entry", {
    p_entry: entry,
    p_expected_version: version,
  });
export const setFinalPassword = (season: string, password: string) =>
  rpc<void>("set_competition_final_password", {
    p_season: season,
    p_password: password,
  });
export const getFinalStation = (
  season: string,
  station: number,
  code: string,
) =>
  rpc<{ classes: StationClass[] }>("get_competition_final_station", {
    p_season: season,
    p_station: station,
    p_code: code,
  });
export const submitFinalAttempt = (input: {
  season: string;
  station: number;
  code: string;
  entry: string;
  request: string;
  grip: number;
  top: boolean;
  seconds: number;
  version: number;
  reason: string;
}) =>
  rpc<void>("submit_competition_final_attempt", {
    p_season: input.season,
    p_station: input.station,
    p_code: input.code,
    p_entry: input.entry,
    p_request: input.request,
    p_grip: input.grip,
    p_top: input.top,
    p_seconds: input.seconds,
    p_expected_version: input.version,
    p_reason: input.reason,
  });
export const setLiveDisplay = (season: string, settings: DisplaySettings) =>
  rpc<void>("set_competition_live_display", {
    p_season: season,
    p_phase: settings.phase,
    p_keys: settings.class_keys,
    p_pinned: settings.pinned_key,
    p_interval: settings.interval_seconds,
  });
export const saveLiveNotice = (
  season: string,
  notice: Omit<LiveNotice, "id"> & { id?: string; withdrawn?: boolean },
) =>
  rpc<string>("save_competition_live_notice", {
    p_season: season,
    p_id: notice.id ?? null,
    p_title: notice.title,
    p_body: notice.body,
    p_app: notice.show_app,
    p_tv: notice.show_tv,
    p_fullscreen: notice.fullscreen,
    p_expires: notice.expires_at,
    p_withdraw: notice.withdrawn ?? false,
  });

export const classKey = (league: League, label: string) => `${league}|${label}`;
export const className = (league: League, label: string) =>
  `${league === "lead" ? "Vorstieg" : "Toprope"} · ${label}`;
export const resultLabel = (
  entry: Pick<FinalEntry, "status" | "is_top" | "grip" | "seconds"> & {
    attempt_id?: string | null;
    has_result?: boolean;
  },
) =>
  entry.status === "dns"
    ? "Nicht gestartet"
    : entry.status === "incident"
      ? "Zwischenfall"
      : !(entry.attempt_id || entry.has_result)
        ? "Offen"
        : `${entry.is_top ? "TOP" : `Griff ${entry.grip}`} · ${Math.floor((entry.seconds ?? 0) / 60)}:${String((entry.seconds ?? 0) % 60).padStart(2, "0")}`;

export function downloadFinalCsv(c: FinalClass, season: string): void {
  const head = [
    "Platz",
    "Name",
    "Klasse",
    "Griff/TOP",
    "Zeit (Sekunden)",
    "Halbfinalplatz",
    "Status",
  ];
  const rows = c.entries.map((e) => [
    e.rank ?? "",
    e.name,
    className(c.league, c.class_label),
    e.attempt_id ? (e.is_top ? "TOP" : e.grip) : "",
    e.seconds ?? "",
    e.semifinal_rank,
    e.status,
  ]);
  const quote = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;
  const csv =
    "\ufeff" +
    [head, ...rows].map((row) => row.map(quote).join(";")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `finale-${season}-${c.league}-${c.class_label}-${c.phase === "final" ? "offiziell" : "vorlaeufig"}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
