import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { MAX_SURVEY_BYTES, validateIdeasDraftPayload } from "./validation.ts";

const allowedOrigins = new Set(["https://www.kletterliga-nrw.de", "https://kletterliga-nrw.de"]);
const requests = new Map<string, { count: number; expires: number }>();
// Ephemeral process salt: no persistent IP identifier and no answer/IP linkage.
const salt = crypto.randomUUID();
const hour = 3_600_000;
const genericError = "Die Abstimmung konnte nicht gespeichert werden. Bitte versuche es erneut.";

function headers(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://www.kletterliga-nrw.de",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
function respond(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: headers(req) });
}
async function limited(req: Request) {
  const now = Date.now();
  for (const [key, state] of requests) if (state.expires <= now) requests.delete(key);
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  const key = Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, "0")).join("");
  const state = requests.get(key) ?? { count: 0, expires: now + hour };
  // High shared-Wi-Fi allowance. This is best-effort per isolate, not strong bot protection.
  if (!requests.has(key) && requests.size >= 10_000) return true;
  state.count += 1;
  requests.set(key, state);
  return state.count > 1200;
}
async function boundedJson(req: Request): Promise<unknown> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_SURVEY_BYTES) throw new RangeError();
  if (!req.body) throw new SyntaxError();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SURVEY_BYTES) { await reader.cancel(); throw new RangeError(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
}

export async function handleIdeasSurveyRequest(req: Request): Promise<Response> {
  if (!allowedOrigins.has(req.headers.get("origin") ?? "")) return respond(req, 403, { error: genericError });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== "POST") return respond(req, 405, { error: genericError });
  if ((req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") return respond(req, 415, { error: genericError });
  if (await limited(req)) return respond(req, 429, { error: "Bitte versuche es später erneut." });
  let raw: unknown;
  try { raw = await boundedJson(req); }
  catch (error) { return respond(req, error instanceof RangeError ? 413 : 400, { error: genericError }); }
  if (typeof raw === "object" && raw !== null && "mode" in raw) {
    const draft = validateIdeasDraftPayload(raw);
    if (!draft.valid) return respond(req, 400, { error: "Bitte prüfe deine Antworten." });
    const p = draft.payload;
    if (p.website.trim()) return respond(req, 200, { ok: true });
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return respond(req, 503, { error: genericError });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(p.write_token));
    const tokenHash = Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, "0")).join("");
    try {
      const result = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/save_ideas_survey_2027`, {
        method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_id: p.submission_id, p_token_hash: tokenHash, p_revision: p.revision, p_mode: p.mode, p_answers: p.answers, p_consent_version: p.consent?.version ?? null }),
        signal: AbortSignal.timeout(10_000),
      });
      if (result.ok && await result.json() === true) return respond(req, 200, { ok: true });
      if (result.ok) return respond(req, 409, { error: genericError });
    } catch { /* No identifiers, capabilities, answers or DB responses in logs. */ }
    return respond(req, 503, { error: genericError });
  }
  // Retired prototype path: no writes without consent and a withdrawal capability.
  return respond(req, 400, { error: "Bitte starte die aktuelle Umfrage." });
}

serve(handleIdeasSurveyRequest);
