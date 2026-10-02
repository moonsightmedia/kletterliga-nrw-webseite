import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Feedback = {
  participation: string;
  overall_rating: number;
  best_aspect: string;
  improve_aspect: string;
  next_year: string;
  comment?: string;
  website?: string;
  fill_time_ms?: number;
};

type FeedbackV2 = {
  survey_version: 2;
  participation: string;
  non_participation_reasons: string[];
  non_participation_detail: string;
  season_positive: string;
  season_difficult: string;
  route_quantity: string;
  route_ideas: string;
  hall_quantity: string;
  hall_choice: string;
  hall_ideas: string;
  season_distribution: string;
  distribution_ideas: string;
  drop_stations: string;
  drop_stations_ideas: string;
  top_wish: string;
  next_year: string;
  website?: string;
  fill_time_ms: number;
};

type FeedbackV3 = Omit<FeedbackV2, "survey_version"> & {
  survey_version: 3;
  registration_detail: string;
  finale_attendance: string;
  finale_reasons: string[];
  finale_detail: string;
};

type FeedbackV4 = {
  survey_version: 4;
  participation: string;
  top_wish: string;
  keep_aspect: string;
  main_barrier: string;
  barrier_detail: string;
  registration_detail: string;
  awareness_source: string;
  spectator_note: string;
  finale_eligibility: string;
  finale_attendance: string;
  finale_reason: string;
  finale_detail: string;
  next_year: string;
  deep_dive_topics: string[];
  route_quantity: string;
  route_ideas: string;
  hall_pool: string;
  hall_visits: string;
  hall_ideas: string;
  season_distribution: string;
  distribution_ideas: string;
  dropped_score: string;
  scoring_ideas: string;
  website?: string;
  fill_time_ms: number;
};

