const contentType = "application/json; charset=utf-8";
const noStore = { "Content-Type": contentType, "Cache-Control": "no-store" };

function problem(status: number, message: string) {
  return new Response(JSON.stringify({ message }), { status, headers: noStore });
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  if (req.method !== "POST" || origin !== new URL(req.url).origin ||
      !/^application\/json(?:;|$)/i.test(req.headers.get("content-type") ?? "")) {
    return problem(403, "Diese Anfrage ist nicht erlaubt.");
  }

  if (Number(req.headers.get("content-length")) > 16_000) {
    return problem(413, "Diese Anfrage ist zu groß.");
  }
  let body: string;
  try { body = await req.text(); }
  catch { return problem(400, "Die Anfrage konnte nicht gelesen werden."); }
  if (new TextEncoder().encode(body).byteLength > 16_000) {
    return problem(413, "Diese Anfrage ist zu groß.");
  }

  const endpoint = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!endpoint) return problem(503, "Der Speicher ist gerade nicht erreichbar.");
  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)(hallenrunde_2027=[0-9a-f]{64})(?=;|$)/)?.[1];
  const address = req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();
  try {
    const upstream = await fetch(new URL("/functions/v1/hallenrunde-2027", endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.kletterliga-nrw.de",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(address ? { "X-Hallenrunde-Client-IP": address } : {}),
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const headers = new Headers(noStore);
    for (const key of ["set-cookie", "retry-after"]) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return problem(503, "Der Speicher ist gerade nicht erreichbar. Versucht es bitte erneut.");
  }
}
