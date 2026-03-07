type AuthEvent =
  | "signin_start"
  | "signin_success"
  | "signin_error"
  | "signup_start"
  | "signup_success"
  | "signup_error"
  | "reset_start"
  | "reset_success"
  | "reset_error"
  | "resend_start"
  | "resend_success"
  | "resend_error";

function safeNow() {
  return new Date().toISOString();
}

function classifyError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("timeout") || msg.includes("connection")) return "network";
  if (msg.includes("rate") || msg.includes("too many")) return "rate_limit";
  if (msg.includes("confirm")) return "confirmation";
  if (msg.includes("password") || msg.includes("credentials")) return "credentials";
  if (msg.includes("email")) return "email";
  return "unknown";
}

function maskEmail(email?: string) {
  if (!email || !email.includes("@")) return undefined;
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

export function trackAuthEvent(event: AuthEvent, payload: { email?: string; error?: string; context?: string } = {}) {
  const entry = {
    ts: safeNow(),
    event,
    email: maskEmail(payload.email),
    context: payload.context,
    errorClass: payload.error ? classifyError(payload.error) : undefined,
  };

  // local ring buffer for debugging/support (no raw secrets)
  try {
    const key = "auth_telemetry_v1";
    const current = JSON.parse(localStorage.getItem(key) || "[]");
    const next = [...current, entry].slice(-120);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore storage issues
  }

  // useful in browser logs
  // eslint-disable-next-line no-console
  console.info("[AUTH_TELEMETRY]", entry);
}