const allowedOrigins = new Set([
  "https://www.kletterliga-nrw.de",
  "https://kletterliga-nrw.de",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const choices = {
  participation: new Set(["active", "followed", "not_participated"]),
  best_aspect: new Set(["halls", "flexibility", "ranking_app", "community", "other"]),
  improve_aspect: new Set(["rules", "communication", "app", "halls_routes", "nothing", "other"]),
  next_year: new Set(["yes", "maybe", "no"]),
};
const v2Choices = {
  participation: choices.participation,
  non_participation_reasons: new Set(["time", "travel", "format", "routes", "cost", "awareness", "final_date", "registration", "motivation", "other"]),
  route_quantity: new Set(["", "more", "same", "fewer", "unsure"]),
  hall_quantity: new Set(["", "more", "same", "fewer", "unsure"]),
  hall_choice: new Set(["", "more_choice", "same", "fixed_halls", "unsure"]),
  season_distribution: new Set(["", "spread", "same", "compact", "unsure"]),
  drop_stations: new Set(["", "yes", "no", "unsure"]),
  next_year: new Set(["", "yes", "maybe", "no"]),
};
const v3Choices = {
  non_participation_reasons: new Set([...v2Choices.non_participation_reasons, "unaware"]),
  finale_attendance: new Set(["", "yes", "no", "unsure"]),
  finale_reasons: new Set(["date", "travel", "cost", "format", "registration", "cancelled", "other"]),
};
const v4Choices = {
  participation: new Set(["active", "followed", "not_participated", "spectator"]),
  main_barrier: new Set(["", "time", "travel", "format", "routes", "cost", "registration", "confidence", "personal", "other"]),
  finale_eligibility: new Set(["", "yes", "no", "unsure"]),
  finale_attendance: new Set(["", "yes", "no", "unsure"]),
  finale_reason: new Set(["", "date", "travel", "cost", "format", "registration", "personal", "other"]),
  deep_dive_topics: new Set(["routes", "halls", "timing", "scoring"]),
  route_quantity: v2Choices.route_quantity,
  hall_pool: v2Choices.hall_quantity,
  hall_visits: new Set(["", "all", "choose", "regions", "unsure"]),
  season_distribution: new Set(["", "more", "same", "less", "unsure"]),
  dropped_score: new Set(["", "none", "one", "multiple", "unsure"]),
  next_year: v2Choices.next_year,
};
const v4TextLimits = {
  top_wish: 1200,
  keep_aspect: 800,
  barrier_detail: 800,
  registration_detail: 800,
  awareness_source: 800,
  spectator_note: 800,
  finale_detail: 800,
  route_ideas: 800,
  hall_ideas: 800,
  distribution_ideas: 800,
  scoring_ideas: 800,
} as const;
const textLimits = {
  non_participation_detail: 800,
  season_positive: 800,
  season_difficult: 800,
  route_ideas: 800,
  hall_ideas: 800,
  distribution_ideas: 800,
  drop_stations_ideas: 800,
  top_wish: 1200,
} as const;
const requests = new Map<string, number[]>();
const windowMs = 60 * 60 * 1000;
// A venue Wi-Fi can put many legitimate respondents behind one public IP.
const maxRequestsPerIpPerHour = 300;

function headers(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://www.kletterliga-nrw.de",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function respond(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: headers(req) });
}

function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") || "unknown";
}

function rateLimited(req: Request) {
  const key = clientIp(req);
  const now = Date.now();
  const recent = (requests.get(key) ?? []).filter((time) => now - time < windowMs);
  recent.push(now);
  requests.set(key, recent);
  return recent.length > maxRequestsPerIpPerHour;
}

function validFeedback(value: unknown): value is Feedback {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return typeof data.participation === "string" && choices.participation.has(data.participation) &&
    Number.isInteger(data.overall_rating) && Number(data.overall_rating) >= 1 && Number(data.overall_rating) <= 5 &&
    typeof data.best_aspect === "string" && choices.best_aspect.has(data.best_aspect) &&
    typeof data.improve_aspect === "string" && choices.improve_aspect.has(data.improve_aspect) &&
    typeof data.next_year === "string" && choices.next_year.has(data.next_year) &&
    (data.comment === undefined || (typeof data.comment === "string" && data.comment.length <= 1000)) &&
    (data.website === undefined || typeof data.website === "string") &&
    typeof data.fill_time_ms === "number" && data.fill_time_ms >= 3000;
}

function validFeedbackV2(value: unknown): value is FeedbackV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  if (data.survey_version !== 2 || typeof data.participation !== "string" || !v2Choices.participation.has(data.participation)) return false;
  if (!Array.isArray(data.non_participation_reasons) || data.non_participation_reasons.length > v2Choices.non_participation_reasons.size ||
    new Set(data.non_participation_reasons).size !== data.non_participation_reasons.length ||
    !data.non_participation_reasons.every((reason) => typeof reason === "string" && v2Choices.non_participation_reasons.has(reason))) return false;
  for (const [field, limit] of Object.entries(textLimits)) {
    if (typeof data[field] !== "string" || data[field].length > limit) return false;
  }
  for (const field of ["route_quantity", "hall_quantity", "hall_choice", "season_distribution", "drop_stations", "next_year"] as const) {
    if (typeof data[field] !== "string" || !v2Choices[field].has(data[field])) return false;
  }
  if (data.participation !== "active" && !data.non_participation_reasons.length && !(data.non_participation_detail as string).trim()) return false;
  if (data.participation === "active" && (data.non_participation_reasons.length || (data.non_participation_detail as string).trim())) return false;
  if (!(data.top_wish as string).trim()) return false;
  return (data.website === undefined || typeof data.website === "string") &&
    typeof data.fill_time_ms === "number" && data.fill_time_ms >= 3000;
}

