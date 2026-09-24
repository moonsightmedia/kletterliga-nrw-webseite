import { supabase } from "./supabase";
import { competitionZonePoints } from "@/lib/competitionConfig";

export type CompetitionPhase = "draft" | "open" | "closed";
export type CompetitionLeague = "toprope" | "lead";

export interface CompetitionRouteInput { number: number; name: string; grade: string; color: string }
export interface CompetitionAssignment { league: CompetitionLeague; class_label: string; route_numbers: number[] }
export interface CompetitionConfig {
  routes: CompetitionRouteInput[];
  assignments: CompetitionAssignment[];
  zone_points: number[];
  flash_bonus: number;
}
export interface CompetitionRoute extends CompetitionRouteInput { id: string }
export interface CompetitionResult {
  id: string; route_id: string; profile_id: string; zone: number; flash: boolean; points: number; created_at: string;
}
export interface CompetitionDay {
  event: null | { id: string; season_year: string; phase: CompetitionPhase; zone_points: number[]; flash_bonus: number; opened_at: string | null };
  eligible: boolean; league: CompetitionLeague | null; class_label: string | null;
  routes: CompetitionRoute[]; results: CompetitionResult[]; is_staff: boolean; is_admin: boolean;
}
export interface CompetitionStaffRoute extends CompetitionRoute { qr_token: string }
export interface CompetitionJudgeAccess { event: { id: string; phase: CompetitionPhase }; routes: CompetitionStaffRoute[] }
export interface CompetitionStaffMember { profile_id: string; name: string }
export interface CompetitionAdminResult extends CompetitionResult {
  name: string; league: CompetitionLeague; class_label: string;
}
export interface CompetitionAdminData {
  config: CompetitionConfig;
  staff: CompetitionStaffMember[];
  results: CompetitionAdminResult[];
}
export interface CompetitionStanding {
  profile_id: string; name: string; league: CompetitionLeague; class_label: string;
  points: number; completed_routes: number; rank: number;
}

const rpc = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(readableError(error));
  return data as T;
};

function readableError(error: unknown): string {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const messages: Record<string, string> = {
    AUTHENTICATION_REQUIRED: "Bitte melde dich erneut an.",
    LEAGUE_ADMIN_REQUIRED: "Diese Aktion ist nur für die Liga-Administration verfügbar.",
    COMPETITION_STAFF_REQUIRED: "Du bist für diesen Wettkampftag nicht als Staff eingetragen.",
    COMPETITION_NOT_OPEN: "Die Ergebniseingabe ist derzeit geschlossen.",
    COMPETITION_NOT_ELIGIBLE: "Du bist für diese Wertung nicht startberechtigt.",
    COMPETITION_QR_INVALID: "Der QR-Code ist ungültig. Bitte scanne den Code der Route erneut.",
    COMPETITION_RESULT_IMMUTABLE: "Dieses Ergebnis ist bereits abgegeben und kann nicht geändert werden.",
    COMPETITION_CONFIG_LOCKED: "Die Wettkampfeinstellungen sind nach dem Öffnen gesperrt.",
    COMPETITION_DRAFT_ONLY: "Der Routenentwurf kann nur vor der Klassenzuordnung und Helferfreigabe separat gespeichert werden.",
    COMPETITION_JUDGE_PASSWORD_INVALID: "Der Schiedsrichter-Code ist ungültig oder wurde ausgetauscht.",
  };
  for (const [key, value] of Object.entries(messages)) if (message.includes(key)) return value;
  return "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.";
}

export const getCompetitionDay = (season: string) => rpc<CompetitionDay>("get_competition_day", { p_season: season });
export const getCompetitionStaffRoutes = (season: string) => rpc<CompetitionStaffRoute[]>("get_competition_staff_routes", { p_season: season });
export const getCompetitionJudgeRoutes = (season: string, password: string) =>
  rpc<CompetitionJudgeAccess>("get_competition_judge_routes", { p_season: season, p_password: password });
export const getCompetitionJudgeAccessStatus = (season: string) =>
  rpc<boolean>("get_competition_judge_access_status", { p_season: season });
export const setCompetitionJudgePassword = (season: string, password: string) =>
  rpc<void>("set_competition_judge_password", { p_season: season, p_password: password });
export const saveCompetitionConfig = (season: string, config: CompetitionConfig) =>
  rpc<void>("save_competition_config", { p_season: season, p_config: { ...config, zone_points: [...competitionZonePoints] } });
export const saveCompetitionRouteDraft = (season: string, routes: CompetitionRouteInput[]) =>
  rpc<void>("save_competition_route_draft", { p_season: season, p_routes: routes });
export const getCompetitionAdmin = (season: string) => rpc<CompetitionAdminData>("get_competition_admin", { p_season: season });
export const setCompetitionPhase = (season: string, phase: Exclude<CompetitionPhase, "draft">) =>
  rpc<void>("set_competition_phase", { p_season: season, p_phase: phase });
export const setCompetitionStaff = (season: string, profileId: string, enabled: boolean) =>
  rpc<void>("set_competition_staff", { p_season: season, p_profile_id: profileId, p_enabled: enabled });
export const submitCompetitionResult = (input: { season: string; routeId: string; zone: number; flash: boolean; qrToken: string }) =>
  rpc<CompetitionResult>("submit_competition_result", {
    p_season: input.season, p_route_id: input.routeId, p_zone: input.zone,
    p_flash: input.flash, p_qr_token: input.qrToken,
  });
export const correctCompetitionResult = (input: { resultId: string; zone: number; flash: boolean; reason: string }) =>
  rpc<CompetitionResult>("correct_competition_result", {
    p_result_id: input.resultId, p_zone: input.zone, p_flash: input.flash, p_reason: input.reason,
  });
export const listCompetitionStandings = (season: string) =>
  rpc<CompetitionStanding[]>("list_competition_standings", { p_season: season });
