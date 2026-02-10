import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
  gym: {
    name: string;
    city?: string | null;
    postal_code?: string | null;
    address?: string | null;
    website?: string | null;
    logo_url?: string | null;
  };
  admin: {
    email: string;
    password: string;
  };
};

function toGermanError(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("already") && (m.includes("registered") || m.includes("exist"))) return "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.";
  if (m.includes("password") && (m.includes("6") || m.includes("least"))) return "Das Passwort muss mindestens 6 Zeichen lang sein.";
  if (m.includes("invalid") && m.includes("email")) return "Bitte gib eine gültige E-Mail-Adresse ein.";
  if (m.includes("duplicate") || m.includes("unique")) return "Diese E-Mail oder Halle existiert bereits.";
  return msg;
}

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
  try {
    const payload = (await req.json()) as Payload;
    const { gym, admin } = payload;

    const plz = gym?.postal_code != null ? String(gym.postal_code).trim() : "";
    if (!gym?.name?.trim() || !plz || !admin?.email?.trim() || !admin?.password) {
      return new Response(
        JSON.stringify({ error: "Fehlende Pflichtfelder: Hallenname, PLZ, E-Mail und Passwort sind erforderlich." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (admin.password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Das Passwort muss mindestens 6 Zeichen lang sein." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: gymRow, error: gymError } = await supabase
      .from("gyms")
      .insert({
        name: gym.name.trim(),
        city: gym.city ? String(gym.city).trim() || null : null,
        postal_code: plz || null,
        address: gym.address ? String(gym.address).trim() || null : null,
        website: gym.website ? String(gym.website).trim() || null : null,
        logo_url: gym.logo_url ? String(gym.logo_url).trim() || null : null,
      })
      .select("*")
      .single();

    if (gymError || !gymRow) {
      return new Response(
        JSON.stringify({ error: gymError?.message ?? "Fehler beim Anlegen der Halle." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: admin.email.trim(),
      password: admin.password,
      email_confirm: true,
      user_metadata: { role: "gym_admin" },
    });

    if (userError || !userData?.user) {
      await supabase.from("gyms").delete().eq("id", gymRow.id);
      return new Response(
        JSON.stringify({ error: toGermanError(userError?.message ?? "Fehler beim Anlegen des Benutzers.") }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      email: admin.email.trim(),
      role: "gym_admin",
    });

    if (profileError) {
      await supabase.from("gyms").delete().eq("id", gymRow.id);
      await supabase.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: "Fehler beim Anlegen des Profils. Bitte versuche es erneut." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: mappingError } = await supabase.from("gym_admins").insert({
      profile_id: userData.user.id,
      gym_id: gymRow.id,
    });

    if (mappingError) {
      await supabase.from("gyms").delete().eq("id", gymRow.id);
      await supabase.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: "Fehler beim Zuordnen der Halle. Bitte versuche es erneut." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ gym: gymRow, user_id: userData.user.id }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
