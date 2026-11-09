import { isIP } from "node:net";
import { runHallAction, type Rpc } from "../_shared/hallenrunde-actions.ts";

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const rpc: Rpc = async (name, args) => {
  if (!url || !key) throw new Error("Hallenrunde storage is not configured");
  const response = await fetch(new URL(`/rest/v1/rpc/${name}`, url), {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args ?? {}),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    console.error("Hallenrunde database error", name, response.status);
    throw new Error("Hallenrunde database request failed");
  }
  return response.status === 204 ? null : response.json();
};

const problem = (status: number, message: string) => Response.json({ message }, {
  status, headers: { "Cache-Control": "no-store" },
});

Deno.serve(async req => {
  if (req.method !== "POST" || req.headers.get("origin") !== "https://www.kletterliga-nrw.de" ||
      !/^application\/json(?:;|$)/i.test(req.headers.get("content-type") ?? "")) {
    return problem(403, "Diese Anfrage ist nicht erlaubt.");
  }
  const reader = req.body?.getReader();
  if (!reader) return problem(400, "Die Anfrage konnte nicht gelesen werden.");

  let data: unknown;
  try {
    const buffer = new Uint8Array(16_000);
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (length + value.length > buffer.length) {
        await reader.cancel();
        return problem(413, "Diese Anfrage ist zu groß.");
      }
      buffer.set(value, length);
      length += value.length;
    }
    data = JSON.parse(new TextDecoder().decode(buffer.subarray(0, length)));
  } catch {
    return problem(400, "Die Anfrage konnte nicht gelesen werden.");
  } finally { reader.releaseLock(); }

  const forwarded = req.headers.get("x-hallenrunde-client-ip") ?? "";
  const gateway = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return runHallAction(rpc, data, {
    cookieHeader: req.headers.get("cookie") ?? undefined,
    address: isIP(forwarded) ? forwarded : gateway,
    secure: true,
  });
});
