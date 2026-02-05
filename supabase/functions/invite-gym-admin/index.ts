import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
  email: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Frontend URL für Einladungslinks (z.B. https://kletterliga-nrw.de)
// Falls nicht gesetzt, wird versucht, sie aus SUPABASE_URL abzuleiten
const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Payload;
    const { email } = payload;

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email address is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if email already has an invite
    const { data: existingInvite } = await supabase
      .from("gym_invites")
      .select("*")
      .eq("email", email.toLowerCase())
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "An active invite already exists for this email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from("gym_invites")
      .insert({
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select("*")
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: inviteError?.message ?? "Failed to create invite" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Construct invite URL - verwende Frontend-URL falls verfügbar, sonst Supabase-URL
    const baseUrl = frontendUrl || supabaseUrl.replace("/rest/v1", "");
    const inviteUrl = `${baseUrl}/app/invite/gym/${token}`;

    // Send invitation email using Supabase Auth
    // Note: This uses the admin API to send an invite email
    // The email will contain a link to the invite page
    const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        invite_url: inviteUrl,
        token,
      },
      redirectTo: inviteUrl,
    });

    if (emailError) {
      // If email sending fails, we still return success but log the error
      // The invite token is still valid and can be used
      console.error("Failed to send invite email:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invite sent successfully",
        invite_url: inviteUrl, // Return URL for manual sharing if needed
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