function validFeedbackV3(value: unknown): value is FeedbackV3 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  if (data.survey_version !== 3 || typeof data.participation !== "string" || !v2Choices.participation.has(data.participation)) return false;
  if (!Array.isArray(data.non_participation_reasons) || data.non_participation_reasons.length > v3Choices.non_participation_reasons.size ||
    new Set(data.non_participation_reasons).size !== data.non_participation_reasons.length ||
    !data.non_participation_reasons.every((reason) => typeof reason === "string" && v3Choices.non_participation_reasons.has(reason))) return false;
  if (!Array.isArray(data.finale_reasons) || data.finale_reasons.length > v3Choices.finale_reasons.size ||
    new Set(data.finale_reasons).size !== data.finale_reasons.length ||
    !data.finale_reasons.every((reason) => typeof reason === "string" && v3Choices.finale_reasons.has(reason))) return false;
  for (const [field, limit] of Object.entries({ ...textLimits, registration_detail: 800, finale_detail: 800 })) {
    if (typeof data[field] !== "string" || data[field].length > limit) return false;
  }
  for (const field of ["route_quantity", "hall_quantity", "hall_choice", "season_distribution", "drop_stations", "next_year"] as const) {
    if (typeof data[field] !== "string" || !v2Choices[field].has(data[field])) return false;
  }
  if (typeof data.finale_attendance !== "string" || !v3Choices.finale_attendance.has(data.finale_attendance)) return false;
  if (data.participation !== "active" && !data.non_participation_reasons.length && !(data.non_participation_detail as string).trim()) return false;
  if (data.participation === "active" && (data.non_participation_reasons.length || (data.non_participation_detail as string).trim() || (data.registration_detail as string).trim())) return false;
  if (!data.non_participation_reasons.includes("registration") && (data.registration_detail as string).trim()) return false;
  if (data.participation !== "active" && (data.finale_attendance || data.finale_reasons.length || (data.finale_detail as string).trim())) return false;
  if (data.finale_attendance !== "no" && data.finale_attendance !== "unsure" && (data.finale_reasons.length || (data.finale_detail as string).trim())) return false;
  if (data.participation !== "not_participated" && !(data.top_wish as string).trim()) return false;
  return (data.website === undefined || typeof data.website === "string") &&
    typeof data.fill_time_ms === "number" && data.fill_time_ms >= 3000;
}

