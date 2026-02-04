import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
  gym: {
    name: string;
    city?: string | null;
    address?: string | null;
    website?: string | null;
    logo_url?: string | null;
  };
  admin: {
    email: string;
    password: string;
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
    const { gym, admin } = payload;

    if (!gym?.name || !admin?.email || !admin?.password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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
      return new Response(JSON.stringify({ error: gymError?.message ?? "Gym create failed" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
      user_metadata: {
        role: "gym_admin",
      },
    });

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: userError?.message ?? "User create failed" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      email: admin.email,
      role: "gym_admin",
    });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { error: mappingError } = await supabase.from("gym_admins").insert({
      profile_id: userData.user.id,
      gym_id: gymRow.id,
    });

    if (mappingError) {
      return new Response(JSON.stringify({ error: mappingError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({
        gym: gymRow,
        user_id: userData.user.id,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
