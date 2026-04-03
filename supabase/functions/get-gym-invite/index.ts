import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createServiceRoleClient } from "../_shared/adminAuth.ts";

const supabase = createServiceRoleClient();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return new Response(JSON.stringify({ error: "token is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: invite, error } = await supabase
      .from("gym_invites")
      .select("email, expires_at, used_at, revoked_at, gym_id, gyms(name, archived_at)")
      .eq("token", token)
      .maybeSingle<{
        email: string;
        expires_at: string;
        used_at: string | null;
        revoked_at: string | null;
        gym_id: string | null;
        gyms: { name: string; archived_at: string | null } | null;
      }>();

    if (
      error ||
      !invite ||
      !invite.gym_id ||
      invite.revoked_at ||
      !invite.gyms?.name ||
      invite.gyms.archived_at
    ) {
      return new Response(JSON.stringify({ error: "Ungueltiger oder abgelaufener Einladungslink" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      email: invite.email,
      expires_at: invite.expires_at,
      used_at: invite.used_at,
      revoked_at: invite.revoked_at,
      gym_id: invite.gym_id,
      gym_name: invite.gyms.name,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
