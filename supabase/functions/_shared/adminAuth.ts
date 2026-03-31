import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

type CorsHeaders = Record<string, string>;

type AdminProfile = {
  id: string;
  role: string | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export function createServiceRoleClient() {
  return createClient(supabaseUrl, serviceRoleKey);
}

function jsonResponse(status: number, body: Record<string, unknown>, corsHeaders: CorsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export async function requireLeagueAdmin(
  req: Request,
  supabase: SupabaseClient,
  corsHeaders: CorsHeaders,
  actionDescription: string,
): Promise<Response | { user: User; profile: AdminProfile }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(401, { error: "Missing authorization header" }, corsHeaders);
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return jsonResponse(401, { error: "Invalid authorization" }, corsHeaders);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (profileError) {
    console.error("Failed to verify admin profile:", profileError);
    return jsonResponse(500, { error: "Failed to verify authorization" }, corsHeaders);
  }

  if (profile?.role !== "league_admin") {
    return jsonResponse(
      403,
      { error: `Unauthorized: Only league admins can ${actionDescription}` },
      corsHeaders,
    );
  }

  return { user, profile };
}
