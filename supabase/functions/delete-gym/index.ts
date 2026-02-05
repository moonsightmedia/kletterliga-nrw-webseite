import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
  gymId: string;
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
    // Check authorization - only league admins can delete gyms
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is league admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "league_admin") {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only league admins can delete gyms" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    let payload: Payload;
    try {
      const body = await req.json();
      payload = typeof body === "object" && body !== null ? body : {};
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid or missing JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { gymId } = payload;

    if (!gymId) {
      return new Response(
        JSON.stringify({ error: "gymId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all admins for this gym
    const { data: gymAdmins, error: adminsError } = await supabase
      .from("gym_admins")
      .select("profile_id")
      .eq("gym_id", gymId);

    if (adminsError) {
      console.error("Error fetching gym admins:", adminsError);
    }

    // Delete auth users for all gym admins
    const userIdsToDelete: string[] = [];
    if (gymAdmins) {
      for (const admin of gymAdmins) {
        userIdsToDelete.push(admin.profile_id);
      }
    }

    // Delete gym (this will cascade delete gym_admins, gym_codes, routes, etc.)
    const { error: deleteGymError } = await supabase
      .from("gyms")
      .delete()
      .eq("id", gymId);

    if (deleteGymError) {
      console.error("Error deleting gym:", deleteGymError);
      return new Response(
        JSON.stringify({ error: deleteGymError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Delete auth users (profiles will be cascade deleted)
    const deleteUserErrors: string[] = [];
    for (const userId of userIdsToDelete) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteUserError) {
        console.error(`Error deleting user ${userId}:`, deleteUserError);
        deleteUserErrors.push(`${userId}: ${deleteUserError.message}`);
      }
    }

    if (deleteUserErrors.length > 0) {
      console.warn("Some users could not be deleted:", deleteUserErrors);
      // Continue anyway - gym is deleted
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Gym and associated users deleted successfully",
        deletedUsers: userIdsToDelete.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("delete-gym error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
