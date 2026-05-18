import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createServiceRoleClient, requireLeagueAdmin } from "../_shared/adminAuth.ts";

type Payload = {
  requestId?: string;
};

type ChangeRequestRow = {
  id: string;
  profile_id: string;
  requested_league: string | null;
  requested_gender: string | null;
  status: string | null;
};

type ProfileRow = {
  id: string;
  gender: string | null;
  league: string | null;
};

const supabase = createServiceRoleClient();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authResult = await requireLeagueAdmin(req, supabase, corsHeaders, "approve change requests");
    if (authResult instanceof Response) {
      return authResult;
    }

    let payload: Payload;
    try {
      const body = await req.json();
      payload = typeof body === "object" && body !== null ? body : {};
    } catch {
      return jsonResponse(400, { error: "Invalid or missing JSON body" });
    }

    const requestId = payload.requestId?.trim();
    if (!requestId) {
      return jsonResponse(400, { error: "requestId is required" });
    }

    const { data: changeRequest, error: requestError } = await supabase
      .from("change_requests")
      .select("id, profile_id, requested_league, requested_gender, status")
      .eq("id", requestId)
      .maybeSingle<ChangeRequestRow>();

    if (requestError) {
      console.error("approve-change-request load request error:", requestError);
      return jsonResponse(500, { error: "Die Anfrage konnte nicht geladen werden." });
    }

    if (!changeRequest) {
      return jsonResponse(404, { error: "Anfrage nicht gefunden." });
    }

    if (!changeRequest.profile_id) {
      return jsonResponse(400, { error: "Anfrage hat kein Profil." });
    }

    const patch: Partial<ProfileRow> = {};
    if (changeRequest.requested_league === "lead" || changeRequest.requested_league === "toprope") {
      patch.league = changeRequest.requested_league;
    }
    if (changeRequest.requested_gender === "m" || changeRequest.requested_gender === "w") {
      patch.gender = changeRequest.requested_gender;
    }

    const { data: profileBefore, error: profileBeforeError } = await supabase
      .from("profiles")
      .select("id, gender, league")
      .eq("id", changeRequest.profile_id)
      .maybeSingle<ProfileRow>();

    if (profileBeforeError || !profileBefore) {
      console.error("approve-change-request load profile error:", profileBeforeError);
      return jsonResponse(500, { error: "Das Profil konnte nicht geladen werden." });
    }

    const { data: updatedProfile, error: profileUpdateError } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", changeRequest.profile_id)
      .select("*")
      .maybeSingle();

    if (profileUpdateError || !updatedProfile) {
      console.error("approve-change-request update profile error:", profileUpdateError);
      return jsonResponse(500, { error: "Das Profil konnte nicht aktualisiert werden." });
    }

    const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(changeRequest.profile_id);
    if (authUserError || !authUserData.user) {
      console.error("approve-change-request load auth user error:", authUserError);
      return jsonResponse(500, { error: "Das Auth-Konto konnte nicht geladen werden." });
    }

    const currentMetadata = authUserData.user.user_metadata ?? {};
    const nextMetadata = {
      ...currentMetadata,
      ...(patch.league ? { league: patch.league } : {}),
      ...(patch.gender ? { gender: patch.gender } : {}),
    };

    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(changeRequest.profile_id, {
      user_metadata: nextMetadata,
    });

    if (authUpdateError) {
      console.error("approve-change-request update auth metadata error:", authUpdateError);
      return jsonResponse(500, { error: "Die Auth-Metadaten konnten nicht aktualisiert werden." });
    }

    const { data: updatedRequest, error: requestUpdateError } = await supabase
      .from("change_requests")
      .update({ status: "approved" })
      .eq("id", requestId)
      .select("*")
      .maybeSingle();

    if (requestUpdateError || !updatedRequest) {
      console.error("approve-change-request update request error:", requestUpdateError);
      return jsonResponse(500, { error: "Der Anfrage-Status konnte nicht aktualisiert werden." });
    }

    return jsonResponse(200, {
      success: true,
      request: updatedRequest,
      profile: updatedProfile,
    });
  } catch (err) {
    console.error("approve-change-request error:", err);
    return jsonResponse(500, { error: (err as Error).message });
  }
});
