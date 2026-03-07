import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
  name: string;
  email: string;
  subject?: string;
  message: string;
  website?: string;
  fill_time_ms?: number;
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CONTACT_TO = Deno.env.get("CONTACT_TO") || "info@kletterliga-nrw.de";
const CONTACT_FROM = Deno.env.get("CONTACT_FROM") || "Kletterliga NRW <onboarding@resend.dev>";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_FILL_TIME_MS = 4_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 3;
const requestLog = new Map<string, number[]>();

function getClientKey(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((entry) => now - entry < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(key, recent);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    let payload: Payload;
    try {
      const body = await req.json();
      payload = typeof body === "object" && body !== null ? body : {};
    } catch {
      return new Response(
        JSON.stringify({ error: "Ungültige Anfrage." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const name = (payload.name ?? "").toString().trim();
    const email = (payload.email ?? "").toString().trim();
    const subject = (payload.subject ?? "Kontaktanfrage").toString().trim() || "Kontaktanfrage";
    const message = (payload.message ?? "").toString().trim();
    const website = (payload.website ?? "").toString().trim();
    const fillTimeMs = Number(payload.fill_time_ms ?? 0);

    if (website) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!Number.isFinite(fillTimeMs) || fillTimeMs < MIN_FILL_TIME_MS) {
      return new Response(
        JSON.stringify({ error: "Bitte fülle das Formular in Ruhe aus und versuche es erneut." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Name, E-Mail und Nachricht sind Pflichtfelder." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (message.length < 10) {
      return new Response(
        JSON.stringify({ error: "Bitte formuliere deine Nachricht etwas ausführlicher." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const clientKey = getClientKey(req);
    if (isRateLimited(clientKey)) {
      return new Response(
        JSON.stringify({ error: "Zu viele Anfragen in kurzer Zeit. Bitte warte kurz und versuche es erneut." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mit Resend: E-Mail versenden
    if (RESEND_API_KEY) {
      const html = `
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
      <p><strong>Betreff:</strong> ${escapeHtml(subject)}</p>
      <hr />
      <p>${escapeHtml(message)}</p>
    `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: CONTACT_FROM,
          to: [CONTACT_TO],
          reply_to: email,
          subject: `[Kontaktformular] ${subject}`,
          html,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Resend error:", res.status, data);
        return new Response(
          JSON.stringify({ error: data?.message ?? "E-Mail konnte nicht gesendet werden." }),
          { status: res.status >= 500 ? 502 : 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, id: data?.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Ohne externes Tool: Nachricht in Supabase speichern (Table Editor / Dashboard)
    if (supabase) {
      const { error: insertError } = await supabase.from("contact_requests").insert({
        name,
        email,
        subject: subject || null,
        message,
      });

      if (insertError) {
        console.error("contact_requests insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Nachricht konnte nicht gespeichert werden. Bitte versuche es per E-Mail." }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Kontaktformular ist nicht konfiguriert. Bitte nutze info@kletterliga-nrw.de." }),
      { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("send-contact-email error:", err);
    return new Response(
      JSON.stringify({ error: "Ein Fehler ist aufgetreten. Bitte versuche es später erneut." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
