import type { IncomingMessage, ServerResponse } from "node:http";
import { runHallAction, type Rpc } from "../supabase/functions/_shared/hallenrunde-actions.ts";
export { hashHallCode } from "../supabase/functions/_shared/hallenrunde-actions.ts";
export type { Rpc } from "../supabase/functions/_shared/hallenrunde-actions.ts";

export type HallRequest = IncomingMessage & { body?: unknown };

export async function sendHallResponse(res: ServerResponse, response: Response) {
  const body = await response.text();
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(body);
}

export function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}

export async function readBody(req: HallRequest) {
  const limit = 16_000;
  if (Number(req.headers["content-length"]) > limit) throw new Error("Body too large");
  if (req.body !== undefined) {
    const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > limit) throw new Error("Body too large");
    return JSON.parse(raw);
  }
  let length = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const bytes = Buffer.from(chunk);
    length += bytes.length;
    if (length > limit) throw new Error("Body too large");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createHallenrundeHandler(rpc: Rpc, secure: boolean) {
  return async (req: HallRequest, res: ServerResponse) => {
    const sameOrigin = req.headers.origin === `${secure ? "https" : "http"}://${req.headers.host}`;
    if (req.method !== "POST" || !sameOrigin || !/^application\/json(?:;|$)/i.test(req.headers["content-type"] ?? "")) {
      return json(res, 403, { message: "Diese Anfrage ist nicht erlaubt." });
    }

    let data: unknown;
    try { data = await readBody(req); }
    catch { return json(res, 400, { message: "Die Anfrage konnte nicht gelesen werden." }); }
    const response = await runHallAction(rpc, data, {
      cookieHeader: req.headers.cookie,
      address: req.socket.remoteAddress,
      secure,
    });
    await sendHallResponse(res, response);
  };
}
