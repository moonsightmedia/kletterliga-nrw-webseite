import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createServiceRoleClient, requireLeagueAdmin } from "../_shared/adminAuth.ts";

type Payload = {
  gymId: string;
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
    const authResult = await requireLeagueAdmin(req, supabase, corsHeaders, "delete gyms");
    if (authResult instanceof Response) {
      return authResult;
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
