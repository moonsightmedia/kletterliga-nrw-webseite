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

const PARTNER_SLUG = "kletterladen_nrw";
const staticQrValue = Deno.env.get("PARTNER_KLETTERLADEN_QR_VALUE")?.trim();

if (!staticQrValue) {
  throw new Error("Missing PARTNER_KLETTERLADEN_QR_VALUE");
}

type RedeemStatus = "redeemed_now" | "already_redeemed" | "not_eligible";

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });

const normalizeSeasonYear = (seasonYear: string | null | undefined) => {
  const normalized = typeof seasonYear === "string" ? seasonYear.trim() : "";
  if (normalized) {
    return normalized;
  }
  return String(new Date().getFullYear());
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return jsonResponse({ error: "Missing authorization token" }, 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Invalid authorization" }, 401);
    }

    const body = await req.json().catch(() => null);
    const partnerSlug = typeof body?.partnerSlug === "string" ? body.partnerSlug.trim() : "";
    const qrCodeValue = typeof body?.qrCodeValue === "string" ? body.qrCodeValue.trim() : "";
    const scanSource = typeof body?.scanSource === "string" ? body.scanSource.trim() : null;

    if (!partnerSlug || partnerSlug !== PARTNER_SLUG) {
      return jsonResponse({ error: "Unbekannter Gutscheinpartner." }, 400);
    }

    if (!qrCodeValue) {
      return jsonResponse({ error: "qrCodeValue is required" }, 400);
    }

    if (qrCodeValue !== staticQrValue) {
      return jsonResponse({ error: "Der Gutschein-QR-Code ist ungültig." }, 400);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, participation_activated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return jsonResponse({ error: "Profil nicht gefunden." }, 404);
    }

    if (!profile.participation_activated_at) {
      return jsonResponse(
        {
          status: "not_eligible" satisfies RedeemStatus,
          error: "Du musst zuerst deinen Mastercode einlösen.",
        },
        403,
      );
    }

    const { data: adminSettings } = await supabase
      .from("admin_settings")
      .select("season_year")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ season_year: string | null }>();

    const seasonYear = normalizeSeasonYear(adminSettings?.season_year);

    const { data: existingRedemption, error: existingError } = await supabase
      .from("partner_voucher_redemptions")
      .select("redeemed_at")
      .eq("profile_id", user.id)
      .eq("partner_slug", PARTNER_SLUG)
      .eq("season_year", seasonYear)
      .maybeSingle<{ redeemed_at: string }>();

    if (existingError) {
      return jsonResponse({ error: "Gutscheinstatus konnte nicht geprüft werden." }, 500);
    }

    if (existingRedemption) {
      return jsonResponse({
        success: true,
        status: "already_redeemed" satisfies RedeemStatus,
        redeemed_at: existingRedemption.redeemed_at,
        season_year: seasonYear,
        partner_slug: PARTNER_SLUG,
      });
    }

    const nowIso = new Date().toISOString();
    const { error: insertError } = await supabase.from("partner_voucher_redemptions").insert({
      profile_id: user.id,
      partner_slug: PARTNER_SLUG,
      season_year: seasonYear,
      redeemed_at: nowIso,
      scan_source: scanSource,
    });

    if (insertError) {
      if ((insertError as { code?: string }).code === "23505") {
        return jsonResponse({
          success: true,
          status: "already_redeemed" satisfies RedeemStatus,
          season_year: seasonYear,
          partner_slug: PARTNER_SLUG,
        });
      }

      return jsonResponse({ error: "Gutschein konnte nicht eingelöst werden." }, 500);
    }

    return jsonResponse({
      success: true,
      status: "redeemed_now" satisfies RedeemStatus,
      redeemed_at: nowIso,
      season_year: seasonYear,
      partner_slug: PARTNER_SLUG,
    });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
