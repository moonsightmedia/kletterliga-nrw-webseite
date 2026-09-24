// Test-only PostgreSQL-compatible integration gate. Pass the path to a temporary
// @electric-sql/pglite install; no project dependency or remote database is used.
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const pgliteDir = process.argv[2];
if (!pgliteDir) throw new Error("Usage: node scripts/qa-competition-sql.mjs <temporary-pglite-package-directory>");
const { PGlite } = await import(pathToFileURL(path.join(pgliteDir, "dist", "index.js")));
const db = new PGlite();
let passed = 0;
const assert = (condition, label) => { if (!condition) throw new Error(`FAIL: ${label}`); passed += 1; process.stdout.write(`PASS: ${label}\n`); };
const query = async (sql, params = []) => db.query(sql, params);
const expectError = async (sql, marker, label) => {
  try { await query(sql); } catch (error) {
    assert(String(error.message).includes(marker), `${label} (${marker})`);
    return;
  }
  throw new Error(`FAIL: ${label}; statement was accepted`);
};

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select coalesce(current_setting('request.jwt.claims',true)::jsonb->>'role','') $$;
    create table public.profiles(
      id uuid primary key references auth.users(id), role text not null, first_name text, last_name text,
      participation_activated_at timestamptz, archived_at timestamptz
    );
    create table public.finale_registrations(
      id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id),
      season_year text not null, registration_status text not null
    );
    create table public.semifinal_eligibility(
      season_year text not null, profile_id uuid not null references public.profiles(id), status text not null,
      league text, class_label text, primary key(season_year,profile_id)
    );
    create table public.admin_settings(
      id uuid primary key default gen_random_uuid(), season_year text, qualification_start date,
      qualification_end date, finale_enabled boolean, finale_registration_deadline date,
      finale_date date, updated_at timestamptz default now()
    );
    create function public.current_user_role() returns text language sql stable security definer set search_path=public
      as $$ select coalesce((select role from public.profiles where id=auth.uid()),'participant') $$;
    create function public.is_league_admin() returns boolean language sql stable security definer set search_path=public
      as $$ select public.current_user_role()='league_admin' $$;
  `);
  const migration = await readFile(path.resolve("supabase/migrations/20260923160000_competition_day.sql"), "utf8");
  await db.exec(migration);
  const draftMigration = await readFile(path.resolve("supabase/migrations/20260923180000_competition_route_draft.sql"), "utf8");
  await db.exec(draftMigration);
  const judgeMigration = await readFile(path.resolve("supabase/migrations/20260924110000_competition_judge_shared_access.sql"), "utf8");
  await db.exec(judgeMigration);
  const sqlSuite = await readFile(path.resolve("supabase/tests/competition_day.sql"), "utf8");
  try { await db.exec(sqlSuite); }
  catch (error) { process.stderr.write(`competition_day.sql failed: ${error.message} ${error.where ?? ""}\n`); throw error; }
  process.stdout.write("PASS: supabase/tests/competition_day.sql passed in the minimal PGlite schema.\n");
  const draftSuite = await readFile(path.resolve("supabase/tests/competition_route_draft.sql"), "utf8");
  try { await db.exec(draftSuite); }
  catch (error) { process.stderr.write(`competition_route_draft.sql failed: ${error.message} ${error.where ?? ""}\n`); throw error; }
  process.stdout.write("PASS: supabase/tests/competition_route_draft.sql passed in the minimal PGlite schema.\n");

  await query(`insert into auth.users(id) values
    ('99999999-6000-4000-8000-000000000001'),('99999999-6000-4000-8000-000000000002'),
    ('99999999-6000-4000-8000-000000000003'),('99999999-6000-4000-8000-000000000004')`);
  await query(`insert into public.profiles(id,role,first_name,last_name,participation_activated_at) values
    ('99999999-6000-4000-8000-000000000001','league_admin','Casey','Admin',now()),
    ('99999999-6000-4000-8000-000000000002','participant','Alex','One',now()),
    ('99999999-6000-4000-8000-000000000003','participant','Alex','Two',now()),
    ('99999999-6000-4000-8000-000000000004','participant','Alex','Cancelled',now())`);
  await query(`insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label) values
    ('2026','99999999-6000-4000-8000-000000000002','eligible','lead','Youth'),
    ('2026','99999999-6000-4000-8000-000000000003','eligible','lead','Youth'),
    ('2026','99999999-6000-4000-8000-000000000004','eligible','toprope','Cancelled class')`);
  await query(`insert into public.finale_registrations(profile_id,season_year,registration_status) values
    ('99999999-6000-4000-8000-000000000002','2026','registered'),
    ('99999999-6000-4000-8000-000000000003','2026','registered'),
    ('99999999-6000-4000-8000-000000000004','2026','cancelled')`);
  await query("insert into public.admin_settings(season_year) values('2026')");

  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000001","role":"authenticated"}',false)`);
  await db.exec("set role authenticated");
  let result = await query(`select public.get_competition_admin('2026') as data`);
  assert(result.rows[0].data.config.zone_points.length === 11 && result.rows[0].data.config.zone_points.every((point) => point === 0), "empty admin config supplies 11 placeholder zone scores and no event");
  result = await query(`select public.get_competition_day('2026') as data`);
  assert(result.rows[0].data.event === null, "no event is seeded automatically");

  const draftRoutes = Array.from({ length: 14 }, (_, index) => ({ number: index + 1, name: `Route ${index + 1}`, grade: "", color: "" }));
  await query("select public.save_competition_route_draft('2026',$1::jsonb)", [JSON.stringify(draftRoutes)]);
  result = await query("select public.get_competition_admin('2026') as data");
  assert(result.rows[0].data.config.routes.length === 14 && result.rows[0].data.config.assignments.length === 0, "route-only draft saves 14 placeholders without inventing assignments");
  result = await query("select public.get_competition_day('2026') as data");
  assert(result.rows[0].data.event.phase === "draft" && result.rows[0].data.event.opened_at === null, "route-only draft keeps event unopened");

  const judgeCode = "AbCdEfGhJkMnPqRsTuVwXyZ2";
  const rotatedCode = "QwErTyUiOpAsDfGhJkLzXcV4";
  result = await query("select public.get_competition_judge_access_status('2026') as configured");
  assert(result.rows[0].configured === false, "judge access is disabled until the admin creates a code");
  await query("select public.set_competition_judge_password('2026',$1)", [judgeCode]);
  result = await query("select public.get_competition_judge_access_status('2026') as configured");
  assert(result.rows[0].configured === true, "admin can enable shared judge access without opening scoring");
  await db.exec("reset role");
  await query("select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claims','{\"role\":\"anon\"}',false)");
  await db.exec("set role anon");
  await expectError("select * from public.competition_day_judge_access", "permission denied", "anon cannot read the stored judge hash");
  await expectError("select public.get_competition_judge_routes('2026','000000000000000000000000')", "COMPETITION_JUDGE_PASSWORD_INVALID", "invalid shared judge code is rejected");
  result = await query("select public.get_competition_judge_routes('2026',$1) as data", [judgeCode]);
  assert(result.rows[0].data.routes.length === 14 && result.rows[0].data.event.phase === "draft", "anon with code reads only the 14 route QR entries and event phase");
  assert(!('results' in result.rows[0].data) && !('staff' in result.rows[0].data), "shared judge response excludes results and staff");
  await expectError("select public.set_competition_judge_password('2026','000000000000000000000000')", "permission denied", "anon cannot rotate the judge code");
  await expectError("select public.submit_competition_result('2026',null,0,false,'x')", "permission denied", "anon judge access cannot submit results");
  await db.exec("reset role");
  await query("select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',false), set_config('request.jwt.claims','{\"sub\":\"99999999-6000-4000-8000-000000000001\",\"role\":\"authenticated\"}',false)");
  await db.exec("set role authenticated");
  await query("select public.set_competition_judge_password('2026',$1)", [rotatedCode]);
  await db.exec("reset role");
  await db.exec("set role anon");
  await expectError(`select public.get_competition_judge_routes('2026','${judgeCode}')`, "COMPETITION_JUDGE_PASSWORD_INVALID", "old shared code is invalid after rotation");
  result = await query("select public.get_competition_judge_routes('2026',$1) as data", [rotatedCode]);
  assert(result.rows[0].data.routes.length === 14, "rotated code opens the same untouched routes");
  await db.exec("reset role");
  await query("select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',false), set_config('request.jwt.claims','{\"sub\":\"99999999-6000-4000-8000-000000000001\",\"role\":\"authenticated\"}',false)");
  await db.exec("set role authenticated");

  const routes = Array.from({ length: 12 }, (_, index) => ({ number: index + 1, name: `Route ${index + 1}`, grade: "6a", color: "blue" }));
  const config = {
    routes,
    assignments: [
      { league: "lead", class_label: "Youth", route_numbers: [1, 2, 3, 4, 5] },
      { league: "toprope", class_label: "Cancelled class", route_numbers: [6, 7, 8, 9, 10] },
    ],
    zone_points: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], flash_bonus: 2,
  };
  const missingClassConfig = { ...config, assignments: [config.assignments[1]] };
  await query(`select public.save_competition_config('2026',$1::jsonb)`, [JSON.stringify(missingClassConfig)]);
  await expectError(`select public.set_competition_phase('2026','open')`, "keine Routenzuordnung", "opening rejects a missing active registered class mapping");
  const duplicateClassConfig = { ...config, assignments: [config.assignments[0], { ...config.assignments[0], route_numbers: [6, 7, 8, 9, 10] }] };
  await expectError(`select public.save_competition_config('2026','${JSON.stringify(duplicateClassConfig)}'::jsonb)`, "duplicate key", "duplicate class assignment is rejected atomically");
  await query(`select public.save_competition_config('2026',$1::jsonb)`, [JSON.stringify(config)]);
  await query(`select public.set_competition_staff('2026','99999999-6000-4000-8000-000000000001',true)`);
  await query(`select public.set_competition_phase('2026','open')`);
  await query("reset role");

  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000001","role":"authenticated"}',false)`);
  await db.exec("set role authenticated");
  result = await query(`select public.get_competition_staff_routes('2026') as data`);
  const qrToken = result.rows[0].data[0].qr_token;
  const routeId = result.rows[0].data[0].id;
  const wrongClassRoute = result.rows[0].data[5].id;
  result = await query(`select public.get_competition_day('2026') as data`);
  assert(result.rows[0].data.routes.length === 12 && !JSON.stringify(result.rows[0].data).includes(qrToken), "staff can see physical routes without QR tokens in ordinary day state");
  await query(`select public.set_competition_phase('2026','closed')`);
  result = await query(`select public.get_competition_day('2026') as data`);
  const firstOpenedAt = result.rows[0].data.event.opened_at;
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000002',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000002","role":"authenticated"}',false)`);
  await expectError(`select public.submit_competition_result('2026','${routeId}',10,true,'${qrToken}')`, "COMPETITION_NOT_OPEN", "closed event rejects participant submissions");
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000001","role":"authenticated"}',false)`);
  await query(`select public.set_competition_phase('2026','open')`);
  result = await query(`select public.get_competition_day('2026') as data`);
  assert(result.rows[0].data.event.opened_at === firstOpenedAt, "pause and reopen preserve the first opening timestamp");

  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000002',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000002","role":"authenticated"}',false)`);
  result = await query(`select public.get_competition_day('2026') as data`);
  assert(result.rows[0].data.eligible && result.rows[0].data.routes.length === 5 && result.rows[0].data.results.length === 0,
    "active registered participant receives only their five mapped routes");
  assert(!JSON.stringify(result.rows[0].data).includes(qrToken), "participant RPC never includes the QR secret");
  await expectError(`select * from public.competition_day_routes`, "permission denied", "authenticated participant cannot read raw competition tables");
  await expectError(`insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points) values('00000000-0000-0000-0000-000000000000','${routeId}','99999999-6000-4000-8000-000000000002',0,false,0)`, "permission denied", "authenticated participant cannot write raw results");
  await expectError(`select public.save_competition_config('2026','{}'::jsonb)`, "LEAGUE_ADMIN_REQUIRED", "nonadmin cannot save configuration");
  await expectError(`select public.set_competition_staff('2026','99999999-6000-4000-8000-000000000002',true)`, "LEAGUE_ADMIN_REQUIRED", "nonadmin cannot assign staff");
  await expectError(`select public.set_competition_phase('2026','closed')`, "LEAGUE_ADMIN_REQUIRED", "nonadmin cannot change event phase");
  await expectError(`select public.correct_competition_result('00000000-0000-0000-0000-000000000000',0,false,'test')`, "LEAGUE_ADMIN_REQUIRED", "nonadmin cannot correct results");
  await expectError(`select public.get_competition_staff_routes('2026')`, "COMPETITION_STAFF_REQUIRED", "participant cannot retrieve staff QR secrets");
  await expectError(`select public.submit_competition_result('2026','${wrongClassRoute}',10,true,'${qrToken}')`, "COMPETITION_QR_INVALID", "participant cannot submit against a route outside their class");
  await expectError(`select public.submit_competition_result('2026','${routeId}',null,false,'${qrToken}')`, "Zone muss", "null zone is rejected");
  await expectError(`select public.submit_competition_result('2026','${routeId}',10,null,'${qrToken}')`, "Zone muss", "null flash flag is rejected");
  await expectError(`select public.submit_competition_result('2026','${routeId}',10,true,'wrong-token')`, "COMPETITION_QR_INVALID", "wrong QR secret is rejected");
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000004',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000004","role":"authenticated"}',false)`);
  result = await query(`select public.get_competition_day('2026') as data`);
  assert(!result.rows[0].data.eligible && result.rows[0].data.routes.length === 0, "cancelled registration receives no participant route set");
  await expectError(`select public.submit_competition_result('2026','${routeId}',10,true,'${qrToken}')`, "COMPETITION_NOT_ELIGIBLE", "cancelled registration cannot submit");
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000002',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000002","role":"authenticated"}',false)`);

  result = await query(`select public.submit_competition_result('2026',$1::uuid,10,true,$2) as data`, [routeId, qrToken]);
  assert(result.rows[0].data.points === 12, "zone 10 flash score uses configured zone points and bonus");
  await query(`select public.submit_competition_result('2026',$1::uuid,10,true,$2)`, [routeId, qrToken]);
  await expectError(`select public.submit_competition_result('2026','${routeId}',9,false,'${qrToken}')`, "COMPETITION_RESULT_IMMUTABLE", "same result retry is idempotent and changed retry is rejected");
  result = await query(`select public.list_competition_standings('2026') as data`);
  assert(result.rows[0].data.length === 2 && result.rows[0].data.some((row) => row.points === 0 && row.completed_routes === 0), "standings include registered eligible participants with no results");
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000003',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000003","role":"authenticated"}',false)`);
  await query(`select public.submit_competition_result('2026','${routeId}',10,true,'${qrToken}')`);
  result = await query(`select public.list_competition_standings('2026') as data`);
  assert(result.rows[0].data.length === 2 && result.rows[0].data.every((row) => row.rank === 1), "rank() gives tied participants the same rank");
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000002',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000002","role":"authenticated"}',false)`);
  await expectError(`select public.submit_competition_result('2026','${routeId}',9,true,'${qrToken}')`, "Zone muss", "flash is restricted to zone 10");
  await query("reset role");

  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000001","role":"authenticated"}',false)`);
  await db.exec("set role authenticated");
  result = await query(`select public.get_competition_day('2026') as data`);
  await query(`select public.correct_competition_result($1::uuid,9,false,'Judge corrected transcription')`, [result.rows[0].data.results[0].id]);
  await db.exec("reset role");
  result = await query(`select count(*)::int as count, min(reason) as reason, min(before_data->>'zone') as before_zone, min(after_data->>'zone') as after_zone from public.competition_day_result_audit`);
  assert(result.rows[0].count === 1 && result.rows[0].reason === "Judge corrected transcription" && result.rows[0].before_zone === "10" && result.rows[0].after_zone === "9", "admin correction records before, after and reason");
  await db.exec("set role authenticated");
  await query(`select public.set_competition_staff('2026','99999999-6000-4000-8000-000000000002',true)`);
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000002',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000002","role":"authenticated"}',false)`);
  result = await query(`select public.get_competition_day('2026') as data`);
  assert(result.rows[0].data.is_staff && result.rows[0].data.routes.length === 5, "eligible participant volunteer still receives only own five routes");
  result = await query(`select public.get_competition_staff_routes('2026') as data`);
  assert(result.rows[0].data.length === 12, "assigned active participant can retrieve staff QR routes");
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000001","role":"authenticated"}',false)`);
  await query(`select public.set_competition_staff('2026','99999999-6000-4000-8000-000000000002',false)`);
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000002',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000002","role":"authenticated"}',false)`);
  await expectError(`select public.get_competition_staff_routes('2026')`, "COMPETITION_STAFF_REQUIRED", "staff can be revoked while sporting configuration remains frozen");
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000001","role":"authenticated"}',false)`);
  await query(`select public.set_competition_staff('2026','99999999-6000-4000-8000-000000000002',true)`);
  await db.exec("reset role");
  await query(`update public.profiles set archived_at=now() where id='99999999-6000-4000-8000-000000000002'`);
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000002',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000002","role":"authenticated"}',false)`);
  await db.exec("set role authenticated");
  await expectError(`select public.get_competition_staff_routes('2026')`, "COMPETITION_STAFF_REQUIRED", "archived staff account cannot retrieve QR secrets");
  await expectError(`select public.submit_competition_result('2026','${routeId}',10,true,'${qrToken}')`, "COMPETITION_NOT_ELIGIBLE", "archived participant cannot submit");
  await db.exec("reset role");
  await query(`select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',false),
    set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000001","role":"authenticated"}',false)`);
  await db.exec("set role authenticated");
  await query(`select public.set_competition_staff('2026','99999999-6000-4000-8000-000000000002',false)`);
  result = await query(`select public.get_competition_admin('2026') as data`);
  assert(!result.rows[0].data.staff.some((member) => member.profile_id === "99999999-6000-4000-8000-000000000002"), "admin can revoke an archived staff account");
  await expectError(`select public.save_competition_config('2026','${JSON.stringify(config)}'::jsonb)`, "COMPETITION_CONFIG_LOCKED", "opened sporting configuration stays immutable");

  await db.exec("reset role");
  await db.exec("set role anon");
  await expectError(`select public.get_competition_day('2026')`, "permission denied", "anon cannot execute competition RPCs");
  process.stdout.write(`PASS: ${passed} PGlite assertions. This minimal harness does not model full Supabase grants, PostgREST, or auth triggers.\n`);
} finally {
  await db.close();
}
