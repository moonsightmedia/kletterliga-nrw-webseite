import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
  token: string;
  password: string;
  gym: {
    name: string;
    city?: string | null;
    postal_code?: string | null;
    address?: string | null;
    website?: string | null;
    logo_url?: string | null;
    logo_base64?: string | null;
  };
};

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
    // Parse request body
    let payload: Payload;
    try {
      const body = await req.json();
      payload = typeof body === "object" && body !== null ? body : {};
      console.log("Parsed payload:", { token: payload.token ? "***" : undefined, gym: payload.gym?.name });
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid or missing JSON body", details: String(parseError) }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { token, password, gym } = payload;

    const plz = gym?.postal_code != null ? String(gym.postal_code).trim() : "";
    if (!token || !password || !gym?.name?.trim()) {
      return new Response(
        JSON.stringify({ error: "Fehlende Pflichtfelder: Passwort und Hallenname sind erforderlich." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (!plz) {
      return new Response(
        JSON.stringify({ error: "Bitte gib die Postleitzahl (PLZ) der Halle ein." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate token
    const { data: invite, error: inviteError } = await supabase
      .from("gym_invites")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (inviteError || !invite) {
      console.error("Invalid invite token:", inviteError);
      return new Response(
        JSON.stringify({ error: "Ungültiger oder abgelaufener Einladungslink" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      console.error("Invite token expired:", { now, expiresAt });
      return new Response(
        JSON.stringify({ error: "Der Einladungslink ist abgelaufen" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if email already has a user account
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some((u) => u.email === invite.email);

    if (userExists) {
      console.error("User already exists:", invite.email);
      return new Response(
        JSON.stringify({ error: "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create gym (without logo first, we'll update it after upload)
    const { data: gymRow, error: gymError } = await supabase
      .from("gyms")
      .insert({
        name: gym.name.trim(),
        city: gym.city ? String(gym.city).trim() || null : null,
        postal_code: plz || null,
        address: gym.address ? String(gym.address).trim() || null : null,
        website: gym.website ? String(gym.website).trim() || null : null,
        logo_url: gym.logo_url ?? null,
      })
      .select("*")
      .single();

    if (gymError || !gymRow) {
      console.error("Failed to create gym:", gymError);
      return new Response(
        JSON.stringify({ error: gymError?.message ?? "Fehler beim Erstellen der Halle. Bitte prüfe die Angaben." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create auth user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: "gym_admin",
      },
    });

    if (userError || !userData?.user) {
      console.error("Failed to create user:", userError);
      await supabase.from("gyms").delete().eq("id", gymRow.id);
      const err = (userError?.message ?? "").toLowerCase();
      const msg = err.includes("already") || err.includes("exist") ? "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits." : (userError?.message ?? "Fehler beim Erstellen des Benutzers.");
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Create profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      email: invite.email,
      role: "gym_admin",
    });

    if (profileError) {
      console.error("Failed to create profile:", profileError);
      await supabase.from("gyms").delete().eq("id", gymRow.id);
      await supabase.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: "Fehler beim Anlegen des Profils. Bitte versuche es erneut." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create gym_admin mapping
    const { error: mappingError } = await supabase.from("gym_admins").insert({
      profile_id: userData.user.id,
      gym_id: gymRow.id,
    });

    if (mappingError) {
      console.error("Failed to create gym_admin mapping:", mappingError);
      await supabase.from("gyms").delete().eq("id", gymRow.id);
      await supabase.auth.admin.deleteUser(userData.user.id);
      await supabase.from("profiles").delete().eq("id", userData.user.id);
      return new Response(
        JSON.stringify({ error: "Fehler beim Zuordnen der Halle. Bitte versuche es erneut." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Upload logo if provided as base64
    let finalLogoUrl = gym.logo_url;
    if (gym.logo_base64) {
      try {
        // Convert base64 to blob
        const base64Data = gym.logo_base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Determine file type
        const isPng = gym.logo_base64.startsWith("data:image/png");
        const extension = isPng ? "png" : "jpg";
        const contentType = isPng ? "image/png" : "image/jpeg";
        const filePath = `gyms/${gymRow.id}/${Date.now()}.${extension}`;
        
        // Upload to storage using service role (no auth needed)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, bytes, {
            contentType,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Logo upload failed:", uploadError);
          // Continue without logo - don't fail the registration
        } else {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
          finalLogoUrl = urlData.publicUrl;
          
          // Update gym with logo URL
          await supabase
            .from("gyms")
            .update({ logo_url: finalLogoUrl })
            .eq("id", gymRow.id);
        }
      } catch (logoError) {
        console.error("Logo processing error:", logoError);
        // Continue without logo - don't fail the registration
      }
    }

    // Mark invite as used
    await supabase
      .from("gym_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    // Fetch updated gym with logo URL
    const { data: updatedGym } = await supabase
      .from("gyms")
      .select("*")
      .eq("id", gymRow.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        gym: updatedGym || gymRow,
        user_id: userData.user.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
