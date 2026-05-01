import { isSupabaseConfigured, supabase, supabaseConfig } from "@/services/supabase";
import type {
  AdminSettings,
  ChangeRequest,
  DataChangeAudit,
  FinaleRegistration,
  Gym,
  GymAdmin,
  GymCode,
  GymCommunityStats,
  GymInvite,
  GymInvitePreview,
  InstagramPost,
  MarketingEmailStatus,
  MasterCode,
  PartnerVoucherRedemption,
  ParticipantActivityStats,
  Profile,
  ProfileConsent,
  ProfileOverride,
  Result,
  Route,
} from "@/services/appTypes";

const missingSupabaseError = () => ({
  message: "Supabase ist lokal nicht konfiguriert. Lege VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env.local an.",
});

type ArchiveQueryOptions = {
  includeArchived?: boolean;
};

type AuditListOptions = {
  entityType?: DataChangeAudit["entity_type"];
  entityId?: string;
  limit?: number;
};

const shouldExcludeArchived = (options?: ArchiveQueryOptions) => !options?.includeArchived;

const mapIds = <T extends { id: string }>(rows: T[] | null | undefined) => new Set((rows ?? []).map((row) => row.id));

type ConsentActionPayload = {
  action: "initialize" | "resend" | "confirm" | "unsubscribe";
  profileId?: string;
  email?: string;
  name?: string | null;
  participationTermsVersion?: string;
  privacyNoticeVersion?: string;
  marketingOptInRequested?: boolean;
  token?: string;
};

type ConsentActionResponse = {
  ok: boolean;
  message?: string;
  marketing_email_status?: MarketingEmailStatus;
  email_sent?: boolean;
  consent?: ProfileConsent | null;
};

type GymInviteDispatchResponse = {
  success: boolean;
  message?: string;
  invite_url: string;
  email_sent: boolean;
  email_error: string | null;
};

type AuthEmailActionPayload =
  | {
      action: "signup";
      email: string;
      password: string;
      metadata: Record<string, unknown>;
      redirectTo?: string;
    }
  | {
      action: "resend_confirmation" | "recovery";
      email: string;
      redirectTo?: string;
    };

type AuthEmailActionResponse = {
  ok: boolean;
  email_sent?: boolean;
  user_id?: string;
  message?: string;
  already_exists?: boolean;
};

type PartnerVoucherRedeemResponse = {
  success: true;
  status: "redeemed_now" | "already_redeemed" | "not_eligible";
  redeemed_at?: string;
  season_year: string;
  partner_slug: string;
};

async function getFunctionHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    "Content-Type": "application/json",
    Authorization: session?.access_token
      ? `Bearer ${session.access_token}`
      : `Bearer ${supabaseConfig.anonKey}`,
    apikey: supabaseConfig.anonKey,
  };
}

async function getRequiredSessionAccessToken(message = "Bitte melde dich erneut an.") {
  if (!isSupabaseConfigured) {
    return { token: null, error: missingSupabaseError() };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {
      token: null,
      error: { message },
    };
  }

  return {
    token: session.access_token,
    error: null,
  };
}

async function resolveSeasonYearFallback() {
  const settingsResult = await listAdminSettings();
  if (settingsResult.error) {
    return {
      seasonYear: String(new Date().getFullYear()),
      error: settingsResult.error,
    };
  }

  const seasonYear = settingsResult.data?.[0]?.season_year?.trim();
  return {
    seasonYear: seasonYear && seasonYear.length > 0 ? seasonYear : String(new Date().getFullYear()),
    error: null,
  };
}

