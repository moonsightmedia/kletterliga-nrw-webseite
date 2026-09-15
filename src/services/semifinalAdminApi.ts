import { supabase } from "./supabase";

export interface AdminSemifinalRegistration {
  id: string;
  profile_id: string;
  season_year: string;
  registration_status: "registered";
  created_at: string;
  profiles: {
    id: string; first_name: string | null; last_name: string | null; email: string | null;
    role: string; archived_at: string | null; participation_activated_at: string | null;
  };
  approved_league: "toprope" | "lead" | null;
  approved_class_label: string | null;
  eligibility_status: "pending" | "eligible" | "not_eligible";
}

type RegistrationRow = Omit<AdminSemifinalRegistration, "approved_league" | "approved_class_label" | "eligibility_status" | "registration_status"> & {
  registration_status: "registered" | "cancelled";
};
type EligibilityRow = {
  profile_id: string;
  season_year: string;
  status: "pending" | "eligible" | "not_eligible";
  league: "toprope" | "lead" | null;
  class_label: string | null;
};

/** Never infer a missing season/status from the old schema or a class from a birthday. */
export function selectCurrentSemifinalRegistrations(
  rows: RegistrationRow[], approvals: EligibilityRow[], seasonYear: string,
): AdminSemifinalRegistration[] {
  if (!seasonYear.trim()) throw new Error("Die aktuelle Saison fehlt.");
  if (rows.some((row) => typeof row.season_year !== "string"
    || !["registered", "cancelled"].includes(row.registration_status)
    || !row.profiles || typeof row.id !== "string"
    || typeof row.profiles.role !== "string"
    || !("archived_at" in row.profiles) || !("participation_activated_at" in row.profiles))) {
    throw new Error("Die Anmeldedaten sind unvollständig. Bitte prüfe den Stand der Datenbankmigration.");
  }
  const approved = new Map(approvals.filter((row) => row.season_year === seasonYear).map((row) => [row.profile_id, row]));
  return rows.filter((row) => row.season_year === seasonYear && row.registration_status === "registered").map((row) => {
    const approval = approved.get(row.profile_id);
    const activeParticipant = row.profiles.role === "participant"
      && row.profiles.archived_at === null && row.profiles.participation_activated_at !== null;
    return {
      ...row,
      registration_status: "registered",
      approved_league: approval?.league ?? null,
      approved_class_label: approval?.class_label ?? null,
      eligibility_status: approval?.status === "eligible" && activeParticipant ? "eligible"
        : approval?.status === "not_eligible" ? "not_eligible" : "pending",
    };
  });
}

async function loadPages<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Die Anmeldedaten konnten nicht geladen werden.");
    all.push(...data as T[]);
    if (data.length < 1000) return all;
  }
}

export async function listAdminSemifinalRegistrations(seasonYear: string): Promise<AdminSemifinalRegistration[]> {
  if (!seasonYear.trim()) throw new Error("Die aktuelle Saison fehlt.");
  const [registrations, approvals] = await Promise.all([
    loadPages<RegistrationRow>((from, to) => supabase.from("finale_registrations")
      .select("id,profile_id,season_year,registration_status,created_at,profiles!inner(id,first_name,last_name,email,role,archived_at,participation_activated_at)")
      .eq("season_year", seasonYear).eq("registration_status", "registered")
      .order("created_at", { ascending: false }).order("id").range(from, to)),
    loadPages<EligibilityRow>((from, to) => supabase.from("semifinal_eligibility")
      .select("profile_id,season_year,status,league,class_label")
      .eq("season_year", seasonYear).order("profile_id").range(from, to)),
  ]);
  return selectCurrentSemifinalRegistrations(registrations, approvals, seasonYear);
}

export async function adminCancelSemifinalRegistration(registrationId: string): Promise<void> {
  const { data, error } = await supabase.rpc("admin_cancel_semifinal_registration", { p_registration_id: registrationId });
  if (error) throw error;
  if (!data || data.id !== registrationId || data.registration_status !== "cancelled") {
    throw new Error("Die Absage konnte nicht sicher bestätigt werden. Bitte lade die Liste neu.");
  }
}
