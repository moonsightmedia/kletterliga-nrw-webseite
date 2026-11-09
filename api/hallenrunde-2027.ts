const contentType = "application/json; charset=utf-8";
const noStore = { "Content-Type": contentType, "Cache-Control": "no-store" };
type NodeRequest = AsyncIterable<Uint8Array> & {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type NodeResponse = {
  writeHead(status: number, headers: Record<string, string>): void;
  end(body: string): void;
};

function problem(status: number, message: string) {
  return new Response(JSON.stringify({ message }), { status, headers: noStore });
}

async function handleRequest(req: Request): Promise<Response> {
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
    // The Supabase gateway can append a cookie scoped to its own domain.
    const hallCookie = upstream.headers.getSetCookie()
      .flatMap(value => value.split(/,(?=\s*[\w-]+=)/))
      .map(value => value.trim().match(/^hallenrunde_2027=([0-9a-f]{64}|);/))
      .find(Boolean);
    if (hallCookie) {
      const token = hallCookie[1];
      headers.set("Set-Cookie", `hallenrunde_2027=${token}; Max-Age=${token ? 28800 : 0}; Path=/api/hallenrunde-2027; HttpOnly; SameSite=Strict; Secure`);
    }
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) headers.set("Retry-After", retryAfter);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return problem(503, "Der Speicher ist gerade nicht erreichbar. Versucht es bitte erneut.");
  }
}

export default async function handler(req: Request | NodeRequest, res?: NodeResponse) {
  // Vercel's /api runtime may supply a Node request rather than a Fetch Request.
  if (typeof (req as Request).headers.get === "function") return handleRequest(req as Request);
  if (!res) return problem(500, "Die Anfrage konnte nicht verarbeitet werden.");
  const nodeRequest = req as NodeRequest;
  let response: Response;
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(nodeRequest.headers)) {
      if (typeof value === "string") headers.set(name, value);
      else if (Array.isArray(value)) headers.set(name, value.join(", "));
    }
    const host = headers.get("host");
    if (!host) throw new Error("Missing request host");
    if (Number(headers.get("content-length")) > 16_000) {
      response = problem(413, "Diese Anfrage ist zu groß.");
    } else {
      let body: string | undefined;
      if (nodeRequest.method === "POST") {
        if (nodeRequest.body !== undefined) {
          body = typeof nodeRequest.body === "string" ? nodeRequest.body : JSON.stringify(nodeRequest.body);
        } else {
          const chunks: Uint8Array[] = [];
          let size = 0;
          for await (const chunk of nodeRequest) {
            size += chunk.length;
            if (size > 16_000) break;
            chunks.push(chunk);
          }
          body = size > 16_000 ? undefined : Buffer.concat(chunks).toString("utf8");
        }
      }
      const url = `https://${host}/api/hallenrunde-2027`;
      response = body === undefined && nodeRequest.method === "POST"
        ? problem(413, "Diese Anfrage ist zu groß.")
        : await handleRequest(new Request(url, { method: nodeRequest.method, headers, body }));
    }
  } catch {
    response = problem(400, "Die Anfrage konnte nicht gelesen werden.");
  }
  let body: string;
  try { body = await response.text(); }
  catch {
    response = problem(503, "Der Speicher ist gerade nicht erreichbar.");
    body = await response.text();
  }
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(body);
}
