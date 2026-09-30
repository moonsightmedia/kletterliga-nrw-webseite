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
    if (raw.length > 15000) return respond(req, 413, { error: "Die Rückmeldung ist zu lang." });
    payload = JSON.parse(raw);
  } catch {
    return respond(req, 400, { error: "Die Rückmeldung konnte nicht gelesen werden." });
  }
  const isV2 = validFeedbackV2(payload);
  if (!isV2 && !validFeedback(payload)) return respond(req, 400, { error: "Bitte prüfe deine Antworten." });
  if (payload.website?.trim()) return respond(req, 200, { ok: true });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return respond(req, 503, { error: "Das Formular ist vorübergehend nicht verfügbar." });
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const record = isV2 ? {
    survey_version: 2,
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
