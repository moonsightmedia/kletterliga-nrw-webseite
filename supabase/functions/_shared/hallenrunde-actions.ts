import { createHash, randomBytes } from "node:crypto";
import { validateReply } from "./hallenrunde-reply.ts";

export type Rpc = (name: string, args?: Record<string, unknown>) => Promise<unknown>;
export const cookie = "hallenrunde_2027";
const cookiePath = "/api/hallenrunde-2027";
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
export const hashHallCode = (code: string) => sha256(code.trim().toUpperCase().replace(/[\s-]/g, ""));
export const readHallToken = (header: string | undefined) =>
  header?.match(/(?:^|;\s*)hallenrunde_2027=([0-9a-f]{64})(?=;|$)/)?.[1];

export async function runHallAction(
  rpc: Rpc, data: unknown, { cookieHeader, address, secure }: { cookieHeader?: string; address?: string; secure: boolean },
) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  const json = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers });
  if (!data || typeof data !== "object" || !("action" in data)) {
    return json(400, { message: "Die Anfrage ist unvollständig." });
  }

  const token = readHallToken(cookieHeader);
  const tokenHash = token ? sha256(token) : null;
  const setCookie = (key: string, age: number) => headers.set("Set-Cookie",
    `${cookie}=${key}; Max-Age=${age}; Path=${cookiePath}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`);
  try {
    if (data.action === "access") {
      const code = "code" in data && typeof data.code === "string" && data.code.length <= 40 ? data.code : "";
      const nextToken = randomBytes(32).toString("hex");
      // An address-derived bucket changes daily; raw IPs are never persisted.
      const bucket = sha256(`${new Date().toISOString().slice(0, 10)}:${address ?? "unknown"}`);
      const result = await rpc("hallenrunde_2027_access", {
        p_code: hashHallCode(code), p_token: sha256(nextToken), p_previous: tokenHash, p_bucket: bucket,
      }) as { status: string; hall?: string; saved?: unknown };
      if (result.status === "rate_limited") {
        headers.set("Retry-After", "60");
        return json(429, { message: "Zu viele Versuche. Wartet bitte eine Minute und versucht es erneut." });
      }
      if (result.status === "invalid_code") return json(401, { message: "Der Hallencode stimmt nicht. Prüft ihn und versucht es noch einmal." });
      if (result.status !== "ok" || !result.hall) throw new Error("Unexpected access result");
      setCookie(nextToken, 8 * 3600);
      return json(200, { hall: result.hall, saved: result.saved ?? null });
    }

    if (data.action === "leave") {
      setCookie("", 0);
      if (tokenHash) await rpc("hallenrunde_2027_leave", { p_token: tokenHash });
      return json(200, { ok: true });
    }

    if (data.action !== "reply") return json(404, { message: "Diese Aktion gibt es nicht." });
    const expired = () => json(401, { message: "Eure Sitzung ist abgelaufen. Öffnet das Formular erneut mit eurem Hallencode." });
    if (!tokenHash) return expired();
    const { reply, errors } = validateReply("reply" in data ? data.reply : undefined);
    if (!reply) return json(422, { message: "Bitte prüft die markierten Felder.", errors });
    const saved = await rpc("hallenrunde_2027_save", { p_token: tokenHash, p_reply: reply });
    return saved ? json(200, saved) : expired();
  } catch {
    return json(503, { message: "Der Speicher ist gerade nicht erreichbar. Versucht es bitte erneut." });
  }
}
