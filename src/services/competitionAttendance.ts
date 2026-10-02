import { supabase } from "@/services/supabase";

export type AttendanceStatus = "expected" | "arrived" | "absent";
export type AttendanceAction = "arrive" | "late-register" | "undo" | "absent";
export interface AttendanceRow {
  profile_id: string;
  name: string;
  league: "lead" | "toprope";
  class_label: string;
  registered: boolean;
  eligible: boolean;
  status: AttendanceStatus;
  version: number;
  checked_in_at: string | null;
  route_count: number;
  can_late_register: boolean;
}
export interface AttendanceData {
  season: string;
  phase: "draft" | "open" | "closed";
  deadline: string | null;
  rows: AttendanceRow[];
}
export interface AttendanceChange {
  profile_id: string;
  status: AttendanceStatus;
  registered: boolean;
  version: number;
  checked_in_at: string | null;
}

const messages: Record<string, string> = {
  ATTENDANCE_CONFLICT: "Der Eintrag wurde inzwischen geändert. Bitte aktualisieren und den neuen Stand prüfen.",
  ATTENDANCE_REQUEST_CONFLICT: "Dieser Vorgang wurde inzwischen geändert. Bitte aktualisieren und den neuen Stand prüfen.",
  ATTENDANCE_PASSWORD_INVALID: "Das Einlasspasswort ist ungültig oder wurde geändert. Bitte erneut anmelden.",
  ATTENDANCE_CLOSED: "Nachmeldungen sind geschlossen. Bitte an René wenden.",
  ATTENDANCE_ROUTES_MISSING: "Für diese Klasse fehlen Halbfinalrouten. Bitte René informieren.",
  ATTENDANCE_NOT_ELIGIBLE: "Die Startberechtigung fehlt. Bitte an René wenden.",
  COMPETITION_NOT_ELIGIBLE: "Die Startberechtigung fehlt. Bitte an René wenden.",
  COMPETITION_DEADLINE_REACHED: "Nachmeldungen sind geschlossen. Bitte an René wenden.",
  COMPETITION_ABSENT: "Die Person ist als nicht erschienen oder zurückgezogen markiert. Bitte René fragen.",
  ATTENDANCE_CLASS_LOCKED: "Das Finalfeld dieser Klasse ist bereits freigegeben. Der Einlassstatus kann nicht mehr geändert werden.",
  ATTENDANCE_NOT_REGISTERED: "Die Person ist nicht zum Wettkampftag angemeldet. Bitte zuerst nachmelden.",
  ATTENDANCE_RESULTS_EXIST: "Die Person hat bereits Halbfinalergebnisse. Bitte den Ausfall direkt im Halbfinalbereich mit René klären.",
  LEAGUE_ADMIN_REQUIRED: "Hierfür ist ein persönliches Liga-Admin-Konto erforderlich.",
};
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const code = Object.keys(messages).find((key) => error.message?.includes(key));
    throw new Error(code ? messages[code] : "Die Aktion konnte nicht bestätigt werden. Bitte erneut versuchen.");
  }
  return data as T;
}
export const getCompetitionAttendance = (season: string, password: string | null = null) =>
  rpc<AttendanceData>("get_competition_attendance", { p_season: season, p_password: password });

export const setCompetitionAttendance = (
  season: string, profile: string, action: AttendanceAction, version: number,
  requestId: string, reason: string | null = null, password: string | null = null,
) => rpc<AttendanceChange>("set_competition_attendance", {
  p_season: season, p_profile: profile, p_action: action, p_version: version,
  p_request_id: requestId, p_reason: reason, p_password: password,
});

export const getCompetitionAttendanceAccessStatus = (season: string) =>
  rpc<boolean>("get_competition_attendance_access_status", { p_season: season });
export const setCompetitionAttendancePassword = (season: string, password: string | null) =>
  rpc<void>("set_competition_attendance_password", { p_season: season, p_password: password });

export const attendanceSource = { get: getCompetitionAttendance, set: setCompetitionAttendance };
