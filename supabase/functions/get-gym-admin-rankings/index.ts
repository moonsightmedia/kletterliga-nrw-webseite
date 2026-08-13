import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import {
  buildGymAdminRankings,
  filterGymAdminRankingProfiles,
  type GymAdminRankingAge,
  type GymAdminRankingGender,
  type GymAdminRankingLeague,
  type GymAdminRankingProfileInput,
  type GymAdminRankingResultInput,
  type GymAdminRankingRouteInput,
  type GymAdminRankingSettingsInput,
} from "./rankings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SOURCE_PAGE_SIZE = 1000;
const PROFILE_ID_BATCH_SIZE = 150;

type AdminProfileRow = {
  id: string;
  role: string | null;
  archived_at: string | null;
};

type ServiceClient = ReturnType<typeof createClient>;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      Vary: "Authorization",
      ...corsHeaders,
    },
  });

const getBearerToken = (req: Request) => {
  const header = req.headers.get("Authorization") ?? "";
  const [scheme, token] = header.trim().split(/\s+/);
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
};

const listAll = async <T>(queryPage: (from: number, to: number) => PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>) => {
  const rows: T[] = [];
  for (let from = 0; ; from += SOURCE_PAGE_SIZE) {
    const response = await queryPage(from, from + SOURCE_PAGE_SIZE - 1);
    if (response.error) return { data: null as T[] | null, error: response.error };
    const page = response.data ?? [];
    rows.push(...page);
    if (page.length < SOURCE_PAGE_SIZE) return { data: rows, error: null };
  }
};

const listAllResults = async (
  supabase: ServiceClient,
  profileIds: string[],
): Promise<{ data: GymAdminRankingResultInput[] | null; error: { message: string } | null }> => {
  if (profileIds.length === 0) return { data: [], error: null };
  const results: GymAdminRankingResultInput[] = [];

  for (let start = 0; start < profileIds.length; start += PROFILE_ID_BATCH_SIZE) {
    const profileBatch = profileIds.slice(start, start + PROFILE_ID_BATCH_SIZE);
    const batch = await listAll<GymAdminRankingResultInput>((from, to) =>
      supabase
        .from("results")
        .select("profile_id, route_id, points, flash, created_at")
        .in("profile_id", profileBatch)
        .order("id", { ascending: true })
        .range(from, to)
        .returns<GymAdminRankingResultInput[]>(),
    );
    if (batch.error) return { data: null, error: batch.error };
    results.push(...(batch.data ?? []));
  }

  return { data: results, error: null };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase function is not configured" }, 500);
  }

  const token = getBearerToken(req);
  if (!token) return jsonResponse({ error: "Authentication required" }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);
  if (userError || !user) return jsonResponse({ error: "Authentication required" }, 401);

  const params = new URL(req.url).searchParams;
  const league = params.get("league") as GymAdminRankingLeague | null;
  const gender = params.get("gender") as GymAdminRankingGender | null;
  const age = params.get("age") as GymAdminRankingAge | null;
  if ((league !== "toprope" && league !== "lead") || (gender !== "m" && gender !== "w")) {
    return jsonResponse({ error: "Ungültige Ranglistenfilter." }, 400);
  }
  if (age !== "U15" && age !== "UE15" && age !== "UE40") {
    return jsonResponse({ error: "Ungültige Wertungsklasse." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const profileResult = await supabase
    .from("profiles")
    .select("id, role, archived_at")
    .eq("id", user.id)
    .maybeSingle<AdminProfileRow>();

  if (profileResult.error) {
    console.error("get-gym-admin-rankings authorization error:", profileResult.error);
    return jsonResponse({ error: "Berechtigung konnte nicht geprüft werden." }, 500);
  }
  if (!profileResult.data || profileResult.data.role !== "gym_admin" || profileResult.data.archived_at) {
    return jsonResponse({ error: "Kein Hallen-Admin-Zugriff." }, 403);
  }

  const [profilesResult, routesResult, settingsResult] = await Promise.all([
    listAll<GymAdminRankingProfileInput>((from, to) =>
      supabase
        .from("profiles")
        .select("id, email, first_name, last_name, birth_date, gender, league, role, participation_activated_at, archived_at")
        .is("archived_at", null)
        .order("id", { ascending: true })
        .range(from, to)
        .returns<GymAdminRankingProfileInput[]>(),
    ),
    listAll<GymAdminRankingRouteInput>((from, to) =>
      supabase
        .from("routes")
        .select("id, discipline")
        .order("id", { ascending: true })
        .range(from, to)
        .returns<GymAdminRankingRouteInput[]>(),
    ),
    supabase
      .from("admin_settings")
      .select("qualification_start, qualification_end, age_cutoff_date, age_u16_max, age_u40_min")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<GymAdminRankingSettingsInput>(),
  ]);

  const sourceError = profilesResult.error ?? routesResult.error ?? settingsResult.error;
  if (sourceError) {
    console.error("get-gym-admin-rankings source error:", sourceError);
    return jsonResponse({ error: "Rangliste konnte nicht geladen werden." }, 500);
  }
  const profiles = profilesResult.data ?? [];
  const settings = settingsResult.data ?? {
    qualification_start: null,
    qualification_end: null,
    age_cutoff_date: null,
    age_u16_max: null,
    age_u40_min: null,
  };
  const rankingProfiles = filterGymAdminRankingProfiles({
    profiles,
    league,
    gender,
    age,
    settings,
  });
  const resultsResult = await listAllResults(
    supabase,
    rankingProfiles.map((profile) => profile.id),
  );
  if (resultsResult.error) {
    console.error("get-gym-admin-rankings results error:", resultsResult.error);
    return jsonResponse({ error: "Rangliste konnte nicht geladen werden." }, 500);
  }

  const data = buildGymAdminRankings({
    league,
    gender,
    age,
    profiles: rankingProfiles,
    routes: routesResult.data ?? [],
    results: resultsResult.data ?? [],
    settings,
  });
  return jsonResponse({ data });
});
