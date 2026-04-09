import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!code) {
      return new Response(JSON.stringify({ error: "code is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("participation_activated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profil nicht gefunden." }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!profile.participation_activated_at) {
      return new Response(
        JSON.stringify({
          error: "Du musst zuerst deinen Mastercode einlösen, bevor du einen Hallencode aktivieren kannst.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { data: gymCode, error: codeError } = await supabase
      .from("gym_codes")
      .select("id, gym_id, redeemed_by, expires_at, gyms(name, archived_at)")
      .eq("code", code)
      .maybeSingle();

    if (codeError || !gymCode) {
      return new Response(JSON.stringify({ error: "Dieser Code wurde nicht gefunden." }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (gymCode.redeemed_by) {
      return new Response(JSON.stringify({ error: "Dieser Code wurde schon verwendet." }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (gymCode.expires_at && new Date(gymCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Dieser Code ist nicht mehr gültig." }), {
        status: 410,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const gymRelation =
      gymCode.gyms && typeof gymCode.gyms === "object"
        ? (gymCode.gyms as { name?: string | null; archived_at?: string | null })
        : null;

    if (gymRelation?.archived_at) {
      return new Response(JSON.stringify({ error: "Diese Halle ist derzeit nicht aktiv." }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("gym_codes")
      .update({
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString(),
        status: "redeemed",
      })
      .eq("id", gymCode.id)
      .is("redeemed_by", null)
      .select("gym_id, gyms(name)")
      .maybeSingle();

    if (updateError || !updated) {
      return new Response(JSON.stringify({ error: "Code konnte nicht eingelöst werden." }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const gymName =
      updated.gyms && typeof updated.gyms === "object" && "name" in updated.gyms
        ? (updated.gyms as { name: string | null }).name
        : null;

    return new Response(JSON.stringify({ success: true, gym_id: updated.gym_id, gym_name: gymName }), {
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
