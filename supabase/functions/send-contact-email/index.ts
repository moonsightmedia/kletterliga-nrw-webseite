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

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CONTACT_TO = Deno.env.get("CONTACT_TO") || "info@kletterliga-nrw.de";
const CONTACT_FROM = Deno.env.get("CONTACT_FROM")
  || (BREVO_API_KEY
    ? "Kletterliga NRW <kontakt@mail.kletterliga-nrw.de>"
    : "Kletterliga NRW <onboarding@resend.dev>");

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

function parseSender(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:"?([^"]+)"?\s*)?<([^>]+)>$/);

  if (match) {
    const [, name, email] = match;
    return {
      email: email.trim(),
      name: name?.trim() || undefined,
    };
  }

  return {
    email: trimmed,
    name: undefined,
  };
}

function wrapEmail(previewText: string, content: string) {
  return `
    <!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Kletterliga NRW</title>
        <style>
          body, table, td, p, a {
            font-family: Arial, sans-serif;
          }

          @media only screen and (max-width: 640px) {
            .email-shell {
              padding: 8px !important;
            }

            .email-card {
              border-radius: 0 !important;
            }

            .section-pad {
              padding: 18px !important;
            }

            .hero-title {
              font-size: 22px !important;
              line-height: 1.2 !important;
            }

            .body-copy {
              font-size: 15px !important;
              line-height: 1.7 !important;
            }

            .subject-title {
              font-size: 18px !important;
              line-height: 1.35 !important;
            }

            .meta-label,
            .meta-value {
              display: block !important;
              width: 100% !important;
              padding-bottom: 6px !important;
            }

            .meta-label {
              padding-bottom: 2px !important;
            }

            .meta-row {
              padding-bottom: 14px !important;
            }

            .button-link {
              display: block !important;
              text-align: center !important;
            }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#f4efe3;color:#0f2f3d;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${escapeHtml(previewText)}
        </div>
        ${content}
      </body>
    </html>
  `;
}

function buildMetaRows({
  name,
  email,
  subject,
}: Required<Pick<Payload, "name" | "email">> & { subject: string }) {
  return `
    <tr>
      <td class="meta-row" style="padding:0 0 14px;">
        <span class="meta-label" style="display:inline-block;width:116px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7a421d;vertical-align:top;">Name</span>
        <span class="meta-value" style="display:inline-block;font-size:15px;line-height:1.6;color:#0f2f3d;vertical-align:top;">${escapeHtml(name)}</span>
      </td>
    </tr>
    <tr>
      <td class="meta-row" style="padding:0 0 14px;">
        <span class="meta-label" style="display:inline-block;width:116px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7a421d;vertical-align:top;">E-Mail</span>
        <span class="meta-value" style="display:inline-block;font-size:15px;line-height:1.6;color:#0f2f3d;vertical-align:top;">${escapeHtml(email)}</span>
      </td>
    </tr>
    <tr>
      <td class="meta-row" style="padding:0;">
        <span class="meta-label" style="display:inline-block;width:116px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7a421d;vertical-align:top;">Betreff</span>
        <span class="meta-value" style="display:inline-block;font-size:15px;line-height:1.6;color:#0f2f3d;vertical-align:top;">${escapeHtml(subject)}</span>
      </td>
    </tr>
  `;
}

