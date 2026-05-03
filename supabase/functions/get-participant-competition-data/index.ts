import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  gender: "m" | "w" | null;
  home_gym_id: string | null;
  league: "toprope" | "lead" | null;
  role: string | null;
  participation_activated_at: string | null;
  archived_at: string | null;
};

type ResultRow = {
  id: string;
  profile_id: string;
  route_id: string;
  points: number;
  flash: boolean;
  created_at: string;
  updated_at: string | null;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const getBearerToken = (req: Request) => {
  const header = req.headers.get("Authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token ?? null : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase function is not configured" }, 500);
  }

  const token = getBearerToken(req);
  if (!token) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const [profilesResult, routesResult, gymsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, email, first_name, last_name, avatar_url, birth_date, gender, home_gym_id, league, role, participation_activated_at, archived_at",
      )
      .is("archived_at", null)
      .returns<ProfileRow[]>(),
    supabase
      .from("routes")
      .select("id, gym_id, discipline, code, name, setter, color, grade_range, active")
      .returns<unknown[]>(),
    supabase
      .from("gyms")
      .select("id, name, city, postal_code, address, website, logo_url, opening_hours, archived_at")
      .is("archived_at", null)
      .returns<unknown[]>(),
  ]);

  const firstError = profilesResult.error ?? routesResult.error ?? gymsResult.error;
  if (firstError) {
    console.error("get-participant-competition-data base query error:", firstError);
    return jsonResponse({ error: "Teilnehmerdaten konnten nicht geladen werden." }, 500);
  }

  const visibleProfiles = (profilesResult.data ?? []).filter((profile) => {
    if (profile.id === user.id) return true;
    if (profile.role === "gym_admin" || profile.role === "league_admin") return false;
    return Boolean(profile.participation_activated_at);
  });
  const visibleProfileIds = visibleProfiles.map((profile) => profile.id);

  const resultsResult =
    visibleProfileIds.length > 0
      ? await supabase
          .from("results")
          .select("id, profile_id, route_id, points, flash, created_at, updated_at")
          .in("profile_id", visibleProfileIds)
          .returns<ResultRow[]>()
      : { data: [] as ResultRow[], error: null };

  if (resultsResult.error) {
    console.error("get-participant-competition-data results query error:", resultsResult.error);
    return jsonResponse({ error: "Teilnehmerergebnisse konnten nicht geladen werden." }, 500);
  }

  return jsonResponse({
    profiles: visibleProfiles.map((profile) => ({
      ...profile,
      email: profile.id === user.id ? profile.email : null,
    })),
    results: (resultsResult.data ?? []).map((result) => ({
      ...result,
      status: null,
      rating: null,
      feedback: null,
    })),
    routes: routesResult.data ?? [],
    gyms: gymsResult.data ?? [],
  });
});
