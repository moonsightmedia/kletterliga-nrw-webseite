import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { hashHallCode, type Rpc } from "./hallenrunde-api.js";

export const previewAdminId = "00000000-0000-4000-8000-000000002027";
export const previewParticipantId = "00000000-0000-4000-8000-000000002028";
export const previewArchivedId = "00000000-0000-4000-8000-000000002029";
const localMigration = "supabase/migrations/20261109120000_hallenrunde_2027.sql";

type LocalInvite = { name: string; codeHash: string };

export async function openLocalHallenrunde(dataDir?: string, invites: LocalInvite[] = [], seedDemoHalls = false) {
  const db = new PGlite(dataDir);
  try {
    const { rows } = await db.query<{ initialized: boolean }>(
      "select to_regclass('public.hallenrunde_2027_halls') is not null as initialized",
    );
    if (!rows[0].initialized) {
      // Local substitutes for the existing Supabase auth/profile objects the migration references.
      await db.exec(`
        create role anon;
        create role authenticated;
        create role service_role;
        create schema auth;
        create function auth.uid() returns uuid language sql stable as
          $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        create table public.profiles(id uuid primary key, role text not null, archived_at timestamptz);
        create function public.is_league_admin() returns boolean language sql stable as
          $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'league_admin') $$;
        insert into public.profiles values
          ('${previewAdminId}', 'league_admin', null),
          ('${previewParticipantId}', 'participant', null),
          ('${previewArchivedId}', 'league_admin', now());
      `);
      await db.exec(await readFile(localMigration, "utf8"));
    }
    for (const [hall, code] of [["Demo-Kletterhalle Köln", "DEMO27"], ["Demo-Kletterhalle OWL", "TEST27"]]) {
      const args = [hall, hashHallCode(code)];
      if (seedDemoHalls) {
        await db.query("insert into public.hallenrunde_2027_halls(name, code_hash) values ($1, $2) on conflict (name) do nothing", args);
      } else {
        await db.query("delete from public.hallenrunde_2027_halls where name = $1 and code_hash = $2", args);
      }
    }
    if (invites.length) {
      await db.transaction(async tx => {
        for (const { name, codeHash } of invites) {
          await tx.query("insert into public.hallenrunde_2027_halls(name, code_hash) values ($1, $2) on conflict (name) do nothing",
            [name, codeHash]);
          const { rows } = await tx.query<{ matches: boolean }>(
            "select enabled and code_hash = $2 as matches from public.hallenrunde_2027_halls where name = $1",
            [name, codeHash]);
          if (!rows[0]?.matches) throw new Error("Local hall import conflicts with an existing access code");
        }
      });
    }
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

export function localHallRpc(db: PGlite): Rpc {
  return (name, args = {}) => db.transaction(async tx => {
    await tx.exec("set local role service_role");
    const { rows } = name === "hallenrunde_2027_access"
      ? await tx.query<{ result: unknown }>("select public.hallenrunde_2027_access($1,$2,$3,$4) as result",
        [args.p_code, args.p_token, args.p_previous, args.p_bucket])
      : name === "hallenrunde_2027_save"
        ? await tx.query<{ result: unknown }>("select public.hallenrunde_2027_save($1,$2::jsonb) as result",
          [args.p_token, JSON.stringify(args.p_reply)])
        : name === "hallenrunde_2027_leave"
          ? await tx.query<{ result: unknown }>("select public.hallenrunde_2027_leave($1) as result", [args.p_token])
          : (() => { throw new Error("Unknown hall RPC"); })();
    return rows[0].result;
  });
}

export function localAdminReport(db: PGlite, userId = previewAdminId) {
  return db.transaction(async tx => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    const { rows } = await tx.query<{ result: unknown }>("select public.admin_hallenrunde_2027_report() as result");
    return rows[0].result;
  });
}
