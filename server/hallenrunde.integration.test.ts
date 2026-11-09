// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { blankReply } from "../src/hallenrunde/reply.js";
import { createHallenrundeHandler } from "./hallenrunde-api.js";
import { localAdminReport, localHallRpc, openLocalHallenrunde, previewArchivedId, previewParticipantId } from "./hallenrunde-local.js";

let directory: string;
let db: Awaited<ReturnType<typeof openLocalHallenrunde>>;
let server: Server;
let base: string;

async function start() {
  db = await openLocalHallenrunde(directory, [], true);
  server = createServer(createHallenrundeHandler(localHallRpc(db), false));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Local server address missing");
  base = `http://127.0.0.1:${address.port}`;
}

async function stop() {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await db.close();
}

function post(body: object, cookie = "", origin = base) {
  return fetch(`${base}/api/hallenrunde-2027`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => { directory = await mkdtemp(path.join(tmpdir(), "hallenrunde-")); await start(); }, 20_000);
afterAll(async () => { if (server?.listening) await stop(); if (directory) await rm(directory, { recursive: true, force: true }); });

test("stores one durable reply per hall and exposes it only to that hall or a league admin", async () => {
  const access = await post({ action: "access", code: "demo-27" });
  expect(access.status).toBe(200);
  const cookieHeader = access.headers.get("set-cookie")!;
  expect(cookieHeader).toMatch(/HttpOnly; SameSite=Strict/);
  const cookie = cookieHeader.split(";")[0];
  expect(await access.json()).toEqual({ hall: "Demo-Kletterhalle Köln", saved: null });
  const reply = { ...blankReply, decision: "yes", periodKind: "standard", note: "Erste Testantwort" };
  expect((await post({ action: "reply", reply })).status).toBe(401);
  expect((await post({ action: "reply", reply }, cookie, "https://example.invalid")).status).toBe(403);
  expect((await post({ action: "reply", reply: blankReply }, cookie)).status).toBe(422);
  const missingConditions = await post({ action: "reply", reply: { ...reply, conditions: "  " } }, cookie);
  expect(missingConditions.status).toBe(422);
  expect(await missingConditions.json()).toMatchObject({ errors: { conditions: expect.any(String) } });
  expect((await post({ action: "reply", reply }, cookie)).status).toBe(200);

  await stop();
  await start();
  const update = await post({ action: "reply", hall: "Demo-Kletterhalle OWL", reply: {
    ...reply, conditions: "  Wenn die Routen bis Mai fertig sind.  ", note: "Aktualisierte Testantwort",
  } }, cookie);
  expect(update.status).toBe(200);
  const current = await update.json();
  expect(current.reply).toMatchObject({
    from: "2027-05-01", to: "2027-08-31", note: "Aktualisierte Testantwort",
    conditions: "Wenn die Routen bis Mai fertig sind.", blockedPeriods: [],
  });
  expect(await (await post({ action: "access", code: "TEST27" })).json()).toEqual({ hall: "Demo-Kletterhalle OWL", saved: null });
  expect(await (await post({ action: "access", code: "DEMO27" })).json()).toEqual({ hall: "Demo-Kletterhalle Köln", saved: current });
  expect(await localAdminReport(db)).toEqual([
    { id: expect.any(String), enabled: true, hall: "Demo-Kletterhalle Köln", saved: current },
    { id: expect.any(String), enabled: true, hall: "Demo-Kletterhalle OWL", saved: null },
  ]);
  expect(await db.query("select count(*)::int as count from public.hallenrunde_2027_replies"))
    .toMatchObject({ rows: [{ count: 1 }] });
  expect((await post({ action: "leave" }, cookie)).status).toBe(200);
  expect((await post({ action: "reply", reply }, cookie)).status).toBe(401);
}, 20_000);

test("enforces grants and rejects participant or archived admin access at the database", async () => {
  const withRole = (role: "anon" | "authenticated" | "service_role", sql: string) => db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query(sql);
  });
  await expect(localAdminReport(db, previewParticipantId)).rejects.toMatchObject({ code: "42501" });
  await expect(localAdminReport(db, previewArchivedId)).rejects.toMatchObject({ code: "42501" });
  await expect(withRole("anon", "select public.admin_hallenrunde_2027_report()")).rejects.toMatchObject({ code: "42501" });
  await expect(withRole("authenticated", "select public.hallenrunde_2027_access(null,null,null,null)")).rejects.toMatchObject({ code: "42501" });
  await expect(withRole("service_role", "select * from public.hallenrunde_2027_halls")).rejects.toMatchObject({ code: "42501" });
  await expect(withRole("authenticated", "select * from public.hallenrunde_2027_replies")).rejects.toMatchObject({ code: "42501" });
});

test("limits invalid code attempts", async () => {
  await db.exec("truncate public.hallenrunde_2027_attempts");
  for (let i = 0; i < 12; i++) expect((await post({ action: "access", code: "FALSCH" })).status).toBe(401);
  const limited = await post({ action: "access", code: "FALSCH" });
  expect(limited.status).toBe(429);
  expect(limited.headers.get("retry-after")).toBe("60");
});
