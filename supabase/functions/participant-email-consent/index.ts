import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import {
  createServiceRoleClient,
} from "../_shared/adminAuth.ts";
import type { User } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
  action?: "initialize" | "resend" | "confirm" | "unsubscribe";
  profileId?: string;
  email?: string;
  name?: string | null;
  participationTermsVersion?: string;
  privacyNoticeVersion?: string;
  marketingOptInRequested?: boolean;
  token?: string;
};

type ProfileConsentRow = {
  profile_id: string;
  participation_terms_version: string | null;
  participation_terms_accepted_at: string | null;
  privacy_notice_version: string | null;
  privacy_notice_acknowledged_at: string | null;
  marketing_email_scope: string | null;
  marketing_email_status: "not_subscribed" | "pending" | "subscribed" | "unsubscribed";
  marketing_email_requested_at: string | null;
  marketing_email_confirmed_at: string | null;
  marketing_email_revoked_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MarketingTokenRow = {
  id: string;
  profile_id: string;
  token_type: "confirm" | "unsubscribe";
  expires_at: string;
  consumed_at: string | null;
};

const supabase = createServiceRoleClient();

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const MARKETING_EMAIL_FROM =
  Deno.env.get("MARKETING_EMAIL_FROM") ||
  Deno.env.get("CONTACT_FROM") ||
  (BREVO_API_KEY
    ? "Kletterliga NRW <info@mail.kletterliga-nrw.de>"
    : "Kletterliga NRW <onboarding@resend.dev>");
const MARKETING_EMAIL_REPLY_TO =
  Deno.env.get("MARKETING_EMAIL_REPLY_TO") || "info@kletterliga-nrw.de";
const DEFAULT_FRONTEND_URL =
  Deno.env.get("FRONTEND_URL") ||
  Deno.env.get("PUBLIC_SITE_URL") ||
  "https://kletterliga-nrw.de";
const DEFAULT_TERMS_VERSION = "2026-04-02-v1";
const DEFAULT_PRIVACY_VERSION = "2026-04-02-v1";
const DEFAULT_MARKETING_SCOPE = "liga_updates_partner_offers";
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function wrapEmail(previewText: string, body: string) {
  return `
    <!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Kletterliga NRW</title>
      </head>
      <body style="margin:0;padding:0;background:#f4efe3;color:#0f2f3d;font-family:Arial,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${escapeHtml(previewText)}
        </div>
        ${body}
      </body>
    </html>
  `;
}

function buildMarketingEmailHtml({
  name,
  confirmUrl,
  unsubscribeUrl,
}: {
  name: string;
  confirmUrl: string;
  unsubscribeUrl: string;
}) {
  return wrapEmail(
    "Bitte bestätige deine freiwillige E-Mail-Anmeldung für Kletterliga NRW Infos.",
    `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding:24px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #d8d1c1;box-shadow:0 14px 36px rgba(0,61,85,0.12);">
              <tr>
                <td style="padding:16px 24px;background:#003d55;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                  Kletterliga NRW
                </td>
              </tr>
              <tr>
                <td style="padding:32px 24px;background:#003d55;color:#ffffff;">
                  <div style="display:inline-block;margin-bottom:18px;padding:6px 10px;background:#f2dcab;color:#003d55;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
                    Freiwillige Infos per Mail
                  </div>
                  <h1 style="margin:0 0 14px;font-size:30px;line-height:1.15;font-weight:800;text-transform:uppercase;color:#ffffff;">
                    Bitte bestätige deine Anmeldung
                  </h1>
                  <p style="margin:0;max-width:560px;font-size:16px;line-height:1.75;color:#f4f7f8;">
                    Hallo ${escapeHtml(name)}, du hast angegeben, dass du zusätzlich freiwillige Informationen der Kletterliga NRW und ausgewählte Partnerinfos per E-Mail erhalten möchtest.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 24px;">
                  <div style="padding:20px;background:#f8fbfc;border:1px solid #cfd9de;border-left:6px solid #a15523;">
                    <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#173947;">
                      Damit wir dir diese freiwilligen Informationen schicken dürfen, bestätige bitte zuerst deine Anmeldung.
                    </p>
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#506a76;">
                      Deine verpflichtenden Teilnahme- und Organisationsmails bleiben davon unberührt.
                    </p>
                  </div>

                  <div style="margin:24px 0 0;">
                    <a href="${confirmUrl}" style="display:inline-block;padding:14px 22px;background:#a15523;color:#ffffff;text-decoration:none;font-weight:700;border:1px solid #a15523;">
                      Anmeldung bestätigen
                    </a>
                  </div>

                  <p style="margin:24px 0 0;font-size:14px;line-height:1.75;color:#173947;">
                    Falls der Button nicht funktioniert, kannst du auch diesen Link im Browser öffnen:
                    <br />
                    <a href="${confirmUrl}" style="color:#7a421d;word-break:break-all;">${confirmUrl}</a>
                  </p>

                  <p style="margin:24px 0 0;font-size:13px;line-height:1.75;color:#506a76;">
                    Wenn du diese freiwilligen E-Mails doch nicht erhalten möchtest, kannst du sie hier direkt abbestellen:
                    <br />
                    <a href="${unsubscribeUrl}" style="color:#003d55;word-break:break-all;">${unsubscribeUrl}</a>
                  </p>

                  <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:#506a76;">
                    Dieser Bestätigungslink ist 14 Tage gültig. Wenn du nichts bestätigst, erhältst du keine freiwilligen Informationsmails.
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
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: MARKETING_EMAIL_FROM,
      to: [to],
      reply_to: MARKETING_EMAIL_REPLY_TO,
      subject,
      html,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? "E-Mail konnte nicht über Resend gesendet werden.");
  }
}

async function sendBrevoEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const sender = parseSender(MARKETING_EMAIL_FROM);
  const replyTo = parseSender(MARKETING_EMAIL_REPLY_TO);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY ?? "",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      replyTo,
      subject,
      htmlContent: html,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? "E-Mail konnte nicht über Brevo gesendet werden.");
  }
}

async function sendMarketingEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (RESEND_API_KEY) {
    await sendResendEmail({ to, subject, html });
    return;
  }

  if (BREVO_API_KEY) {
    await sendBrevoEmail({ to, subject, html });
    return;
  }

  throw new Error("Es ist kein E-Mail-Provider konfiguriert.");
}

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createRawToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function authenticateOptional(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(token).catch(() => ({
    data: { user: null },
  }));

  return user ?? null;
}

function getFrontendUrl(req: Request) {
  const origin = req.headers.get("origin");
  return origin && origin.startsWith("http") ? origin : DEFAULT_FRONTEND_URL;
}

async function loadAuthUser(profileId: string, email?: string | null) {
  const { data, error } = await supabase.auth.admin.getUserById(profileId);
  if (error || !data.user) {
    return { data: null, error: "Das Konto konnte nicht gefunden werden." };
  }

  if (email && data.user.email?.toLowerCase() !== email.toLowerCase()) {
    return { data: null, error: "Die angegebene E-Mail-Adresse passt nicht zu diesem Konto." };
  }

  return { data: data.user, error: null };
}

async function ensureProfileRow(user: User) {
  const metadata = user.user_metadata ?? {};
  const profileSeed = {
    id: user.id,
    email: user.email ?? null,
    first_name: typeof metadata.first_name === "string" ? metadata.first_name : null,
    last_name: typeof metadata.last_name === "string" ? metadata.last_name : null,
    birth_date: typeof metadata.birth_date === "string" ? metadata.birth_date : null,
    gender: metadata.gender === "m" || metadata.gender === "w" ? metadata.gender : null,
    home_gym_id: typeof metadata.home_gym_id === "string" ? metadata.home_gym_id : null,
    league: metadata.league === "toprope" || metadata.league === "lead" ? metadata.league : null,
  };

  const { error } = await supabase.from("profiles").upsert(profileSeed, { onConflict: "id" });
  if (error) {
    throw new Error("Das Teilnehmerprofil konnte nicht vorbereitet werden.");
  }
}

async function fetchConsent(profileId: string) {
  const { data, error } = await supabase
    .from("profile_consents")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle<ProfileConsentRow>();

  if (error) {
    throw new Error("Die Einwilligungen konnten nicht geladen werden.");
  }

  return data ?? null;
}

async function upsertConsent(consent: Partial<ProfileConsentRow> & { profile_id: string }) {
  const { data, error } = await supabase
    .from("profile_consents")
    .upsert({
      ...consent,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single<ProfileConsentRow>();

  if (error) {
    throw new Error("Die Einwilligungen konnten nicht gespeichert werden.");
  }

  return data;
}

function getDisplayName(user: User, fallbackName?: string | null) {
  if (fallbackName?.trim()) return fallbackName.trim();

  const metadata = user.user_metadata ?? {};
  const composed = [metadata.first_name, metadata.last_name]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .trim();

  return composed || user.email || "Kletterliga NRW Teilnehmer:in";
}

async function issueMarketingTokens(profileId: string) {
  const confirmToken = createRawToken();
  const unsubscribeToken = createRawToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await supabase.from("marketing_opt_in_tokens").insert([
    {
      profile_id: profileId,
      token_hash: await hashToken(confirmToken),
      token_type: "confirm",
      expires_at: expiresAt,
    },
    {
      profile_id: profileId,
      token_hash: await hashToken(unsubscribeToken),
      token_type: "unsubscribe",
      expires_at: expiresAt,
    },
  ]);

  if (error) {
    throw new Error("Die Bestätigungslinks konnten nicht erstellt werden.");
  }

  return {
    confirmToken,
    unsubscribeToken,
  };
}

async function sendMarketingOptInMessage({
  req,
  user,
  email,
  name,
}: {
  req: Request;
  user: User;
  email: string;
  name?: string | null;
}) {
  const { confirmToken, unsubscribeToken } = await issueMarketingTokens(user.id);
  const frontendUrl = getFrontendUrl(req);
  const confirmUrl = `${frontendUrl}/mail/bestaetigen?token=${encodeURIComponent(confirmToken)}`;
  const unsubscribeUrl = `${frontendUrl}/mail/abbestellen?token=${encodeURIComponent(unsubscribeToken)}`;
  const html = buildMarketingEmailHtml({
    name: getDisplayName(user, name),
    confirmUrl,
    unsubscribeUrl,
  });

  await sendMarketingEmail({
    to: email,
    subject: "Bitte bestätige deine E-Mail-Anmeldung für Kletterliga NRW Infos",
    html,
  });
}

async function handleInitialize(req: Request, payload: Payload, authUser: User | null) {
  const profileId = typeof payload.profileId === "string" ? payload.profileId : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const marketingOptInRequested = payload.marketingOptInRequested === true;

  if (!profileId || !email) {
    return jsonResponse(400, { error: "profileId und email sind erforderlich." });
  }

  if (authUser && authUser.id !== profileId) {
    return jsonResponse(403, { error: "Du darfst diese Einwilligungen nicht für ein anderes Konto anlegen." });
  }

  const authUserResult = await loadAuthUser(profileId, email);
  if (!authUserResult.data) {
    return jsonResponse(404, { error: authUserResult.error });
  }

  await ensureProfileRow(authUserResult.data);
  const currentConsent = await fetchConsent(profileId);
  const now = new Date().toISOString();
  const consent = await upsertConsent({
    profile_id: profileId,
    participation_terms_version:
      payload.participationTermsVersion ||
      currentConsent?.participation_terms_version ||
      DEFAULT_TERMS_VERSION,
    participation_terms_accepted_at:
      currentConsent?.participation_terms_accepted_at || now,
    privacy_notice_version:
      payload.privacyNoticeVersion ||
      currentConsent?.privacy_notice_version ||
      DEFAULT_PRIVACY_VERSION,
    privacy_notice_acknowledged_at:
      currentConsent?.privacy_notice_acknowledged_at || now,
    marketing_email_scope:
      marketingOptInRequested
        ? currentConsent?.marketing_email_scope || DEFAULT_MARKETING_SCOPE
        : currentConsent?.marketing_email_scope || null,
    marketing_email_status: marketingOptInRequested
      ? currentConsent?.marketing_email_status === "subscribed"
        ? "subscribed"
        : "pending"
      : currentConsent?.marketing_email_status || "not_subscribed",
    marketing_email_requested_at: marketingOptInRequested
      ? currentConsent?.marketing_email_requested_at || now
      : currentConsent?.marketing_email_requested_at || null,
    marketing_email_confirmed_at: marketingOptInRequested
      ? currentConsent?.marketing_email_status === "subscribed"
        ? currentConsent?.marketing_email_confirmed_at
        : null
      : currentConsent?.marketing_email_confirmed_at || null,
    marketing_email_revoked_at: marketingOptInRequested ? null : currentConsent?.marketing_email_revoked_at || null,
  });

  if (!marketingOptInRequested) {
    return jsonResponse(200, {
      ok: true,
      email_sent: false,
      marketing_email_status: consent.marketing_email_status,
      consent,
    });
  }

  try {
    await sendMarketingOptInMessage({
      req,
      user: authUserResult.data,
      email,
      name: payload.name,
    });

    return jsonResponse(200, {
      ok: true,
      email_sent: true,
      marketing_email_status: consent.marketing_email_status,
      consent,
    });
  } catch (error) {
    console.error("participant-email-consent initialize send error:", error);
    return jsonResponse(200, {
      ok: true,
      email_sent: false,
      marketing_email_status: consent.marketing_email_status,
      consent,
      message:
        error instanceof Error
          ? error.message
          : "Die Bestätigungs-E-Mail konnte gerade nicht gesendet werden.",
    });
  }
}

async function handleResend(req: Request, payload: Payload, authUser: User | null) {
  if (!authUser) {
    return jsonResponse(401, { error: "Bitte melde dich an, um die Bestätigungs-E-Mail erneut anzufordern." });
  }

  const profileId = typeof payload.profileId === "string" ? payload.profileId : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : authUser.email?.toLowerCase() || "";
  if (!profileId || !email) {
    return jsonResponse(400, { error: "profileId und email sind erforderlich." });
  }

  if (authUser.id !== profileId) {
    return jsonResponse(403, { error: "Du darfst die Bestätigungs-E-Mail nur für dein eigenes Konto anfordern." });
  }

  const authUserResult = await loadAuthUser(profileId, email);
  if (!authUserResult.data) {
    return jsonResponse(404, { error: authUserResult.error });
  }

  await ensureProfileRow(authUserResult.data);
  const currentConsent = await fetchConsent(profileId);
  const now = new Date().toISOString();
  const consent = await upsertConsent({
    profile_id: profileId,
    participation_terms_version:
      currentConsent?.participation_terms_version || DEFAULT_TERMS_VERSION,
    participation_terms_accepted_at:
      currentConsent?.participation_terms_accepted_at || now,
    privacy_notice_version:
      currentConsent?.privacy_notice_version || DEFAULT_PRIVACY_VERSION,
    privacy_notice_acknowledged_at:
      currentConsent?.privacy_notice_acknowledged_at || now,
    marketing_email_scope: currentConsent?.marketing_email_scope || DEFAULT_MARKETING_SCOPE,
    marketing_email_status:
      currentConsent?.marketing_email_status === "subscribed" ? "subscribed" : "pending",
    marketing_email_requested_at: now,
    marketing_email_confirmed_at:
      currentConsent?.marketing_email_status === "subscribed"
        ? currentConsent?.marketing_email_confirmed_at
        : null,
    marketing_email_revoked_at: null,
  });

  try {
    await sendMarketingOptInMessage({
      req,
      user: authUserResult.data,
      email,
      name: payload.name,
    });

    return jsonResponse(200, {
      ok: true,
      email_sent: true,
      marketing_email_status: consent.marketing_email_status,
      consent,
    });
  } catch (error) {
    console.error("participant-email-consent resend send error:", error);
    return jsonResponse(200, {
      ok: true,
      email_sent: false,
      marketing_email_status: consent.marketing_email_status,
      consent,
      message:
        error instanceof Error
          ? error.message
          : "Die Bestätigungs-E-Mail konnte gerade nicht gesendet werden.",
    });
  }
}

async function resolveToken(token: string) {
  const tokenHash = await hashToken(token);
  const { data, error } = await supabase
    .from("marketing_opt_in_tokens")
    .select("id, profile_id, token_type, expires_at, consumed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<MarketingTokenRow>();

  if (error) {
    throw new Error("Der Link konnte nicht geprüft werden.");
  }

  return data ?? null;
}

async function consumeToken(tokenId: string) {
  const { error } = await supabase
    .from("marketing_opt_in_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", tokenId);

  if (error) {
    throw new Error("Der Link konnte nicht abgeschlossen werden.");
  }
}

async function handleConfirm(payload: Payload) {
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!token) {
    return jsonResponse(400, { error: "Der Bestätigungslink ist unvollständig." });
  }

  const tokenRow = await resolveToken(token);
  if (!tokenRow || tokenRow.token_type !== "confirm") {
    return jsonResponse(400, { error: "Dieser Bestätigungslink ist ungültig." });
  }
  if (tokenRow.consumed_at) {
    return jsonResponse(410, { error: "Dieser Bestätigungslink wurde bereits verwendet." });
  }
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return jsonResponse(410, { error: "Dieser Bestätigungslink ist abgelaufen." });
  }

  const currentConsent = await fetchConsent(tokenRow.profile_id);
  const now = new Date().toISOString();
  const consent = await upsertConsent({
    profile_id: tokenRow.profile_id,
    participation_terms_version:
      currentConsent?.participation_terms_version || DEFAULT_TERMS_VERSION,
    participation_terms_accepted_at:
      currentConsent?.participation_terms_accepted_at || now,
    privacy_notice_version:
      currentConsent?.privacy_notice_version || DEFAULT_PRIVACY_VERSION,
    privacy_notice_acknowledged_at:
      currentConsent?.privacy_notice_acknowledged_at || now,
    marketing_email_scope: currentConsent?.marketing_email_scope || DEFAULT_MARKETING_SCOPE,
    marketing_email_status: "subscribed",
    marketing_email_requested_at: currentConsent?.marketing_email_requested_at || now,
    marketing_email_confirmed_at: now,
    marketing_email_revoked_at: null,
  });

  await consumeToken(tokenRow.id);

  return jsonResponse(200, {
    ok: true,
    consent,
    marketing_email_status: consent.marketing_email_status,
    message: "Deine freiwilligen E-Mail-Infos sind jetzt bestätigt.",
  });
}

async function handleUnsubscribe(payload: Payload) {
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!token) {
    return jsonResponse(400, { error: "Der Abmeldelink ist unvollständig." });
  }

  const tokenRow = await resolveToken(token);
  if (!tokenRow || tokenRow.token_type !== "unsubscribe") {
    return jsonResponse(400, { error: "Dieser Abmeldelink ist ungültig." });
  }
  if (tokenRow.consumed_at) {
    return jsonResponse(410, { error: "Dieser Abmeldelink wurde bereits verwendet." });
  }
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return jsonResponse(410, { error: "Dieser Abmeldelink ist abgelaufen." });
  }

  const currentConsent = await fetchConsent(tokenRow.profile_id);
  const consent = await upsertConsent({
    profile_id: tokenRow.profile_id,
    marketing_email_scope: currentConsent?.marketing_email_scope || DEFAULT_MARKETING_SCOPE,
    marketing_email_status: "unsubscribed",
    marketing_email_requested_at: currentConsent?.marketing_email_requested_at || null,
    marketing_email_confirmed_at: currentConsent?.marketing_email_confirmed_at || null,
    marketing_email_revoked_at: new Date().toISOString(),
  });

  await consumeToken(tokenRow.id);

  return jsonResponse(200, {
    ok: true,
    consent,
    marketing_email_status: consent.marketing_email_status,
    message: "Du erhältst keine freiwilligen Kletterliga-Infos per E-Mail mehr.",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const payload = (await req.json().catch(() => null)) as Payload | null;
    if (!payload || typeof payload !== "object") {
      return jsonResponse(400, { error: "Ungültiger Request-Body." });
    }

    const authUser = await authenticateOptional(req);

    switch (payload.action) {
      case "initialize":
        return await handleInitialize(req, payload, authUser);
      case "resend":
        return await handleResend(req, payload, authUser);
      case "confirm":
        return await handleConfirm(payload);
      case "unsubscribe":
        return await handleUnsubscribe(payload);
      default:
        return jsonResponse(400, { error: "Unbekannte Aktion." });
    }
  } catch (error) {
    console.error("participant-email-consent error:", error);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Die Anfrage konnte nicht verarbeitet werden.",
    });
  }
});
