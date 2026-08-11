import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import {
  buildGymRouteHighlights,
  type ResultStatsInput,
  type RouteStatsInput,
} from "./stats.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 1000;
const ROUTE_ID_BATCH_SIZE = 150;

type GymRow = {
  id: string;
};

type ProfileIdRow = {
  id: string;
};

type ResultRow = ResultStatsInput & {
  id: string;
};

type ServiceClient = ReturnType<typeof createClient>;

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

const listAllParticipantIds = async (
  supabase: ServiceClient,
): Promise<{ data: string[] | null; error: { message: string } | null }> => {
  const participantIds: string[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const pageResult = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "participant")
      .is("archived_at", null)
      .order("id", { ascending: true })
      .range(from, to)
      .returns<ProfileIdRow[]>();

    if (pageResult.error) {
      return { data: null, error: pageResult.error };
    }

    const page = pageResult.data ?? [];
    participantIds.push(...page.map((profile) => profile.id));

    if (page.length < PAGE_SIZE) break;
  }

  return { data: participantIds, error: null };
};

const listAllResultsForRoutes = async (
  supabase: ServiceClient,
  routeIds: string[],
): Promise<{ data: ResultStatsInput[] | null; error: { message: string } | null }> => {
  if (routeIds.length === 0) {
    return { data: [], error: null };
  }

  const results: ResultStatsInput[] = [];

  for (let batchStart = 0; batchStart < routeIds.length; batchStart += ROUTE_ID_BATCH_SIZE) {
    const routeIdBatch = routeIds.slice(batchStart, batchStart + ROUTE_ID_BATCH_SIZE);

    for (let from = 0; ; from += PAGE_SIZE) {
      const to = from + PAGE_SIZE - 1;
      const pageResult = await supabase
        .from("results")
        .select("id, profile_id, route_id, rating")
        .in("route_id", routeIdBatch)
        .order("id", { ascending: true })
        .range(from, to)
        .returns<ResultRow[]>();

      if (pageResult.error) {
        return { data: null, error: pageResult.error };
      }

      const page = pageResult.data ?? [];
      results.push(
        ...page.map(({ profile_id, route_id, rating }) => ({
          profile_id,
          route_id,
          rating,
        })),
      );

      if (page.length < PAGE_SIZE) break;
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

  const gymId = new URL(req.url).searchParams.get("gym_id")?.trim() ?? "";
  if (!UUID_PATTERN.test(gymId)) {
    return jsonResponse({ error: "Eine gültige Hallen-ID ist erforderlich." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const gymResult = await supabase
    .from("gyms")
    .select("id")
    .eq("id", gymId)
    .is("archived_at", null)
    .maybeSingle<GymRow>();

  if (gymResult.error) {
    console.error("get-gym-route-highlights gym error:", gymResult.error);
    return jsonResponse({ error: "Routenstatistik konnte nicht geladen werden." }, 500);
  }

  if (!gymResult.data) {
    return jsonResponse({ error: "Halle nicht gefunden." }, 404);
  }

  const [routesResult, participantIdsResult] = await Promise.all([
    supabase.from("routes").select("id, gym_id, active").eq("gym_id", gymId).returns<RouteStatsInput[]>(),
    listAllParticipantIds(supabase),
  ]);

  const firstError = routesResult.error ?? participantIdsResult.error;
  if (firstError) {
    console.error("get-gym-route-highlights source error:", firstError);
    return jsonResponse({ error: "Routenstatistik konnte nicht geladen werden." }, 500);
  }

  const activeRoutes = (routesResult.data ?? []).filter((route) => route.active !== false);
  const resultsResult = await listAllResultsForRoutes(
    supabase,
    activeRoutes.map((route) => route.id),
  );

  if (resultsResult.error) {
    console.error("get-gym-route-highlights results error:", resultsResult.error);
    return jsonResponse({ error: "Routenstatistik konnte nicht geladen werden." }, 500);
  }

  return jsonResponse(
    buildGymRouteHighlights({
      gymId,
      participantIds: participantIdsResult.data ?? [],
      routes: activeRoutes,
      results: resultsResult.data ?? [],
    }),
  );
});