async function invokeParticipantConsentAction(payload: ConsentActionPayload) {
  const url = `${supabaseConfig.url}/functions/v1/participant-email-consent`;
  const response = await fetch(url, {
    method: "POST",
    headers: await getFunctionHeaders(),
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as
    | ConsentActionResponse
    | { error?: string; message?: string };

  if (!response.ok) {
    return {
      data: null,
      error: {
        message:
          body.error ??
          body.message ??
          response.statusText ??
          "Die Aktion konnte nicht ausgeführt werden.",
      },
    };
  }

  return {
    data: body as ConsentActionResponse,
    error: null,
  };
}

async function invokeAuthEmailAction(payload: AuthEmailActionPayload) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }

  const url = `${supabaseConfig.url}/functions/v1/auth-email`;
  const response = await fetch(url, {
    method: "POST",
    headers: await getFunctionHeaders(),
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as
    | AuthEmailActionResponse
    | { error?: string; message?: string };

  if (!response.ok) {
    return {
      data: null,
      error: {
        message:
          body.error ??
          body.message ??
          response.statusText ??
          "Die E-Mail-Aktion konnte nicht ausgeführt werden.",
      },
    };
  }

  return {
    data: body as AuthEmailActionResponse,
    error: null,
  };
}

export async function requestSignupEmail(payload: {
  email: string;
  password: string;
  metadata: Record<string, unknown>;
  redirectTo?: string;
}) {
  return invokeAuthEmailAction({
    action: "signup",
    ...payload,
  });
}

export async function requestConfirmationResendEmail(email: string, redirectTo?: string) {
  return invokeAuthEmailAction({
    action: "resend_confirmation",
    email,
    redirectTo,
  });
}

export async function requestPasswordRecoveryEmail(email: string, redirectTo?: string) {
  return invokeAuthEmailAction({
    action: "recovery",
    email,
    redirectTo,
  });
}

export async function fetchProfile(profileId: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  return supabase.from("profiles").select("*").eq("id", profileId).maybeSingle<Profile>();
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  return supabase.from("profiles").upsert(profile).select("*").single<Profile>();
}

export async function fetchProfileConsent(profileId: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  return supabase
    .from("profile_consents")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle<ProfileConsent>();
}

export async function upsertProfileConsent(
  consent: Partial<ProfileConsent> & { profile_id: string },
) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  return supabase
    .from("profile_consents")
    .upsert({
      ...consent,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single<ProfileConsent>();
}

export async function listGyms(options?: ArchiveQueryOptions) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  let query = supabase.from("gyms").select("*").order("name");
  if (shouldExcludeArchived(options)) {
    query = query.is("archived_at", null);
  }
  return query.returns<Gym[]>();
}

export async function getGym(gymId: string, options?: ArchiveQueryOptions) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  let query = supabase.from("gyms").select("*").eq("id", gymId).limit(1);
  if (shouldExcludeArchived(options)) {
    query = query.is("archived_at", null);
  }
  const { data, error } = await query.returns<Gym[]>();
  const single = data?.[0] ?? null;
  return { data: single, error };
}

export async function listRoutesByGym(gymId: string, options?: ArchiveQueryOptions) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  if (shouldExcludeArchived(options)) {
    const { data: gym, error } = await getGym(gymId);
    if (error) {
      return { data: null, error };
    }
    if (!gym) {
      return { data: [], error: null };
    }
  }
  return supabase.from("routes").select("*").eq("gym_id", gymId).order("code").returns<Route[]>();
}

export async function listRoutes(options?: ArchiveQueryOptions) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  const routesResult = await supabase.from("routes").select("*").returns<Route[]>();
  if (!shouldExcludeArchived(options)) {
    return routesResult;
  }

  const gymsResult = await listGyms();
  if (routesResult.error) {
    return { data: null, error: routesResult.error };
  }
  if (gymsResult.error) {
    return { data: null, error: gymsResult.error };
  }

  const activeGymIds = mapIds(gymsResult.data);
  return {
    data: (routesResult.data ?? []).filter((route) => activeGymIds.has(route.gym_id)),
    error: null,
  };
}

export async function createRoute(route: Omit<Route, "id" | "created_at">) {
  return supabase.from("routes").insert(route).select("*").single<Route>();
}

export async function updateRoute(routeId: string, route: Partial<Route>) {
  return supabase.from("routes").update(route).eq("id", routeId).select("*").single<Route>();
}

export async function deleteRoute(routeId: string) {
  return supabase.from("routes").delete().eq("id", routeId);
}

