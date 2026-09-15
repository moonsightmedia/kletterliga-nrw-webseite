import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Execute the actual isolated function without booting Deno's HTTP server or
// importing providers. Supabase is a synthetic in-memory boundary, not a live DB.
const source = readFileSync(resolve("supabase/functions/participant-email-consent/index.ts"), "utf8");
const start = source.indexOf("async function ensureProfileRow(");
const end = source.indexOf("\nasync function fetchConsent(", start);
if (start < 0 || end < 0) throw new Error("Could not locate the profile initialization boundary");
const compiled = ts.transpileModule(`(${source.slice(start, end).trim()})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

const user = {
  id: "synthetic-participant",
  email: "synthetic@test.invalid",
  user_metadata: {
    first_name: "Changed", last_name: "Name", birth_date: "2014-01-01", gender: "w", league: "lead", home_gym_id: "changed-gym",
  },
};

describe("participant email consent cannot rewrite official profile fields", () => {
  it("leaves an existing profile unchanged even if user metadata alters age, gender and league", async () => {
    const existing = { id: user.id, first_name: "Official", last_name: "Person", birth_date: "2000-01-01", gender: "m", league: "toprope", home_gym_id: "official-gym" };
    let stored = { ...existing };
    const upsert = vi.fn(async (seed, options) => {
      if (!options?.ignoreDuplicates) stored = { ...stored, ...seed };
      return { error: null };
    });
    const ensure = runInNewContext(compiled, { supabase: { from: () => ({ upsert }) } }) as (value: typeof user) => Promise<void>;
    await ensure(user);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ id: user.id }), { onConflict: "id", ignoreDuplicates: true });
    expect(stored).toEqual(existing);
  });

  it("still prepares a missing participant profile", async () => {
    let stored: unknown = null;
    const upsert = vi.fn(async (seed) => { stored = seed; return { error: null }; });
    const ensure = runInNewContext(compiled, { supabase: { from: () => ({ upsert }) } }) as (value: typeof user) => Promise<void>;
    await ensure(user);
    expect(stored).toMatchObject({ id: user.id, email: user.email, birth_date: "2014-01-01", gender: "w", league: "lead" });
  });

  it("propagates profile creation failures without pretending initialization succeeded", async () => {
    const ensure = runInNewContext(compiled, { supabase: { from: () => ({ upsert: async () => ({ error: { message: "synthetic failure" } }) }) } }) as (value: typeof user) => Promise<void>;
    await expect(ensure(user)).rejects.toThrow("Teilnehmerprofil konnte nicht vorbereitet");
  });
});
