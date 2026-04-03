import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createServiceRoleClient } from "../_shared/adminAuth.ts";

type SignupPayload = {
  action: "signup";
  email: string;
  password: string;
  metadata?: Record<string, unknown>;
  redirectTo?: string;
};

type ResendPayload = {
  action: "resend_confirmation" | "recovery";
  email: string;
  redirectTo?: string;
};

type Payload = SignupPayload | ResendPayload;

type AuthUserSummary = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
};

const supabase = createServiceRoleClient();

const frontendUrlRaw = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://kletterliga-nrw.de";
const frontendUrl = frontendUrlRaw.replace(/\/+$/, "");
const defaultConfirmRedirect = `${frontendUrl}/app/auth/confirm`;
const defaultRecoveryRedirect = `${frontendUrl}/app/auth/reset-password`;

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const AUTH_EMAIL_FROM =
  Deno.env.get("AUTH_EMAIL_FROM") ||
  Deno.env.get("CONTACT_FROM") ||
  (BREVO_API_KEY
    ? "Kletterliga NRW <kontakt@mail.kletterliga-nrw.de>"
    : "Kletterliga NRW <onboarding@resend.dev>");
const AUTH_EMAIL_REPLY_TO =
  Deno.env.get("AUTH_EMAIL_REPLY_TO") ||
  Deno.env.get("CONTACT_REPLY_TO") ||
  "info@kletterliga-nrw.de";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_USER_LIST_PAGES = 20;
