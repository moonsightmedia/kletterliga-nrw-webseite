import type { ServerResponse } from "node:http";
import { cookie, readHallToken } from "../supabase/functions/_shared/hallenrunde-actions.ts";
import { json, readBody, sendHallResponse, type HallRequest } from "../server/hallenrunde-api.ts";

export default async function handler(req: HallRequest, res: ServerResponse) {
  const origin = req.headers.origin;
  if (req.method !== "POST" || origin !== `https://${req.headers.host}` ||
      !/^application\/json(?:;|$)/i.test(req.headers["content-type"] ?? "")) {
    return json(res, 403, { message: "Diese Anfrage ist nicht erlaubt." });
  }
  let data: unknown;
  try { data = await readBody(req); }
  catch { return json(res, 400, { message: "Die Anfrage konnte nicht gelesen werden." }); }

  const endpoint = process.env.VITE_SUPABASE_URL;
  if (!endpoint) return json(res, 503, { message: "Der Speicher ist gerade nicht erreichbar." });
  const token = readHallToken(req.headers.cookie);
  const address = req.headers["x-vercel-forwarded-for"];
  try {
    const upstream = await fetch(new URL("/functions/v1/hallenrunde-2027", endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.kletterliga-nrw.de",
        ...(token ? { Cookie: `${cookie}=${token}` } : {}),
        ...(typeof address === "string" ? { "X-Hallenrunde-Client-IP": address.split(",")[0].trim() } : {}),
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(8000),
    });
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    for (const key of ["set-cookie", "retry-after"]) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }
    await sendHallResponse(res, new Response(upstream.body, { status: upstream.status, headers }));
  } catch {
    return json(res, 503, { message: "Der Speicher ist gerade nicht erreichbar. Versucht es bitte erneut." });
  }
}
