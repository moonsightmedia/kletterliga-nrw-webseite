import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createServiceRoleClient } from "../_shared/adminAuth.ts";

type Payload = {
  token: string;
  password: string;
};

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

  try {
    let payload: Payload;
    try {
      const body = await req.json();
      payload = typeof body === "object" && body !== null ? body : {} as Payload;
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid or missing JSON body", details: String(parseError) }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { token, password } = payload;

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: "Fehlende Pflichtfelder: Token und Passwort sind erforderlich." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Das Passwort muss mindestens 6 Zeichen lang sein." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: invite, error: inviteError } = await supabase
      .from("gym_invites")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .is("revoked_at", null)
      .single();

    if (inviteError || !invite) {
      console.error("Invalid invite token:", inviteError);
      return new Response(
        JSON.stringify({ error: "Ungueltiger oder abgelaufener Einladungslink" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: "Der Einladungslink ist abgelaufen" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (!invite.gym_id) {
      return new Response(
        JSON.stringify({ error: "Die Einladung ist keiner Halle zugeordnet." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { data: gymRow, error: gymError } = await supabase
      .from("gyms")
      .select("*")
      .eq("id", invite.gym_id)
      .maybeSingle();

    if (gymError || !gymRow) {
      console.error("Failed to load gym for invite:", gymError);
      return new Response(
        JSON.stringify({ error: "Die Halle zur Einladung wurde nicht gefunden." }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (gymRow.archived_at) {
      return new Response(
        JSON.stringify({ error: "Die zugehoerige Halle ist archiviert." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: mappings, error: mappingLookupError } = await supabase
      .from("gym_admins")
      .select("profile_id")
      .eq("gym_id", invite.gym_id);

    if (mappingLookupError) {
      console.error("Failed to inspect existing gym admins:", mappingLookupError);
      return new Response(
        JSON.stringify({ error: "Bestehende Hallenzugaenge konnten nicht geprueft werden." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const mappingProfileIds = (mappings ?? [])
      .map((mapping) => mapping.profile_id)
      .filter((profileId): profileId is string => typeof profileId === "string");

    if (mappingProfileIds.length > 0) {
      const { data: activeProfiles, error: profileLookupError } = await supabase
        .from("profiles")
        .select("id")
        .in("id", mappingProfileIds)
        .is("archived_at", null);

      if (profileLookupError) {
        console.error("Failed to inspect mapped profiles:", profileLookupError);
        return new Response(
          JSON.stringify({ error: "Bestehende Hallenzugaenge konnten nicht geprueft werden." }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      if ((activeProfiles ?? []).length > 0) {
        return new Response(
          JSON.stringify({ error: "Fuer diese Halle ist bereits ein Hallenzugang aktiv." }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
    }

    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
    });

    if (userError || !userData?.user) {
      console.error("Failed to create user:", userError);
      const message = userError?.message ?? "";
      const loweredMessage = message.toLowerCase();
      const status = loweredMessage.includes("already") || loweredMessage.includes("exist") ? 409 : 500;
      const resolvedMessage = status === 409
        ? "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits."
        : (message || "Fehler beim Erstellen des Benutzers.");
      return new Response(
        JSON.stringify({ error: resolvedMessage }),
        { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      email: invite.email,
      role: "gym_admin",
    });

    if (profileError) {
      console.error("Failed to create profile:", profileError);
      await supabase.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: "Fehler beim Anlegen des Profils. Bitte versuche es erneut." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { error: mappingError } = await supabase.from("gym_admins").insert({
      profile_id: userData.user.id,
      gym_id: invite.gym_id,
    });

    if (mappingError) {
      console.error("Failed to create gym_admin mapping:", mappingError);
      await supabase.auth.admin.deleteUser(userData.user.id);
      await supabase.from("profiles").delete().eq("id", userData.user.id);
      return new Response(
        JSON.stringify({ error: "Fehler beim Zuordnen der Halle. Bitte versuche es erneut." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { error: consumeInviteError } = await supabase
      .from("gym_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (consumeInviteError) {
      console.error("Failed to mark invite as used:", consumeInviteError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        gym: gymRow,
        user_id: userData.user.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
