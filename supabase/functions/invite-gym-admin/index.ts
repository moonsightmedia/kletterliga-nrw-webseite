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
    // Parse request body
    let payload: Payload;
    try {
      const body = await req.json();
      payload = typeof body === "object" && body !== null ? body : {};
      console.log("Parsed payload:", payload);
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

    const { email } = payload;
    console.log("Received email:", email);

    if (!email || typeof email !== "string" || !email.includes("@")) {
      console.error("Invalid email:", email);
      return new Response(
        JSON.stringify({ error: "Valid email address is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if email already has an invite
    const { data: existingInvite, error: checkError } = await supabase
      .from("gym_invites")
      .select("*")
      .eq("email", email.toLowerCase())
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing invite:", checkError);
    }

    if (existingInvite) {
      console.log("Active invite already exists for:", email);
      return new Response(
        JSON.stringify({ 
          error: "Für diese E-Mail-Adresse existiert bereits eine aktive Einladung. Die E-Mail wurde bereits gesendet.",
          code: "INVITE_ALREADY_EXISTS"
        }),
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
    // Entferne trailing slash falls vorhanden, um doppelte Slashes zu vermeiden
    const cleanFrontendUrl = frontendUrl ? frontendUrl.replace(/\/$/, "") : null;
    const baseUrl = cleanFrontendUrl || supabaseUrl.replace("/rest/v1", "");
    const inviteUrl = `${baseUrl}/app/invite/gym/${token}`;
    
    // Log für Debugging
    console.log("Frontend URL:", frontendUrl || "NOT SET - using Supabase URL");
    console.log("Clean Frontend URL:", cleanFrontendUrl);
    console.log("Base URL:", baseUrl);
    console.log("Invite URL:", inviteUrl);

    // WICHTIG: Die redirectTo URL muss in der Supabase Auth-Konfiguration als erlaubte Redirect-URL eingetragen sein
    // Gehe zu: Project Settings → Auth → URL Configuration → Redirect URLs
    // Füge hinzu: https://kletterliga-nrw.de/app/invite/gym/*
    
    // Send invitation email using Supabase Auth
    // Note: Supabase verwendet die Site URL aus den Auth-Einstellungen als Basis für den Link
    // Das E-Mail-Template muss angepasst werden, um unseren custom Link zu verwenden
    const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        invite_url: inviteUrl,
        token: token,
        // Diese Daten werden im E-Mail-Template verfügbar sein
      },
      redirectTo: inviteUrl, // Wird verwendet, wenn die Site URL korrekt konfiguriert ist
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
