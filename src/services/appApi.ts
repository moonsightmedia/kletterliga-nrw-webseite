import { supabase, supabaseConfig } from "@/services/supabase";
import type {
  AdminSettings,
  ChangeRequest,
  FinaleRegistration,
  Gym,
  GymAdmin,
  GymCode,
  Profile,
  ProfileOverride,
  Result,
  Route,
} from "@/services/appTypes";

export async function fetchProfile(profileId: string) {
  return supabase.from("profiles").select("*").eq("id", profileId).maybeSingle<Profile>();
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }) {
  return supabase.from("profiles").upsert(profile).select("*").single<Profile>();
}

export async function listGyms() {
  return supabase.from("gyms").select("*").order("name").returns<Gym[]>();
}

export async function getGym(gymId: string) {
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", gymId)
    .limit(1)
    .returns<Gym[]>();
  const single = data?.[0] ?? null;
  return { data: single, error };
}

export async function listRoutesByGym(gymId: string) {
  return supabase.from("routes").select("*").eq("gym_id", gymId).order("code").returns<Route[]>();
}

export async function listRoutes() {
  return supabase.from("routes").select("*").returns<Route[]>();
}

export async function createRoute(route: Omit<Route, "id" | "created_at">) {
  return supabase.from("routes").insert(route).select("*").single<Route>();
}

export async function updateRoute(routeId: string, route: Partial<Route>) {
  return supabase.from("routes").update(route).eq("id", routeId).select("*").single<Route>();
}

export async function deleteRoute(routeId: string) {
  return supabase.from("routes").delete().eq("id", routeId);
}

export async function listResultsForUser(profileId: string) {
  return supabase
    .from("results")
    .select("*")
    .eq("profile_id", profileId)
    .returns<Result[]>();
}

export async function listResults() {
  return supabase.from("results").select("*").returns<Result[]>();
}

export async function listProfiles() {
  return supabase.from("profiles").select("*").returns<Profile[]>();
}

export async function updateProfile(profileId: string, patch: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profileId)
    .select("*")
    .maybeSingle<Profile>();
  if (error) return { data: null, error };
  if (!data) {
    return { data: null, error: { message: "Profil nicht gefunden oder keine Berechtigung", code: "PGRST116" } };
  }
  return { data, error: null };
}

export async function deleteProfile(profileId: string) {
  // Delete auth user via Edge Function (this will cascade delete profile and results)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  const url = `${supabaseConfig.url}/functions/v1/delete-user`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      apikey: supabaseConfig.anonKey,
    },
    body: JSON.stringify({ userId: profileId }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Fehler beim Löschen des Benutzers";
    return { error: { message } };
  }

  return { error: null };
}

export async function upsertResult(result: Omit<Result, "id" | "created_at"> & { id?: string }) {
  // If id is provided, use it for upsert
  if (result.id) {
    return supabase.from("results").upsert(result).select("*").single<Result>();
  }
  
  // Otherwise, find existing result by profile_id and route_id
  const { data: existing } = await supabase
    .from("results")
    .select("id")
    .eq("profile_id", result.profile_id)
    .eq("route_id", result.route_id)
    .maybeSingle<{ id: string }>();
  
  if (existing) {
    // Update existing result
    return supabase
      .from("results")
      .update({
        points: result.points,
        flash: result.flash,
        status: result.status,
      })
      .eq("id", existing.id)
      .select("*")
      .single<Result>();
  } else {
    // Insert new result
    return supabase.from("results").insert(result).select("*").single<Result>();
  }
}

export async function updateResult(resultId: string, patch: Partial<Result>) {
  const { data, error } = await supabase
    .from("results")
    .update(patch)
    .eq("id", resultId)
    .select("*")
    .maybeSingle<Result>();
  if (error) return { data: null, error };
  if (!data) {
    return { data: null, error: { message: "Ergebnis nicht gefunden oder keine Berechtigung", code: "PGRST116" } };
  }
  return { data, error: null };
}

export async function listRankings() {
  return supabase.from("rankings").select("*").order("rank").returns<{ rank: number; name: string; points: number }[]>();
}

/** Public website: top N per league/class via Edge Function (bypasses RLS). */
export async function getPublicRankings(league: "toprope" | "lead", className: string) {
  const url = `${supabaseConfig.url}/functions/v1/get-public-rankings`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      apikey: supabaseConfig.anonKey,
    },
    body: JSON.stringify({ league, class: className }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Rangliste konnte nicht geladen werden.";
    return { data: null, error: { message } };
  }
  const data = Array.isArray(body) ? body : (body as { data?: unknown[] })?.data ?? [];
  return { data: data as { rank: number; display_name: string; points: number }[], error: null };
}

export async function createChangeRequest(request: Omit<ChangeRequest, "id" | "created_at">) {
  return supabase.from("change_requests").insert(request).select("*").single<ChangeRequest>();
}

