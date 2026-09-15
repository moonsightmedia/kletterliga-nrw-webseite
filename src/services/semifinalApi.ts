import { supabase } from "./supabase";

export interface SemifinalRegistrationState {
  eligible: boolean;
  eligibility_status: "pending" | "eligible" | "not_eligible";
  registered: boolean;
  registration_open: boolean;
  /** Exclusive deadline: midnight after the configured last day in Europe/Berlin. */
  registration_deadline: string | null;
  finale_date: string | null;
  season_year: string | null;
  league: "toprope" | "lead" | null;
  class_label: string | null;
}

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

export function isSemifinalRegistrationState(value: unknown): value is SemifinalRegistrationState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  return typeof state.eligible === "boolean"
    && ["pending", "eligible", "not_eligible"].includes(String(state.eligibility_status))
    && typeof state.registered === "boolean"
    && typeof state.registration_open === "boolean"
    && isNullableString(state.registration_deadline)
    && isNullableString(state.finale_date)
    && isNullableString(state.season_year)
    && [null, "toprope", "lead"].includes(state.league as string | null)
    && isNullableString(state.class_label);
}

async function callRegistrationRpc(name: string): Promise<SemifinalRegistrationState> {
  const { data, error } = await supabase.rpc(name);
  if (error) throw error;
  if (!isSemifinalRegistrationState(data)) {
    throw new Error("Der Anmeldestatus konnte nicht sicher geladen werden. Bitte versuche es erneut.");
  }
  return data;
}

export const getSemifinalRegistrationState = () => callRegistrationRpc("get_semifinal_registration_state");
export const registerForSemifinal = () => callRegistrationRpc("register_for_semifinal");
export const cancelSemifinalRegistration = () => callRegistrationRpc("cancel_semifinal_registration");

export function getSemifinalRegistrationError(error: unknown): string {
  const message = error && typeof error === "object" && "message" in error
    ? String(error.message) : "";
  if (message.includes("SEMIFINAL_REGISTRATION_CLOSED")) {
    return "Die Anmeldung ist derzeit geschlossen. Bitte wende dich bei Änderungen an die Orga.";
  }
  if (message.includes("SEMIFINAL_NOT_ELIGIBLE")) {
    return "Deine Startberechtigung ist noch nicht freigegeben. Bitte wende dich an die Orga.";
  }
  if (message.includes("AUTHENTICATION_REQUIRED")) return "Bitte melde dich erneut an.";
  return "Die Anmeldung konnte nicht sicher bestätigt werden. Bitte lade den Status neu und versuche es erneut.";
}
