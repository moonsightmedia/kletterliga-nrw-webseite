import { supabase } from "@/services/supabase";
import type {
  AdminSettings,
  ChangeRequest,
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
  return supabase.from("profiles").update(patch).eq("id", profileId).select("*").single<Profile>();
}

export async function upsertResult(result: Omit<Result, "id" | "created_at"> & { id?: string }) {
  return supabase.from("results").upsert(result).select("*").single<Result>();
}

export async function listRankings() {
  return supabase.from("rankings").select("*").order("rank").returns<{ rank: number; name: string; points: number }[]>();
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

export async function getGymCodeByCode(code: string) {
  return supabase.from("gym_codes").select("*").eq("code", code).maybeSingle<GymCode>();
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