function buildInternalEmailHtml({
  name,
  email,
  subject,
  message,
}: Required<Pick<Payload, "name" | "email" | "message">> & { subject: string }) {
  return wrapEmail(
    `Neue Kontaktanfrage: ${subject}`,
    `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td class="email-shell" style="padding:24px 16px;">
            <table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #cfd9de;box-shadow:0 10px 30px rgba(0,61,85,0.08);">
              <tr>
                <td style="padding:14px 24px;background:#003d55;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                  Neue Kontaktanfrage
                </td>
              </tr>
              <tr>
                <td class="section-pad" style="padding:28px 24px;">
                  <h1 style="margin:0 0 18px;font-size:28px;line-height:1.2;color:#003d55;">
                    [Kontaktformular] ${escapeHtml(subject)}
                  </h1>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;padding:0;background:#f8fbfc;border:1px solid #d9e2e6;border-left:5px solid #a15523;">
                    <tr>
                      <td style="padding:18px 18px 16px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                          ${buildMetaRows({ name, email, subject })}
                        </table>
                      </td>
                    </tr>
                  </table>
                  <div style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a421d;">
                    Nachricht
                  </div>
                  <div class="body-copy" style="padding:20px;background:#ffffff;border:1px solid #cfd9de;font-size:16px;line-height:1.8;color:#173947;">
                    ${escapeHtml(message)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  );
}

function buildSenderCopyHtml({
  name,
  email,
  subject,
  message,
}: Required<Pick<Payload, "name" | "email" | "message">> & { subject: string }) {
  return wrapEmail(
    `Wir haben deine Nachricht erhalten: ${subject}`,
    `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td class="email-shell" style="padding:24px 16px;">
            <table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #d8d1c1;box-shadow:0 14px 36px rgba(0,61,85,0.12);">
              <tr>
                <td style="padding:14px 24px;background:#7a421d;color:#fffaf2;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                  Kontaktformular
                </td>
              </tr>
              <tr>
                <td class="section-pad" style="padding:32px 24px;background:#003d55;color:#ffffff;">
                  <div style="display:inline-block;margin-bottom:18px;padding:6px 10px;background:#f2dcab;color:#003d55;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
                    Kletterliga NRW
                  </div>
                  <h1 class="hero-title" style="margin:0 0 14px;font-size:30px;line-height:1.15;font-weight:800;text-transform:uppercase;color:#ffffff;">
                    Deine Anfrage ist bei uns eingegangen
                  </h1>
                  <p class="body-copy" style="margin:0;max-width:560px;font-size:16px;line-height:1.75;color:#f4f7f8;">
                    Hallo ${escapeHtml(name)}, danke für deine Nachricht. Wir haben deine Anfrage erhalten und melden uns so schnell wie möglich bei dir.
                  </p>
                </td>
              </tr>
              <tr>
                <td class="section-pad" style="padding:32px 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background:#f8fbfc;border:1px solid #cfd9de;border-left:6px solid #a15523;">
                    <tr>
                      <td style="padding:18px;">
                        <p class="body-copy" style="margin:0 0 12px;font-size:15px;line-height:1.75;color:#173947;">
                          Wir melden uns so schnell wie möglich. Wenn du noch etwas ergänzen möchtest, antworte einfach direkt auf diese E-Mail.
                        </p>
                        <a class="button-link" href="mailto:info@kletterliga-nrw.de" style="display:inline-block;padding:12px 18px;background:#003d55;color:#ffffff;text-decoration:none;font-weight:700;border:1px solid #003d55;">
                          info@kletterliga-nrw.de
                        </a>
                      </td>
                    </tr>
                  </table>

                  <div style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#7a421d;">
                    Kopie deiner Nachricht
                  </div>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #cfd9de;">
                    <tr>
                      <td style="padding:18px 18px 16px;background:#f2dcab;border-bottom:1px solid #d6c28f;">
                        <p class="subject-title" style="margin:0;font-size:20px;font-weight:700;line-height:1.4;color:#0f2f3d;">
                          ${escapeHtml(subject)}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px 18px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                          ${buildMetaRows({ name, email, subject })}
                        </table>
                        <div style="height:1px;margin:18px 0;background:#cfd9de;"></div>
                        <div class="body-copy" style="font-size:16px;line-height:1.85;color:#173947;">
                          ${escapeHtml(message)}
                        </div>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:22px 0 0;font-size:12px;line-height:1.7;color:#506a76;">
                    Diese E-Mail ist eine automatische Kopie deiner Kontaktanfrage über das Formular auf kletterliga-nrw.de.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  );
}

async function sendResendEmail({
  to,
  replyTo,
  subject,
  html,
}: {
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: CONTACT_FROM,
      to,
      reply_to: replyTo,
      subject,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Resend error:", res.status, data);
    throw new Error(data?.message ?? "E-Mail konnte nicht gesendet werden.");
  }

  return data;
}

async function sendBrevoEmail({
  to,
  replyTo,
  subject,
  html,
}: {
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
}) {
  const sender = parseSender(CONTACT_FROM);

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY ?? "",
    },
    body: JSON.stringify({
      sender,
      to: to.map((email) => ({ email })),
      replyTo: replyTo ? { email: replyTo } : undefined,
      subject,
      htmlContent: html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Brevo error:", res.status, data);
    throw new Error(data?.message ?? "E-Mail konnte nicht gesendet werden.");
  }

  return data;
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

    if (BREVO_API_KEY || RESEND_API_KEY) {
      const sendEmail = BREVO_API_KEY ? sendBrevoEmail : sendResendEmail;

      try {
        const internalEmail = await sendEmail({
          to: [CONTACT_TO],
          replyTo: email,
          subject: `[Kontaktformular] ${subject}`,
          html: buildInternalEmailHtml({ name, email, subject, message }),
        });

        await sendEmail({
          to: [email],
          replyTo: CONTACT_TO,
          subject: `[Kontaktformular] ${subject}`,
          html: buildSenderCopyHtml({ name, email, subject, message }),
        });

        return new Response(
          JSON.stringify({ success: true, id: internalEmail?.messageId ?? internalEmail?.id }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : "E-Mail konnte nicht gesendet werden." }),
          { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

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