const USERS_PER_PAGE = 200;
const requestLog = new Map<string, number[]>();

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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((entry) => now - entry < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(key, recent);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
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

function wrapEmail(previewText: string, content: string) {
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
        ${content}
      </body>
    </html>
  `;
}

function buildActionEmailHtml({
  eyebrow,
  title,
  intro,
  buttonLabel,
  actionUrl,
  fallbackText,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  buttonLabel: string;
  actionUrl: string;
  fallbackText: string;
}) {
  return wrapEmail(
    title,
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
                    ${escapeHtml(eyebrow)}
                  </div>
                  <h1 style="margin:0 0 14px;font-size:30px;line-height:1.15;font-weight:800;text-transform:uppercase;color:#ffffff;">
                    ${escapeHtml(title)}
                  </h1>
                  <p style="margin:0;max-width:560px;font-size:16px;line-height:1.75;color:#f4f7f8;">
                    ${escapeHtml(intro)}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 24px;">
                  <div style="padding:20px;background:#f8fbfc;border:1px solid #cfd9de;border-left:6px solid #a15523;">
                    <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#173947;">
                      Der Link ist direkt f\u00fcr dein Konto erstellt worden und kann sofort genutzt werden.
                    </p>
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#506a76;">
                      Falls du diese Aktion nicht angesto\u00dfen hast, kannst du diese E-Mail einfach ignorieren.
                    </p>
                  </div>
                  <div style="margin:24px 0 0;">
                    <a href="${actionUrl}" style="display:inline-block;padding:14px 22px;background:#a15523;color:#ffffff;text-decoration:none;font-weight:700;border:1px solid #a15523;">
                      ${escapeHtml(buttonLabel)}
                    </a>
                  </div>
                  <p style="margin:24px 0 0;font-size:14px;line-height:1.75;color:#173947;">
                    Falls der Button nicht funktioniert, kann dieser Link direkt im Browser ge\u00f6ffnet werden:
                    <br />
                    <a href="${actionUrl}" style="color:#7a421d;word-break:break-all;">${actionUrl}</a>
                  </p>
                  <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:#506a76;">
                    ${escapeHtml(fallbackText)}
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
      from: AUTH_EMAIL_FROM,
      to: [to],
      reply_to: AUTH_EMAIL_REPLY_TO,
      subject,
      html,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? "E-Mail konnte nicht \u00fcber Resend gesendet werden.");
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
  const sender = parseSender(AUTH_EMAIL_FROM);
  const replyTo = parseSender(AUTH_EMAIL_REPLY_TO);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
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
    throw new Error(data?.message ?? "E-Mail konnte nicht \u00fcber Brevo gesendet werden.");
  }
}

async function sendAuthEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
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

function resolveRedirectTo(raw: string | undefined, fallback: string) {
  if (!raw) {
    return fallback;
  }

  try {
    const candidate = new URL(raw);
    const fallbackUrl = new URL(fallback);
    const allowedOrigins = new Set([
      fallbackUrl.origin,
      "https://kletterliga-nrw.de",
      "https://www.kletterliga-nrw.de",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ]);

    if (!allowedOrigins.has(candidate.origin)) {
      return fallback;
    }

    return candidate.toString();
  } catch {
    return fallback;
  }
}

function isAlreadyRegisteredError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists")
  );
}

async function findUserByEmail(email: string): Promise<AuthUserSummary | null> {
  let page = 1;

  while (page <= MAX_USER_LIST_PAGES) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });

    if (error) {
      throw new Error(error.message || "Bestehende Accounts konnten nicht gepr\u00fcft werden.");
    }

    const found = (data?.users ?? []).find((user) => normalizeEmail(user.email ?? "") === email);
    if (found) {
      return {
        id: found.id,
        email: found.email ?? null,
        email_confirmed_at: found.email_confirmed_at ?? null,
      };
    }

    if (!data?.nextPage || data.users.length === 0 || (data.lastPage && page >= data.lastPage)) {
      break;
    }

    page = data.nextPage;
  }

  return null;
}

async function generateSignupEmail({
  email,
  password,
  metadata,
  redirectTo,
}: {
  email: string;
  password: string;
  metadata?: Record<string, unknown>;
  redirectTo: string;
}) {
  const existingUser = await findUserByEmail(email);

  if (existingUser?.email_confirmed_at) {
    return {
      data: null,
      error: {
        status: 409,
        message:
          "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich im Login an oder fordere dort einen neuen Best\u00e4tigungslink an.",
      },
    };
  }

  if (existingUser) {
    const linkResult = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (linkResult.error || !linkResult.data?.properties?.action_link) {
      throw new Error(linkResult.error?.message || "Best\u00e4tigungslink konnte nicht erzeugt werden.");
    }

    await sendAuthEmail({
      to: email,
      subject: "Kletterliga NRW - Best\u00e4tigungslink",
      html: buildActionEmailHtml({
        eyebrow: "Account",
        title: "Best\u00e4tige deinen Zugang",
        intro:
          "F\u00fcr diese E-Mail-Adresse existiert bereits ein unbest\u00e4tigter Account. \u00dcber diesen Link aktivierst du deinen Zugang sofort.",
        buttonLabel: "Zugang aktivieren",
        actionUrl: linkResult.data.properties.action_link,
        fallbackText: "Wenn du bereits einen Link angefordert hattest, kannst du ab sofort einfach den neuesten verwenden.",
      }),
    });

    return {
      data: {
        email_sent: true,
        user_id: existingUser.id,
      },
      error: null,
    };
  }

  const linkResult = await supabase.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: metadata,
      redirectTo,
    },
  });

  if (linkResult.error) {
    if (isAlreadyRegisteredError(linkResult.error.message)) {
      return {
        data: null,
        error: {
          status: 409,
          message:
          "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich im Login an oder fordere dort einen neuen Best\u00e4tigungslink an.",
        },
      };
    }

    throw new Error(linkResult.error.message || "Registrierungslink konnte nicht erzeugt werden.");
  }

  const actionLink = linkResult.data?.properties?.action_link;
  const userId = linkResult.data?.user?.id;
  if (!actionLink || !userId) {
    throw new Error("Registrierungslink konnte nicht erzeugt werden.");
  }

  await sendAuthEmail({
    to: email,
    subject: "Kletterliga NRW - E-Mail best\u00e4tigen",
    html: buildActionEmailHtml({
      eyebrow: "Registrierung",
      title: "Best\u00e4tige deine E-Mail",
      intro:
        "Dein Account f\u00fcr die Kletterliga NRW ist angelegt. Mit einem Klick best\u00e4tigst du deine E-Mail-Adresse und landest direkt in deinem Profil.",
      buttonLabel: "E-Mail best\u00e4tigen",
      actionUrl: actionLink,
      fallbackText: "Wenn du dich nicht registriert hast, kannst du diese E-Mail ignorieren.",
    }),
  });

  return {
    data: {
      email_sent: true,
      user_id: userId,
    },
    error: null,
  };
}

async function sendConfirmationEmail(email: string, redirectTo: string) {
  const existingUser = await findUserByEmail(email);

  if (!existingUser || existingUser.email_confirmed_at) {
    return {
      data: {
        email_sent: false,
        user_id: existingUser?.id ?? null,
      },
      error: null,
    };
  }

  const linkResult = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (linkResult.error || !linkResult.data?.properties?.action_link) {
    throw new Error(linkResult.error?.message || "Best\u00e4tigungslink konnte nicht erzeugt werden.");
  }

  await sendAuthEmail({
    to: email,
    subject: "Kletterliga NRW - Neuer Best\u00e4tigungslink",
    html: buildActionEmailHtml({
      eyebrow: "Best\u00e4tigung",
      title: "Hier ist dein neuer Link",
      intro:
        "Mit diesem Link kannst du deinen Zugang zur Kletterliga NRW best\u00e4tigen und dich direkt anmelden.",
      buttonLabel: "Link verwenden",
      actionUrl: linkResult.data.properties.action_link,
      fallbackText: "Wenn du die E-Mail inzwischen best\u00e4tigt hast, kannst du diese Nachricht ignorieren.",
    }),
  });

  return {
    data: {
      email_sent: true,
      user_id: existingUser.id,
    },
    error: null,
  };
}

async function sendRecoveryEmail(email: string, redirectTo: string) {
  const existingUser = await findUserByEmail(email);

  if (!existingUser) {
    return {
      data: {
        email_sent: false,
        user_id: null,
      },
      error: null,
    };
  }

  const linkResult = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (linkResult.error || !linkResult.data?.properties?.action_link) {
    throw new Error(linkResult.error?.message || "Passwort-Link konnte nicht erzeugt werden.");
  }

  await sendAuthEmail({
    to: email,
    subject: "Kletterliga NRW - Passwort zur\u00fccksetzen",
    html: buildActionEmailHtml({
      eyebrow: "Passwort",
      title: "Setze dein Passwort neu",
      intro:
        "\u00dcber diesen Link kannst du ein neues Passwort f\u00fcr deinen Zugang zur Kletterliga NRW festlegen.",
      buttonLabel: "Passwort neu setzen",
      actionUrl: linkResult.data.properties.action_link,
      fallbackText: "Wenn du kein neues Passwort angefordert hast, kannst du diese E-Mail ignorieren.",
    }),
  });

  return {
    data: {
      email_sent: true,
      user_id: existingUser.id,
    },
    error: null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse(400, { error: "Ung\u00fcltige Anfrage." });
    }

    const payload = body as Payload;
    const action = payload.action;
    const email = normalizeEmail(String(payload.email ?? ""));

    if (action !== "signup" && action !== "resend_confirmation" && action !== "recovery") {
      return jsonResponse(400, { error: "Ung\u00fcltige Aktion." });
    }

    if (!isValidEmail(email)) {
      return jsonResponse(400, { error: "Bitte gib eine g\u00fcltige E-Mail-Adresse ein." });
    }

    const rateLimitKey = `${action}:${getClientIp(req)}:${email}`;
    if (isRateLimited(rateLimitKey)) {
      return jsonResponse(429, {
        error: "Zu viele Anfragen in kurzer Zeit. Bitte warte kurz und versuche es erneut.",
      });
    }

    if (action === "signup") {
      const password = String(payload.password ?? "");
      if (password.length < 6) {
        return jsonResponse(400, {
          error: "Das Passwort ist zu kurz. Es muss mindestens 6 Zeichen lang sein.",
        });
      }

      const result = await generateSignupEmail({
        email,
        password,
        metadata: payload.metadata,
        redirectTo: resolveRedirectTo(payload.redirectTo, defaultConfirmRedirect),
      });

      if (result.error) {
        return jsonResponse(result.error.status, {
          error: result.error.message,
          already_exists: result.error.status === 409,
        });
      }

      return jsonResponse(200, {
        ok: true,
        email_sent: result.data.email_sent,
        user_id: result.data.user_id,
      });
    }

    if (action === "resend_confirmation") {
      const result = await sendConfirmationEmail(
        email,
        resolveRedirectTo(payload.redirectTo, defaultConfirmRedirect),
      );

      return jsonResponse(200, {
        ok: true,
        email_sent: result.data.email_sent,
        user_id: result.data.user_id,
      });
    }

    const result = await sendRecoveryEmail(
      email,
      resolveRedirectTo(payload.redirectTo, defaultRecoveryRedirect),
    );

    return jsonResponse(200, {
      ok: true,
      email_sent: result.data.email_sent,
      user_id: result.data.user_id,
    });
  } catch (error) {
    console.error("auth-email error:", error);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "E-Mail konnte nicht gesendet werden.",
    });
  }
});
