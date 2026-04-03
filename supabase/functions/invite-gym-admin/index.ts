import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createServiceRoleClient, requireLeagueAdmin } from "../_shared/adminAuth.ts";

type Payload = {
  gym_id: string;
  email: string;
  skip_email?: boolean;
};

const frontendUrlRaw = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://kletterliga-nrw.de";
const frontendUrl = frontendUrlRaw.replace(/\/+$/, "");
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CLAIM_EMAIL_FROM =
  Deno.env.get("GYM_INVITE_FROM") ||
  Deno.env.get("CONTACT_FROM") ||
  (BREVO_API_KEY
    ? "Kletterliga NRW <info@mail.kletterliga-nrw.de>"
    : "Kletterliga NRW <onboarding@resend.dev>");
const CLAIM_EMAIL_REPLY_TO =
  Deno.env.get("GYM_INVITE_REPLY_TO") ||
  Deno.env.get("CONTACT_REPLY_TO") ||
  "info@kletterliga-nrw.de";

const supabase = createServiceRoleClient();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
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

function buildInviteEmailHtml({
  gymName,
  inviteUrl,
}: {
  gymName: string;
  inviteUrl: string;
}) {
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
          Hallenzugang für ${escapeHtml(gymName)} einrichten
        </div>
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
                      Hallenzugang
                    </div>
                    <h1 style="margin:0 0 14px;font-size:30px;line-height:1.15;font-weight:800;text-transform:uppercase;color:#ffffff;">
                      Zugang für ${escapeHtml(gymName)} einrichten
                    </h1>
                    <p style="margin:0;max-width:560px;font-size:16px;line-height:1.75;color:#f4f7f8;">
                      Über den folgenden Link kann der Hallenzugang eingerichtet und ein Passwort gesetzt werden.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 24px;">
                    <div style="padding:20px;background:#f8fbfc;border:1px solid #cfd9de;border-left:6px solid #a15523;">
                      <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#173947;">
                        Nach dem ersten Login können die Hallendaten direkt im internen Hallenbereich gepflegt werden.
                      </p>
                      <p style="margin:0;font-size:15px;line-height:1.7;color:#506a76;">
                        Wenn ihr Fragen habt, meldet euch jederzeit gerne telefonisch.
                      </p>
                    </div>
                    <div style="margin:24px 0 0;">
                      <a href="${inviteUrl}" style="display:inline-block;padding:14px 22px;background:#a15523;color:#ffffff;text-decoration:none;font-weight:700;border:1px solid #a15523;">
                        Hallenzugang einrichten
                      </a>
                    </div>
                    <p style="margin:24px 0 0;font-size:14px;line-height:1.75;color:#173947;">
                      Falls der Button nicht funktioniert, kann dieser Link direkt im Browser geöffnet werden:
                      <br />
                      <a href="${inviteUrl}" style="color:#7a421d;word-break:break-all;">${inviteUrl}</a>
                    </p>
                    <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:#506a76;">
                      Der Link ist 7 Tage gültig. Sollte er ablaufen, schicken wir gerne einen neuen.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
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
      from: CLAIM_EMAIL_FROM,
      to: [to],
      reply_to: CLAIM_EMAIL_REPLY_TO,
      subject,
      html,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? "Einladung konnte nicht ueber Resend gesendet werden.");
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
  const sender = parseSender(CLAIM_EMAIL_FROM);
  const replyTo = parseSender(CLAIM_EMAIL_REPLY_TO);

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
    throw new Error(data?.message ?? "Einladung konnte nicht ueber Brevo gesendet werden.");
  }
}

async function sendClaimEmail({
  to,
  gymName,
  inviteUrl,
}: {
  to: string;
  gymName: string;
  inviteUrl: string;
}) {
  const subject = `Kletterliga NRW - Hallenzugang für ${gymName}`;
  const html = buildInviteEmailHtml({ gymName, inviteUrl });

  if (BREVO_API_KEY) {
    await sendBrevoEmail({ to, subject, html });
    return;
  }

  if (RESEND_API_KEY) {
    await sendResendEmail({ to, subject, html });
    return;
  }

  throw new Error("Kein Mail-Provider konfiguriert.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authResult = await requireLeagueAdmin(req, supabase, corsHeaders, "invite gym admins");
    if (authResult instanceof Response) {
      return authResult;
    }

    let payload: Payload;
    try {
      const body = await req.json();
      payload = typeof body === "object" && body !== null ? body : {} as Payload;
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid or missing JSON body", details: String(parseError) }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { gym_id, email, skip_email } = payload;

    if (!gym_id || typeof gym_id !== "string") {
      return new Response(
        JSON.stringify({ error: "gym_id ist erforderlich" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email address is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .select("id, name, archived_at")
      .eq("id", gym_id)
      .maybeSingle<{ id: string; name: string; archived_at: string | null }>();

    if (gymError || !gym) {
      return new Response(
        JSON.stringify({ error: "Die ausgewaehlte Halle wurde nicht gefunden." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (gym.archived_at) {
      return new Response(
        JSON.stringify({ error: "Archivierte Hallen koennen keinen Hallenzugang erhalten." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { data: mappings, error: mappingError } = await supabase
      .from("gym_admins")
      .select("profile_id")
      .eq("gym_id", gym_id);

    if (mappingError) {
      console.error("Failed to inspect existing gym admins:", mappingError);
      return new Response(
        JSON.stringify({ error: "Bestehende Hallenzugaenge konnten nicht geprueft werden." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const mappingProfileIds = (mappings ?? [])
      .map((mapping) => mapping.profile_id)
      .filter((profileId): profileId is string => typeof profileId === "string");

    if (mappingProfileIds.length > 0) {
      const { data: activeProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .in("id", mappingProfileIds)
        .is("archived_at", null);

      if (profileError) {
        console.error("Failed to inspect mapped profiles:", profileError);
        return new Response(
          JSON.stringify({ error: "Bestehende Hallenzugaenge konnten nicht geprueft werden." }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      if ((activeProfiles ?? []).length > 0) {
        return new Response(
          JSON.stringify({
            error: "Fuer diese Halle ist bereits ein Hallenzugang aktiv.",
            code: "GYM_ADMIN_ALREADY_EXISTS",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }
    }

    const { error: revokeError } = await supabase
      .from("gym_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("gym_id", gym_id)
      .is("used_at", null)
      .is("revoked_at", null);

    if (revokeError) {
      console.error("Failed to revoke older invites:", revokeError);
      return new Response(
        JSON.stringify({ error: "Bestehende Einladungen konnten nicht aktualisiert werden." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const inviteToken = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invite, error: inviteError } = await supabase
      .from("gym_invites")
      .insert({
        gym_id,
        email: email.toLowerCase(),
        token: inviteToken,
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
        },
      );
    }

    const cleanBase = frontendUrl.replace(/\/+$/, "");
    const inviteUrl = `${cleanBase}/app/invite/gym/${inviteToken}`;

    let emailSent = false;
    let emailError: string | null = null;

    if (!skip_email) {
      try {
        await sendClaimEmail({
          to: email.toLowerCase(),
          gymName: gym.name,
          inviteUrl,
        });
        emailSent = true;
      } catch (error) {
        emailError = error instanceof Error ? error.message : "Einladung konnte nicht versendet werden.";
        console.error("Failed to send invite email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: skip_email
          ? "Invite created successfully (email skipped)"
          : (emailSent ? "Invite sent successfully" : "Invite created but email failed"),
        invite_url: inviteUrl,
        email_sent: emailSent,
        email_error: emailError,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