export async function listResultsForUser(profileId: string, options?: ArchiveQueryOptions) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  const resultsResult = await supabase
    .from("results")
    .select("*")
    .eq("profile_id", profileId)
    .returns<Result[]>();
  if (!shouldExcludeArchived(options)) {
    return resultsResult;
  }

  const [profileResult, routesResult] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", profileId).is("archived_at", null).maybeSingle<{ id: string }>(),
    listRoutes(),
  ]);

  if (resultsResult.error) {
    return { data: null, error: resultsResult.error };
  }
  if (profileResult.error) {
    return { data: null, error: profileResult.error };
  }
  if (routesResult.error) {
    return { data: null, error: routesResult.error };
  }
  if (!profileResult.data) {
    return { data: [], error: null };
  }

  const activeRouteIds = mapIds(routesResult.data);
  return {
    data: (resultsResult.data ?? []).filter((result) => activeRouteIds.has(result.route_id)),
    error: null,
  };
}

export async function listResults(options?: ArchiveQueryOptions) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  const resultsResult = await supabase.from("results").select("*").returns<Result[]>();
  if (!shouldExcludeArchived(options)) {
    return resultsResult;
  }

  const [profilesResult, routesResult] = await Promise.all([listProfiles(), listRoutes()]);
  if (resultsResult.error) {
    return { data: null, error: resultsResult.error };
  }
  if (profilesResult.error) {
    return { data: null, error: profilesResult.error };
  }
  if (routesResult.error) {
    return { data: null, error: routesResult.error };
  }

  const activeProfileIds = mapIds(profilesResult.data);
  const activeRouteIds = mapIds(routesResult.data);
  return {
    data: (resultsResult.data ?? []).filter(
      (result) => activeProfileIds.has(result.profile_id) && activeRouteIds.has(result.route_id),
    ),
    error: null,
  };
}

export async function getParticipantActivityStats(options?: ArchiveQueryOptions) {
  const { data, error } = await listResults(options);
  if (error) {
    return { data: null, error };
  }

  const summary = new Map<string, ParticipantActivityStats>();
  (data ?? []).forEach((result) => {
    const current = summary.get(result.profile_id) ?? {
      profile_id: result.profile_id,
      results_count: 0,
      flash_count: 0,
      last_result_at: null,
    };

    current.results_count += 1;
    if (result.flash) {
      current.flash_count += 1;
    }
    if (!current.last_result_at || result.created_at > current.last_result_at) {
      current.last_result_at = result.created_at;
    }

    summary.set(result.profile_id, current);
  });

  return {
    data: Array.from(summary.values()),
    error: null,
  };
}

export async function listGymCommunityStats() {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }

  const url = `${supabaseConfig.url}/functions/v1/get-gym-community-stats`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      apikey: supabaseConfig.anonKey,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Hallenstatistiken konnten nicht geladen werden.";
    return { data: null, error: { message } };
  }

  return { data: (Array.isArray(body) ? body : []) as GymCommunityStats[], error: null };
}

export async function listProfiles(options?: ArchiveQueryOptions) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  let query = supabase.from("profiles").select("*");
  if (shouldExcludeArchived(options)) {
    query = query.is("archived_at", null);
  }
  return query.returns<Profile[]>();
}

export async function updateProfile(profileId: string, patch: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profileId)
    .select("*")
    .maybeSingle<Profile>();
  if (error) return { data: null, error };
  if (!data) {
    return { data: null, error: { message: "Profil nicht gefunden oder keine Berechtigung", code: "PGRST116" } };
  }
  return { data, error: null };
}

export async function archiveProfile(profileId: string, reason?: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  const query = supabase.rpc("archive_profile", {
    p_profile_id: profileId,
    p_reason: reason ?? null,
  });
  const { data, error } = await query.single<Profile>();
  return { data, error };
}

export async function restoreProfile(profileId: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  const { data, error } = await supabase.rpc("restore_profile", {
    p_profile_id: profileId,
  }).single<Profile>();
  return { data, error };
}