function validFeedbackV4(value: unknown): value is FeedbackV4 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  if (data.survey_version !== 4 || typeof data.participation !== "string" || !v4Choices.participation.has(data.participation)) return false;
  for (const [field, limit] of Object.entries(v4TextLimits)) {
    if (typeof data[field] !== "string" || data[field].length > limit) return false;
  }
  for (const field of ["main_barrier", "finale_eligibility", "finale_attendance", "finale_reason", "route_quantity", "hall_pool", "hall_visits", "season_distribution", "dropped_score", "next_year"] as const) {
    if (typeof data[field] !== "string" || !v4Choices[field].has(data[field])) return false;
  }
  if (!Array.isArray(data.deep_dive_topics) || data.deep_dive_topics.length > v4Choices.deep_dive_topics.size ||
    new Set(data.deep_dive_topics).size !== data.deep_dive_topics.length ||
    !data.deep_dive_topics.every((topic) => typeof topic === "string" && v4Choices.deep_dive_topics.has(topic))) return false;

  const participation = data.participation as string;
  const topics = data.deep_dive_topics as string[];
  if (participation === "followed" && !data.main_barrier) return false;
  if (participation !== "followed" && (data.main_barrier || (data.barrier_detail as string).trim() || (data.registration_detail as string).trim())) return false;
  if (data.main_barrier !== "registration" && (data.registration_detail as string).trim()) return false;
  if (!(["active", "followed"].includes(participation)) && (data.keep_aspect as string).trim()) return false;
  if (participation !== "not_participated" && (data.awareness_source as string).trim()) return false;
  if (participation !== "spectator" && (data.spectator_note as string).trim()) return false;
  if (participation !== "active" && (data.finale_eligibility || data.finale_attendance || data.finale_reason || (data.finale_detail as string).trim())) return false;
  if (data.finale_eligibility !== "yes" && (data.finale_attendance || data.finale_reason || (data.finale_detail as string).trim())) return false;
  if (data.finale_attendance !== "no" && data.finale_attendance !== "unsure" && (data.finale_reason || (data.finale_detail as string).trim())) return false;
  if (!topics.includes("routes") && (data.route_quantity || (data.route_ideas as string).trim())) return false;
  if (!topics.includes("halls") && (data.hall_pool || data.hall_visits || (data.hall_ideas as string).trim())) return false;
  if (!topics.includes("timing") && (data.season_distribution || (data.distribution_ideas as string).trim())) return false;
  if (!topics.includes("scoring") && (data.dropped_score || (data.scoring_ideas as string).trim())) return false;
  return (data.website === undefined || typeof data.website === "string") &&
    typeof data.fill_time_ms === "number" && data.fill_time_ms >= 3000;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== "POST") return respond(req, 405, { error: "Methode nicht erlaubt." });
  if (!allowedOrigins.has(req.headers.get("origin") ?? "")) {
    return respond(req, 403, { error: "Anfrage nicht erlaubt." });
  }
  if (rateLimited(req)) return respond(req, 429, { error: "Bitte versuche es später erneut." });

  let payload: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 20000) return respond(req, 413, { error: "Die Rückmeldung ist zu lang." });
    payload = JSON.parse(raw);
  } catch {
    return respond(req, 400, { error: "Die Rückmeldung konnte nicht gelesen werden." });
  }
  const isV4 = validFeedbackV4(payload);
  const isV3 = !isV4 && validFeedbackV3(payload);
  const isV2 = !isV4 && !isV3 && validFeedbackV2(payload);
  if (!isV4 && !isV3 && !isV2 && !validFeedback(payload)) return respond(req, 400, { error: "Bitte prüfe deine Antworten." });
  if (payload.website?.trim()) return respond(req, 200, { ok: true });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return respond(req, 503, { error: "Das Formular ist vorübergehend nicht verfügbar." });
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const record = isV4 ? {
    survey_version: 4,
    participation: payload.participation,
    next_year: payload.next_year || null,
    details: {
      top_wish: payload.top_wish.trim(),
      keep_aspect: payload.keep_aspect.trim(),
      main_barrier: payload.main_barrier,
      barrier_detail: payload.barrier_detail.trim(),
      registration_detail: payload.registration_detail.trim(),
      awareness_source: payload.awareness_source.trim(),
      spectator_note: payload.spectator_note.trim(),
      finale_eligibility: payload.finale_eligibility,
      finale_attendance: payload.finale_attendance,
      finale_reason: payload.finale_reason,
      finale_detail: payload.finale_detail.trim(),
      deep_dive_topics: payload.deep_dive_topics,
      route_quantity: payload.route_quantity,
      route_ideas: payload.route_ideas.trim(),
      hall_pool: payload.hall_pool,
      hall_visits: payload.hall_visits,
      hall_ideas: payload.hall_ideas.trim(),
      season_distribution: payload.season_distribution,
      distribution_ideas: payload.distribution_ideas.trim(),
      dropped_score: payload.dropped_score,
      scoring_ideas: payload.scoring_ideas.trim(),
    },
  } : isV3 || isV2 ? {
    survey_version: isV3 ? 3 : 2,
    participation: payload.participation,
    next_year: payload.next_year || null,
    details: {
      non_participation_reasons: payload.non_participation_reasons,
      non_participation_detail: payload.non_participation_detail.trim(),
      season_positive: payload.season_positive.trim(),
      season_difficult: payload.season_difficult.trim(),
      route_quantity: payload.route_quantity,
      route_ideas: payload.route_ideas.trim(),
      hall_quantity: payload.hall_quantity,
      hall_choice: payload.hall_choice,
      hall_ideas: payload.hall_ideas.trim(),
      season_distribution: payload.season_distribution,
      distribution_ideas: payload.distribution_ideas.trim(),
      drop_stations: payload.drop_stations,
      drop_stations_ideas: payload.drop_stations_ideas.trim(),
      top_wish: payload.top_wish.trim(),
      ...(isV3 ? {
        registration_detail: payload.registration_detail.trim(),
        finale_attendance: payload.finale_attendance,
        finale_reasons: payload.finale_reasons,
        finale_detail: payload.finale_detail.trim(),
      } : {}),
    },
  } : {
    survey_version: 1,
    participation: payload.participation,
    overall_rating: payload.overall_rating,
    best_aspect: payload.best_aspect,
    improve_aspect: payload.improve_aspect,
    next_year: payload.next_year,
    comment: payload.comment?.trim() ?? "",
  };
  const { error } = await supabase.from("season_feedback_2026").insert(record);
  if (error) {
    console.error("Could not store season feedback", error.code);
    return respond(req, 503, { error: "Speichern hat nicht geklappt. Bitte versuche es später erneut." });
  }
  return respond(req, 201, { ok: true });
});