export async function listGymCodesByGym(gymId: string) {
  return supabase.from("gym_codes").select("*").eq("gym_id", gymId).order("created_at", { ascending: false }).returns<GymCode[]>();
}

export async function createGymCodes(codes: Omit<GymCode, "id" | "created_at">[]) {
  return supabase.from("gym_codes").insert(codes).select("*").returns<GymCode[]>();
}

export async function updateGymCode(codeId: string, patch: Partial<GymCode>) {
  return supabase.from("gym_codes").update(patch).eq("id", codeId).select("*").single<GymCode>();
}

export async function deleteGymCode(codeId: string) {
  return supabase.from("gym_codes").delete().eq("id", codeId);
}

export async function getGymCodeByCode(code: string) {
  // Normalisiere Code zu Großbuchstaben für case-insensitive Suche
  const normalized = code.trim().toUpperCase();
  return supabase.from("gym_codes").select("*").eq("code", normalized).maybeSingle<GymCode>();
}

export async function checkGymCodeRedeemed(gymId: string, profileId: string) {
  return supabase
    .from("gym_codes")
    .select("*")
    .eq("gym_id", gymId)
    .eq("redeemed_by", profileId)
    .not("redeemed_at", "is", null)
    .maybeSingle<GymCode>();
}

export async function listGymAdminsByProfile(profileId: string) {
  return supabase.from("gym_admins").select("*").eq("profile_id", profileId).returns<{ gym_id: string }[]>();
}

export async function updateGym(gymId: string, patch: Partial<Gym>) {
  const { data, error } = await supabase
    .from("gyms")
    .update(patch)
    .eq("id", gymId)
    .select("*")
    .limit(1)
    .returns<Gym[]>();
  const single = data?.[0] ?? null;
  return { data: single, error };
}

export async function deleteGym(gymId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  try {
    // Use Edge Function to delete gym and associated auth users
    const response = await fetch(`${supabaseUrl}/functions/v1/delete-gym`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ gymId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        data: null,
        error: {
          message: data.error || `HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }
    
    return {
      data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : "Failed to delete gym",
      },
    };
  }
}

export async function inviteGymAdmin(email: string, skipEmail: boolean = false) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  try {
    // Verwende fetch direkt, um bessere Fehlerbehandlung zu haben
    const response = await fetch(`${supabaseUrl}/functions/v1/invite-gym-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ email, skip_email: skipEmail }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("inviteGymAdmin error response:", data);
      return {
        data: null,
        error: {
          message: data.error || `HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }
    
    console.log("inviteGymAdmin success:", data);
    return {
      data,
      error: null,
    };
  } catch (error: any) {
    console.error("inviteGymAdmin exception:", error);
    return {
      data: null,
      error: {
        message: error?.message || "Einladung konnte nicht gesendet werden",
      },
    };
  }
}

export async function getGymInviteByToken(token: string) {
  return supabase.from("gym_invites").select("*").eq("token", token).maybeSingle();
}

export async function listGymAdminsByGym(gymId: string) {
  return supabase.from("gym_admins").select("*").eq("gym_id", gymId).returns<GymAdmin[]>();
}

export async function createGymAdmin(mapping: Omit<GymAdmin, "id" | "created_at">) {
  return supabase.from("gym_admins").insert(mapping).select("*").single<GymAdmin>();
}

export async function deleteGymAdmin(mappingId: string) {
  return supabase.from("gym_admins").delete().eq("id", mappingId);
}

export async function listAdminSettings() {
  return supabase.from("admin_settings").select("*").order("updated_at", { ascending: false }).returns<AdminSettings[]>();
}

export async function upsertAdminSettings(settings: Partial<AdminSettings> & { id?: string }) {
  return supabase.from("admin_settings").upsert(settings).select("*").single<AdminSettings>();
}

export async function listProfileOverrides() {
  return supabase.from("profile_overrides").select("*").order("created_at", { ascending: false }).returns<ProfileOverride[]>();
}

export async function createProfileOverride(override: Omit<ProfileOverride, "id" | "created_at">) {
  return supabase.from("profile_overrides").insert(override).select("*").single<ProfileOverride>();
}

export async function updateProfileOverride(id: string, patch: Partial<ProfileOverride>) {
  return supabase.from("profile_overrides").update(patch).eq("id", id).select("*").single<ProfileOverride>();
}

export async function registerForFinale(profileId: string) {
  return supabase.from("finale_registrations").insert({ profile_id: profileId }).select("*").single<FinaleRegistration>();
}

export async function unregisterFromFinale(profileId: string) {
  return supabase.from("finale_registrations").delete().eq("profile_id", profileId);
}

export async function getFinaleRegistration(profileId: string) {
  return supabase.from("finale_registrations").select("*").eq("profile_id", profileId).maybeSingle<FinaleRegistration>();
}

export async function listFinaleRegistrations() {
  return supabase
    .from("finale_registrations")
    .select("*, profiles!inner(*)")
    .order("created_at", { ascending: false });
}