export async function listAuditEntries(options?: AuditListOptions) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  let query = supabase.from("data_change_audit").select("*").order("created_at", { ascending: false });
  if (options?.entityType) {
    query = query.eq("entity_type", options.entityType);
  }
  if (options?.entityId) {
    query = query.eq("entity_id", options.entityId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  return query.returns<DataChangeAudit[]>();
}

export async function deleteProfile(profileId: string) {
  const auth = await getRequiredSessionAccessToken("Bitte melde dich erneut an, um das Konto zu löschen.");
  if (auth.error || !auth.token) {
    return { error: auth.error };
  }

  const url = `${supabaseConfig.url}/functions/v1/delete-user`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
      apikey: supabaseConfig.anonKey,
    },
    body: JSON.stringify({ userId: profileId }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Fehler beim Löschen des Benutzers";
    return { error: { message } };
  }

  return { error: null };
}

export async function upsertResult(result: Omit<Result, "id" | "created_at"> & { id?: string }) {
  // If id is provided, use it for upsert
  if (result.id) {
    return supabase.from("results").upsert(result).select("*").single<Result>();
  }
  
  // Otherwise, find existing result by profile_id and route_id
  const { data: existing } = await supabase
    .from("results")
    .select("id")
    .eq("profile_id", result.profile_id)
    .eq("route_id", result.route_id)
    .maybeSingle<{ id: string }>();
  
  if (existing) {
    // Update existing result
    return supabase
      .from("results")
      .update({
        points: result.points,
        flash: result.flash,
        status: result.status,
        rating: result.rating,
        feedback: result.feedback,
      })
      .eq("id", existing.id)
      .select("*")
      .single<Result>();
  } else {
    // Insert new result
    return supabase.from("results").insert(result).select("*").single<Result>();
  }
}

export async function updateResult(resultId: string, patch: Partial<Result>) {
  const { data, error } = await supabase
    .from("results")
    .update(patch)
    .eq("id", resultId)
    .select("*")
    .maybeSingle<Result>();
  if (error) return { data: null, error };
  if (!data) {
    return { data: null, error: { message: "Ergebnis nicht gefunden oder keine Berechtigung", code: "PGRST116" } };
  }
  return { data, error: null };
}

export async function listRankings() {
  return supabase.from("rankings").select("*").order("rank").returns<{ rank: number; name: string; points: number }[]>();
}

/** Public website: top N per league/class via Edge Function (bypasses RLS). */
export async function getPublicRankings(league: "toprope" | "lead", className: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  const url = `${supabaseConfig.url}/functions/v1/get-public-rankings`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      apikey: supabaseConfig.anonKey,
    },
    body: JSON.stringify({ league, class: className }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Rangliste konnte nicht geladen werden.";
    return { data: null, error: { message } };
  }
  const data = Array.isArray(body) ? body : (body as { data?: unknown[] })?.data ?? [];
  return { data: data as { rank: number; display_name: string; points: number }[], error: null };
}

export async function createChangeRequest(request: Omit<ChangeRequest, "id" | "created_at">) {
  return supabase.from("change_requests").insert(request).select("*").single<ChangeRequest>();
}

export async function listChangeRequests() {
  return supabase
    .from("change_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ChangeRequest[]>();
}

export async function updateChangeRequest(requestId: string, patch: Partial<ChangeRequest>) {
  return supabase.from("change_requests").update(patch).eq("id", requestId).select("*").single<ChangeRequest>();
}

export async function listGymCodesByGym(gymId: string) {
  return supabase.from("gym_codes").select("*").eq("gym_id", gymId).order("created_at", { ascending: false }).returns<GymCode[]>();
}

export type GymCodeWithGym = GymCode & {
  gyms: {
    id: string;
    name: string;
    city: string | null;
  } | null;
};

export async function listAllGymCodes() {
  return supabase
    .from("gym_codes")
    .select(`
      *,
      gyms (
        id,
        name,
        city
      )
    `)
    .order("created_at", { ascending: false })
    .returns<GymCodeWithGym[]>();
}

export async function createGymCodes(codes: Omit<GymCode, "id" | "created_at">[]) {
  return supabase.from("gym_codes").insert(codes).select("*").returns<GymCode[]>();
}

export async function updateGymCode(codeId: string, patch: Partial<GymCode>) {
  return supabase.from("gym_codes").update(patch).eq("id", codeId).select("*").single<GymCode>();
}

export async function deleteGymCode(codeId: string) {
  return supabase.from("gym_codes").delete().eq("id", codeId);
}

export async function getGymCodeByCode(code: string) {
  // Normalisiere Code zu Großbuchstaben für case-insensitive Suche
  const normalized = code.trim().toUpperCase();
  return supabase.from("gym_codes").select("*").eq("code", normalized).maybeSingle<GymCode>();
}

export async function checkGymCodeRedeemed(gymId: string, profileId: string) {
  return supabase
    .from("gym_codes")
    .select("*")
    .eq("gym_id", gymId)
    .eq("redeemed_by", profileId)
    .not("redeemed_at", "is", null)
    .maybeSingle<GymCode>();
}

export async function redeemGymCode(code: string) {
  const auth = await getRequiredSessionAccessToken("Bitte melde dich erneut an, um den Hallencode einzulösen.");
  if (auth.error || !auth.token) {
    return { data: null, error: auth.error };
  }

  const url = `${supabaseConfig.url}/functions/v1/redeem-gym-code`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
      apikey: supabaseConfig.anonKey,
    },
    body: JSON.stringify({ code }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Code konnte nicht eingelöst werden.";
    return { data: null, error: { message } };
  }

  return {
    data: body as { success: true; gym_id: string; gym_name: string | null },
    error: null,
  };
}

