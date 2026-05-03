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

const buildAmbiguousCodeVariants = (code: string) => {
  const variants = new Set([code]);
  const chars = Array.from(code);

  chars.forEach((char, index) => {
    if (char !== "O" && char !== "0") return;

    Array.from(variants).forEach((variant) => {
      const nextChars = Array.from(variant);
      nextChars[index] = char === "O" ? "0" : "O";
      variants.add(nextChars.join(""));
    });
  });

  return Array.from(variants);
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

    if (profile.participation_activated_at) {
      return new Response(JSON.stringify({ error: "Deine Teilnahme ist bereits aktiviert." }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: exactMasterCode, error: codeError } = await supabase
      .from("master_codes")
      .select("id, redeemed_by, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (codeError) {
      return new Response(JSON.stringify({ error: "Mastercode konnte nicht geprüft werden." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let masterCode = exactMasterCode;

    if (!masterCode) {
      const variants = buildAmbiguousCodeVariants(code);
      const { data: variantMatches, error: variantError } = await supabase
        .from("master_codes")
        .select("id, redeemed_by, expires_at")
        .in("code", variants);

      if (variantError) {
        return new Response(JSON.stringify({ error: "Mastercode konnte nicht geprüft werden." }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if ((variantMatches ?? []).length === 1) {
        masterCode = variantMatches![0];
      }
    }

    if (!masterCode) {
      return new Response(JSON.stringify({ error: "Dieser Mastercode wurde nicht gefunden." }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (masterCode.redeemed_by) {
      return new Response(JSON.stringify({ error: "Dieser Code wurde schon verwendet." }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (masterCode.expires_at && new Date(masterCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Dieser Code ist nicht mehr gültig." }), {
        status: 410,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("master_codes")
      .update({
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString(),
        status: "redeemed",
      })
      .eq("id", masterCode.id)
      .is("redeemed_by", null)
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      return new Response(JSON.stringify({ error: "Mastercode konnte nicht eingelöst werden." }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ participation_activated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (profileUpdateError) {
      return new Response(
        JSON.stringify({
          error:
            "Mastercode wurde eingelöst, aber dein Profil konnte nicht aktiviert werden. Bitte kontaktiere den Support.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
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
