import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
  token: string;
  password: string;
  gym: {
    name: string;
    city?: string | null;
    address?: string | null;
    website?: string | null;
    logo_url?: string | null;
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
    const payload = (await req.json()) as Payload;
    const { token, password, gym } = payload;

    if (!token || !password || !gym?.name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: token, password, and gym name" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
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
      return new Response(
        JSON.stringify({ error: "Invalid or expired invite token" }),
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
      return new Response(
        JSON.stringify({ error: "Invite token has expired" }),
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
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create gym
    const { data: gymRow, error: gymError } = await supabase
      .from("gyms")
      .insert({
        name: gym.name,
        city: gym.city ?? null,
        address: gym.address ?? null,
        website: gym.website ?? null,
        logo_url: gym.logo_url ?? null,
      })
      .select("*")
      .single();

    if (gymError || !gymRow) {
      return new Response(
        JSON.stringify({ error: gymError?.message ?? "Failed to create gym" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
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
      // Rollback: delete gym if user creation fails
      await supabase.from("gyms").delete().eq("id", gymRow.id);
      return new Response(
        JSON.stringify({ error: userError?.message ?? "Failed to create user" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      email: invite.email,
      role: "gym_admin",
    });

    if (profileError) {
      // Rollback: delete gym and user
      await supabase.from("gyms").delete().eq("id", gymRow.id);
      await supabase.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create gym_admin mapping
    const { error: mappingError } = await supabase.from("gym_admins").insert({
      profile_id: userData.user.id,
      gym_id: gymRow.id,
    });

    if (mappingError) {
      // Rollback: delete gym, user, and profile
      await supabase.from("gyms").delete().eq("id", gymRow.id);
      await supabase.auth.admin.deleteUser(userData.user.id);
      await supabase.from("profiles").delete().eq("id", userData.user.id);
      return new Response(
        JSON.stringify({ error: mappingError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark invite as used
    await supabase
      .from("gym_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({
        success: true,
        gym: gymRow,
        user_id: userData.user.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