export async function listMasterCodes(gymId?: string) {
  let q = supabase.from("master_codes").select("*").order("created_at", { ascending: false });
  if (gymId != null) {
    q = q.eq("gym_id", gymId);
  }
  return q.returns<MasterCode[]>();
}

export async function createMasterCodes(codes: Omit<MasterCode, "id" | "created_at">[]) {
  return supabase.from("master_codes").insert(codes).select("*").returns<MasterCode[]>();
}

export async function getMasterCodeByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  return supabase.from("master_codes").select("*").eq("code", normalized).maybeSingle<MasterCode>();
}

export async function updateMasterCode(codeId: string, patch: Partial<MasterCode>) {
  return supabase.from("master_codes").update(patch).eq("id", codeId).select("*").single<MasterCode>();
}

export async function redeemMasterCode(code: string) {
  const auth = await getRequiredSessionAccessToken("Bitte melde dich erneut an, um den Mastercode einzulösen.");
  if (auth.error || !auth.token) {
    return { data: null, error: auth.error };
  }

  const url = `${supabaseConfig.url}/functions/v1/redeem-master-code`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
      apikey: supabaseConfig.anonKey,
    },
    body: JSON.stringify({ code }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Mastercode konnte nicht eingelöst werden.";
    return { data: null, error: { message } };
  }

  return { data: body as { success: true }, error: null };
}

export async function redeemPartnerVoucher(payload: {
  partnerSlug: string;
  qrCodeValue: string;
  scanSource?: string;
}) {
  const auth = await getRequiredSessionAccessToken("Bitte melde dich erneut an, um den Gutschein einzulösen.");
  if (auth.error || !auth.token) {
    return { data: null, error: auth.error };
  }

  const url = `${supabaseConfig.url}/functions/v1/redeem-partner-voucher`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
      apikey: supabaseConfig.anonKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Gutschein konnte nicht eingelöst werden.";
    return { data: null, error: { message } };
  }

  return {
    data: body as PartnerVoucherRedeemResponse,
    error: null,
  };
}

export async function getMyPartnerVoucherRedemption(partnerSlug: string, seasonYear?: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }

  const targetSeasonYear = (seasonYear ?? "").trim();
  const resolvedSeason = targetSeasonYear || (await resolveSeasonYearFallback()).seasonYear;

  return supabase
    .from("partner_voucher_redemptions")
    .select("*")
    .eq("partner_slug", partnerSlug)
    .eq("season_year", resolvedSeason)
    .order("redeemed_at", { ascending: false })
    .limit(1)
    .maybeSingle<PartnerVoucherRedemption>();
}

export async function listPartnerVoucherRedemptions(options: {
  partnerSlug: string;
  seasonYear?: string;
}) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }

  const targetSeasonYear = (options.seasonYear ?? "").trim();
  const resolvedSeason = targetSeasonYear || (await resolveSeasonYearFallback()).seasonYear;

  return supabase
    .from("partner_voucher_redemptions")
    .select("*")
    .eq("partner_slug", options.partnerSlug)
    .eq("season_year", resolvedSeason)
    .order("redeemed_at", { ascending: false })
    .returns<PartnerVoucherRedemption[]>();
}

