import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import {
  buildGymAdminResults,
  InvalidGymAdminResultsCursorError,
  type GymAdminParticipantInput,
  type GymAdminResultInput,
  type GymAdminRouteInput,
} from "./stats.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_PAGE_SIZE = 1000;
const ROUTE_ID_BATCH_SIZE = 150;
const DEFAULT_RESPONSE_PAGE_SIZE = 100;

type AdminProfileRow = {
  id: string;
  role: string | null;
  archived_at: string | null;
};

type GymAdminMappingRow = {
  id: string;
};

type GymRow = {
  id: string;
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

const parsePageSize = (value: string | null) => {
  if (value === null) return DEFAULT_RESPONSE_PAGE_SIZE;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : null;
};

const listAllGymRoutes = async (
  supabase: ServiceClient,
  gymId: string,
): Promise<{ data: GymAdminRouteInput[] | null; error: { message: string } | null }> => {
  const routes: GymAdminRouteInput[] = [];

  for (let from = 0; ; from += SOURCE_PAGE_SIZE) {
    const to = from + SOURCE_PAGE_SIZE - 1;
    const pageResult = await supabase
      .from("routes")
      .select("id, gym_id")
      .eq("gym_id", gymId)
      .order("id", { ascending: true })
      .range(from, to)
      .returns<GymAdminRouteInput[]>();

    if (pageResult.error) return { data: null, error: pageResult.error };

    const page = pageResult.data ?? [];
    routes.push(...page);
    if (page.length < SOURCE_PAGE_SIZE) break;
  }

  return { data: routes, error: null };
};

const listAllActiveParticipants = async (
  supabase: ServiceClient,
): Promise<{ data: GymAdminParticipantInput[] | null; error: { message: string } | null }> => {
  const participants: GymAdminParticipantInput[] = [];

  for (let from = 0; ; from += SOURCE_PAGE_SIZE) {
    const to = from + SOURCE_PAGE_SIZE - 1;
    const pageResult = await supabase
      .from("profiles")
      .select("id, role, archived_at")
      .eq("role", "participant")
      .is("archived_at", null)
      .order("id", { ascending: true })
      .range(from, to)
      .returns<GymAdminParticipantInput[]>();

    if (pageResult.error) return { data: null, error: pageResult.error };

    const page = pageResult.data ?? [];
    participants.push(...page);
    if (page.length < SOURCE_PAGE_SIZE) break;
  }

  return { data: participants, error: null };
};

const listAllResultsForRoutes = async (
  supabase: ServiceClient,
  routeIds: string[],
): Promise<{ data: GymAdminResultInput[] | null; error: { message: string } | null }> => {
  if (routeIds.length === 0) return { data: [], error: null };

  const results: GymAdminResultInput[] = [];

  for (let batchStart = 0; batchStart < routeIds.length; batchStart += ROUTE_ID_BATCH_SIZE) {
    const routeIdBatch = routeIds.slice(batchStart, batchStart + ROUTE_ID_BATCH_SIZE);

    for (let from = 0; ; from += SOURCE_PAGE_SIZE) {
      const to = from + SOURCE_PAGE_SIZE - 1;
      const pageResult = await supabase
        .from("results")
        .select("id, profile_id, route_id, points, flash, status, rating, created_at, updated_at")
        .in("route_id", routeIdBatch)
        .order("id", { ascending: true })
        .range(from, to)
        .returns<GymAdminResultInput[]>();

      if (pageResult.error) return { data: null, error: pageResult.error };

      const page = pageResult.data ?? [];
      results.push(...page);
      if (page.length < SOURCE_PAGE_SIZE) break;
    }
  }

  return { data: results, error: null };
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
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const searchParams = new URL(req.url).searchParams;
  const gymId = searchParams.get("gym_id")?.trim() ?? "";
  if (!UUID_PATTERN.test(gymId)) {
    return jsonResponse({ error: "Eine gültige Hallen-ID ist erforderlich." }, 400);
  }

  const pageSize = parsePageSize(searchParams.get("limit"));
  if (pageSize === null) {
    return jsonResponse({ error: "Limit muss zwischen 1 und 100 liegen." }, 400);
  }

  const cursor = searchParams.get("cursor")?.trim() || null;
  if (
    cursor &&
    (cursor.length > 1024 || !/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cursor))
  ) {
    return jsonResponse({ error: "Der Ergebnis-Cursor ist ungültig." }, 400);
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
    console.error("get-gym-admin-results profile authorization error:", profileResult.error);
    return jsonResponse({ error: "Berechtigung konnte nicht geprüft werden." }, 500);
  }

  if (
    !profileResult.data ||
    profileResult.data.role !== "gym_admin" ||
    profileResult.data.archived_at
  ) {
    return jsonResponse({ error: "Kein Hallen-Admin-Zugriff." }, 403);
  }

  // This exact assignment check must remain before every route/result query.
  const mappingResult = await supabase
    .from("gym_admins")
    .select("id")
    .eq("profile_id", user.id)
    .eq("gym_id", gymId)
    .limit(1)
    .returns<GymAdminMappingRow[]>();

  if (mappingResult.error) {
    console.error("get-gym-admin-results mapping authorization error:", mappingResult.error);
    return jsonResponse({ error: "Berechtigung konnte nicht geprüft werden." }, 500);
  }

  if (!mappingResult.data?.[0]) {
    return jsonResponse({ error: "Kein Zugriff auf diese Halle." }, 403);
  }

  const gymResult = await supabase
    .from("gyms")
    .select("id")
    .eq("id", gymId)
    .is("archived_at", null)
    .maybeSingle<GymRow>();

  if (gymResult.error) {
    console.error("get-gym-admin-results gym authorization error:", gymResult.error);
    return jsonResponse({ error: "Halle konnte nicht geprüft werden." }, 500);
  }

  if (!gymResult.data) {
    return jsonResponse({ error: "Halle nicht gefunden." }, 404);
  }

  const [routesResult, participantsResult] = await Promise.all([
    listAllGymRoutes(supabase, gymId),
    listAllActiveParticipants(supabase),
  ]);
  const sourceError = routesResult.error ?? participantsResult.error;

  if (sourceError) {
    console.error("get-gym-admin-results source query error:", sourceError);
    return jsonResponse({ error: "Hallenergebnisse konnten nicht geladen werden." }, 500);
  }

  const routes = routesResult.data ?? [];
  const resultsResult = await listAllResultsForRoutes(
    supabase,
    routes.map((route) => route.id),
  );

  if (resultsResult.error) {
    console.error("get-gym-admin-results results query error:", resultsResult.error);
    return jsonResponse({ error: "Hallenergebnisse konnten nicht geladen werden." }, 500);
  }

  try {
    return jsonResponse(
      await buildGymAdminResults({
        gymId,
        cursorSubject: user.id,
        cursorEncryptionKeyMaterial: serviceRoleKey,
        routes,
        participants: participantsResult.data ?? [],
        results: resultsResult.data ?? [],
        pageSize,
        cursor,
      }),
    );
  } catch (error) {
    if (error instanceof InvalidGymAdminResultsCursorError) {
      return jsonResponse({ error: error.message }, 400);
    }

    console.error("get-gym-admin-results aggregation error:", error);
    return jsonResponse({ error: "Hallenergebnisse konnten nicht geladen werden." }, 500);
  }
});
