import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type GymCommunityStats = {
  gym_id: string;
  visitor_count: number;
  average_points_per_route: number | null;
};

type ProfileRow = {
  id: string;
  role: string | null;
  archived_at: string | null;
};

type GymRow = {
  id: string;
  archived_at: string | null;
};

type RouteRow = {
  id: string;
  gym_id: string;
  active: boolean | null;
};

type ResultRow = {
  profile_id: string;
  route_id: string;
  points: number | null;
  flash: boolean | null;
};

type RedemptionRow = {
  gym_id: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase service role is not configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const [gymsResult, profilesResult, routesResult, resultsResult, gymCodesResult, masterCodesResult] =
    await Promise.all([
      supabase.from("gyms").select("id, archived_at").is("archived_at", null).returns<GymRow[]>(),
      supabase.from("profiles").select("id, role, archived_at").returns<ProfileRow[]>(),
      supabase.from("routes").select("id, gym_id, active").returns<RouteRow[]>(),
      supabase.from("results").select("profile_id, route_id, points, flash").returns<ResultRow[]>(),
      supabase
        .from("gym_codes")
        .select("gym_id, redeemed_by, redeemed_at")
        .not("redeemed_at", "is", null)
        .returns<RedemptionRow[]>(),
      supabase
        .from("master_codes")
        .select("gym_id, redeemed_by, redeemed_at")
        .not("redeemed_at", "is", null)
        .returns<RedemptionRow[]>(),
    ]);

  const firstError =
    gymsResult.error ??
    profilesResult.error ??
    routesResult.error ??
    resultsResult.error ??
    gymCodesResult.error ??
    masterCodesResult.error;

  if (firstError) {
    console.error("get-gym-community-stats error:", firstError);
    return jsonResponse({ error: "Hallenstatistiken konnten nicht geladen werden." }, 500);
  }

  const activeGymIds = new Set((gymsResult.data ?? []).map((gym) => gym.id));
  const participantIds = new Set(
    (profilesResult.data ?? [])
      .filter((profile) => profile.role === "participant" && !profile.archived_at)
      .map((profile) => profile.id),
  );
  const activeRoutes = new Map(
    (routesResult.data ?? [])
      .filter((route) => route.active !== false && activeGymIds.has(route.gym_id))
      .map((route) => [route.id, route]),
  );

  const visitorIdsByGym = new Map<string, Set<string>>();
  [...(gymCodesResult.data ?? []), ...(masterCodesResult.data ?? [])].forEach((redemption) => {
    if (!redemption.gym_id || !redemption.redeemed_by) return;
    if (!activeGymIds.has(redemption.gym_id) || !participantIds.has(redemption.redeemed_by)) return;

    const visitors = visitorIdsByGym.get(redemption.gym_id) ?? new Set<string>();
    visitors.add(redemption.redeemed_by);
    visitorIdsByGym.set(redemption.gym_id, visitors);
  });

  const resultTotalsByGym = new Map<string, { total: number; count: number }>();
  (resultsResult.data ?? []).forEach((result) => {
    if (!participantIds.has(result.profile_id)) return;
    const route = activeRoutes.get(result.route_id);
    if (!route) return;

    const current = resultTotalsByGym.get(route.gym_id) ?? { total: 0, count: 0 };
    current.total += (result.points ?? 0) + (result.flash ? 1 : 0);
    current.count += 1;
    resultTotalsByGym.set(route.gym_id, current);
  });

  const stats: GymCommunityStats[] = Array.from(activeGymIds).map((gymId) => {
    const resultTotals = resultTotalsByGym.get(gymId);
    return {
      gym_id: gymId,
      visitor_count: visitorIdsByGym.get(gymId)?.size ?? 0,
      average_points_per_route:
        resultTotals && resultTotals.count > 0 ? resultTotals.total / resultTotals.count : null,
    };
  });

  return jsonResponse(stats);
});