export async function listGymAdminsByProfile(profileId: string) {
  return supabase.from("gym_admins").select("*").eq("profile_id", profileId).returns<{ gym_id: string }[]>();
}

export async function listGymAdmins() {
  return supabase.from("gym_admins").select("*").returns<GymAdmin[]>();
}

export async function listGymInvites() {
  return supabase
    .from("gym_invites")
    .select("id, gym_id, email, expires_at, created_at, used_at, revoked_at")
    .order("created_at", { ascending: false })
    .returns<GymInvite[]>();
}

export async function updateGym(gymId: string, patch: Partial<Gym>) {
  const { data, error } = await supabase
    .from("gyms")
    .update(patch)
    .eq("id", gymId)
    .select("*")
    .limit(1)
    .returns<Gym[]>();
  const single = data?.[0] ?? null;
  return { data: single, error };
}

export async function archiveGym(gymId: string, reason?: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  const { data, error } = await supabase.rpc("archive_gym", {
    p_gym_id: gymId,
    p_reason: reason ?? null,
  }).single<Gym>();
  return { data, error };
}

export async function restoreGym(gymId: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  const { data, error } = await supabase.rpc("restore_gym", {
    p_gym_id: gymId,
  }).single<Gym>();
  return { data, error };
}

export async function deleteGym(gymId: string) {
  const auth = await getRequiredSessionAccessToken("Bitte melde dich erneut an, um die Halle zu löschen.");
  if (auth.error || !auth.token) {
    return {
      data: null,
      error: auth.error,
    };
  }

  try {
    // Use Edge Function to delete gym and associated auth users
    const response = await fetch(`${supabaseConfig.url}/functions/v1/delete-gym`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
        apikey: supabaseConfig.anonKey,
      },
      body: JSON.stringify({ gymId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        data: null,
        error: {
          message: data.error || `HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }
    
    return {
      data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : "Failed to delete gym",
      },
    };
  }
}

export async function inviteGymAdmin(gymIdOrEmail: string, emailOrSkip: string | boolean, skipEmail: boolean = false) {
  if (typeof emailOrSkip === "boolean") {
    return {
      data: null,
      error: {
        message: "Bitte waehle zuerst eine Halle aus.",
        code: "GYM_ID_REQUIRED",
      },
    };
  }

  const gymId = gymIdOrEmail;
  const email = emailOrSkip;

  try {
    const response = await fetch(`${supabaseConfig.url}/functions/v1/invite-gym-admin`, {
      method: "POST",
      headers: await getFunctionHeaders(),
      body: JSON.stringify({ gym_id: gymId, email, skip_email: skipEmail }),
    });

    const data = (await response.json().catch(() => ({}))) as Partial<GymInviteDispatchResponse> & {
      error?: string;
      code?: string;
    };
    
    if (!response.ok) {
      console.error("inviteGymAdmin error response:", data);
      return {
        data: null,
        error: {
          message: data.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data.code,
        },
      };
    }
    
    return {
      data,
      error: null,
    };
  } catch (error: unknown) {
    console.error("inviteGymAdmin exception:", error);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : "Einladung konnte nicht gesendet werden",
      },
    };
  }
}

export async function getGymInviteByToken(token: string) {
  return fetchGymInvite(token);
}

export async function fetchGymInvite(token: string) {
  const url = `${supabaseConfig.url}/functions/v1/get-gym-invite`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
    body: JSON.stringify({ token }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Einladung konnte nicht geladen werden.";
    return { data: null, error: { message } };
  }

  return {
    data: body as GymInvitePreview,
    error: null,
  };
}

export async function initializeParticipantConsent(payload: {
  profileId: string;
  email: string;
  name?: string | null;
  participationTermsVersion: string;
  privacyNoticeVersion: string;
  marketingOptInRequested: boolean;
}) {
  return invokeParticipantConsentAction({
    action: "initialize",
    ...payload,
  });
}

export async function resendMarketingOptInEmail(payload: {
  profileId: string;
  email: string;
  name?: string | null;
}) {
  return invokeParticipantConsentAction({
    action: "resend",
    ...payload,
  });
}

export async function confirmMarketingOptInToken(token: string) {
  return invokeParticipantConsentAction({
    action: "confirm",
    token,
  });
}

export async function unsubscribeMarketingOptInToken(token: string) {
  return invokeParticipantConsentAction({
    action: "unsubscribe",
    token,
  });
}

export async function listGymAdminsByGym(gymId: string) {
  return supabase.from("gym_admins").select("*").eq("gym_id", gymId).returns<GymAdmin[]>();
}

export async function createGymAdmin(mapping: Omit<GymAdmin, "id" | "created_at">) {
  return supabase.from("gym_admins").insert(mapping).select("*").single<GymAdmin>();
}

export async function deleteGymAdmin(mappingId: string) {
  return supabase.from("gym_admins").delete().eq("id", mappingId);
}

export async function listAdminSettings() {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const { data, error } = await supabase.rpc("get_public_admin_settings").maybeSingle<AdminSettings>();
    return {
      data: data ? [data] : [],
      error,
    };
  }

  return supabase.from("admin_settings").select("*").order("updated_at", { ascending: false }).returns<AdminSettings[]>();
}

export async function upsertAdminSettings(settings: Partial<AdminSettings> & { id?: string }) {
  return supabase.from("admin_settings").upsert(settings).select("*").single<AdminSettings>();
}

export async function listProfileOverrides() {
  return supabase.from("profile_overrides").select("*").order("created_at", { ascending: false }).returns<ProfileOverride[]>();
}

export async function createProfileOverride(override: Omit<ProfileOverride, "id" | "created_at">) {
  return supabase.from("profile_overrides").insert(override).select("*").single<ProfileOverride>();
}

export async function updateProfileOverride(id: string, patch: Partial<ProfileOverride>) {
  return supabase.from("profile_overrides").update(patch).eq("id", id).select("*").single<ProfileOverride>();
}

export async function registerForFinale(profileId: string) {
  return supabase.from("finale_registrations").insert({ profile_id: profileId }).select("*").single<FinaleRegistration>();
}

export async function unregisterFromFinale(profileId: string) {
  return supabase.from("finale_registrations").delete().eq("profile_id", profileId);
}

export async function getFinaleRegistration(profileId: string) {
  return supabase.from("finale_registrations").select("*").eq("profile_id", profileId).maybeSingle<FinaleRegistration>();
}

export async function listFinaleRegistrations() {
  return supabase
    .from("finale_registrations")
    .select("*, profiles!inner(*)")
    .order("created_at", { ascending: false });
}

export async function getInstagramFeed(limit: number = 6) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  const localRes = await fetch(`/api/instagram-feed?limit=${limit}`).catch(() => null);
  if (localRes?.ok) {
    const localBody = await localRes.json().catch(() => []);
    if (Array.isArray(localBody) && localBody.length > 0) {
      return { data: localBody as InstagramPost[], error: null };
    }
  }

  const url = `${supabaseConfig.url}/functions/v1/get-instagram-feed`;
  const res = await fetch(`${url}?limit=${limit}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      apikey: supabaseConfig.anonKey,
    },
  });
  
  const body = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Instagram-Feed konnte nicht geladen werden.";
    return { data: null, error: { message } };
  }
  
  const data = Array.isArray(body) ? body : [];
  return { data: data as InstagramPost[], error: null };
}

export async function getInstagramFeedByHashtag(hashtag: string, limit: number = 6) {
  if (!isSupabaseConfigured) {
    return { data: null, error: missingSupabaseError() };
  }
  const url = `${supabaseConfig.url}/functions/v1/get-instagram-feed`;
  const hashtagParam = hashtag.replace(/^#/, ""); // Remove # if present
  const res = await fetch(`${url}?hashtag=${encodeURIComponent(hashtagParam)}&limit=${limit}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      apikey: supabaseConfig.anonKey,
    },
  });
  
  const body = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? res.statusText ?? "Hashtag-Feed konnte nicht geladen werden.";
    return { data: null, error: { message } };
  }
  
  const data = Array.isArray(body) ? body : [];
  return { data: data as InstagramPost[], error: null };
}
