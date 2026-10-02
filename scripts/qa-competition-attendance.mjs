// Synthetic PostgreSQL integration races. No remote URLs or real account credentials.
import { execFile } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import path from "node:path";
import { existsSync } from "node:fs";

const database = process.argv[2];
if (!/^kletterliga_semifinal_test_attendance_\d+$/.test(database ?? "")) {
  throw new Error("Pass an isolated kletterliga_semifinal_test_attendance_<digits> database name.");
}
const bundledPsql = path.join(process.env.LOCALAPPDATA ?? "", "Kletterliga-QA", "postgres-20260915", "pgsql", "bin", "psql.exe");
const executable = existsSync(bundledPsql) ? bundledPsql : "psql";
const baseArgs = ["-h", "127.0.0.1", "-p", "54329", "-U", "postgres", "-d", database, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1"];
const run = (sql) => new Promise((resolve) => {
  execFile(executable, [...baseArgs, "-c", sql], { windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    resolve({ code: error?.code ?? 0, output: stdout.trim(), error: stderr });
  });
});
const requireSuccess = (result, label) => {
  if (result.code !== 0) throw new Error(`${label} failed; PostgreSQL exit ${result.code}.`);
};
const pass = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
};
const profile = randomUUID();
const admin = randomUUID();
const season = `QA-RACE-${randomUUID().slice(0, 8)}`;
const credential = randomBytes(24).toString("hex");
const replacement = randomBytes(24).toString("hex");
const adminClaims = `do $$ begin perform set_config('request.jwt.claim.sub','${admin}',false); perform set_config('request.jwt.claims','{"sub":"${admin}","role":"authenticated"}',false); end $$;`;
const anonymousClaims = `do $$ begin perform set_config('request.jwt.claim.sub','',false); perform set_config('request.jwt.claims','{"role":"anon"}',false); end $$;`;
const configuration = JSON.stringify({
  routes: [1, 2, 3, 4, 5].map((number) => ({ number, name: `Synthetic route ${number}`, grade: "6a", color: "blue" })),
  assignments: [{ league: "lead", class_label: "Synthetic race", route_numbers: [1, 2, 3, 4, 5] }],
  zone_points: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], flash_bonus: 0,
});
let initialized = false;
try {
  const setup = await run(`begin;
    do $$ begin perform set_config('request.jwt.claims','{"role":"service_role"}',false); end $$;
    insert into auth.users(id,email) values('${admin}','${admin}@test.invalid'),('${profile}','${profile}@test.invalid');
    insert into public.profiles(id,role,first_name,last_name,participation_activated_at)
      values('${admin}','league_admin','Synthetic','Race Admin',now()),('${profile}','participant','Synthetic','Race Participant',now());
    insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_enabled,finale_registration_deadline,finale_date)
      values('${season}','2026-01-01','2026-01-02',false,'2026-01-03','2026-01-04');
    insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label)
      values('${season}','${profile}','eligible','lead','Synthetic race');
    insert into public.finale_registrations(profile_id,season_year,registration_status) values('${profile}','${season}','registered');
    ${adminClaims}
    select public.save_competition_config('${season}','${configuration}'::jsonb);
    select public.set_competition_phase('${season}','open');
    select public.set_competition_attendance_password('${season}','${credential}');
    commit;`);
  requireSuccess(setup, "Synthetic committed fixture");
  initialized = true;
  const write = (version, request, delay = 0) => run(`begin; ${anonymousClaims} set local role anon;
    select public.set_competition_attendance('${season}','${profile}','arrive',${version},'${request}',null,'${credential}');
    select pg_sleep(${delay}); commit;`);
  const distinct = await Promise.all([write(0, randomUUID(), 0.7), write(0, randomUUID())]);
  pass(distinct.filter((item) => item.code === 0).length === 1
    && distinct.filter((item) => item.code !== 0 && item.error.includes("ATTENDANCE_CONFLICT")).length === 1,
    "two clients with different request IDs: one commit and one stale-version rejection");

  const duplicateRequest = randomUUID();
  const duplicate = await Promise.all([write(1, duplicateRequest, 0.7), write(1, duplicateRequest)]);
  duplicate.forEach((result) => requireSuccess(result, "Duplicate delivery"));
  const response = (result) => JSON.parse(result.output.split("\n").find((line) => line.startsWith("{")));
  pass(JSON.stringify(response(duplicate[0])) === JSON.stringify(response(duplicate[1])),
    "two clients with the same request ID receive the same committed response");
  const state = await run(`select a.version,(select count(*) from public.competition_attendance_audit z where z.event_id=a.event_id and z.profile_id=a.profile_id)
    from public.competition_attendance a join public.competition_day_events e on e.id=a.event_id where e.season_year='${season}' and a.profile_id='${profile}';`);
  requireSuccess(state, "Version read");
  pass(state.output === "2|2", "each accepted request increments version and audit only once");

  // Password verification holds a share lock. Replacement is serialized with a write.
  const writing = write(2, randomUUID(), 0.7);
  const rotating = run(`begin; ${adminClaims}
    select public.set_competition_attendance_password('${season}','${replacement}'); commit;`);
  const [writeResult, rotateResult] = await Promise.all([writing, rotating]);
  requireSuccess(rotateResult, "Password rotation");
  pass(writeResult.code === 0 || writeResult.error.includes("ATTENDANCE_PASSWORD_INVALID"),
    "password rotation and concurrent check-in have a serialized authorized outcome");
  const oldReplay = await write(1, duplicateRequest);
  pass(oldReplay.code !== 0 && oldReplay.error.includes("ATTENDANCE_PASSWORD_INVALID"),
    "rotated password cannot replay even a committed request");
} finally {
  if (initialized) {
    const cleanup = await run(`begin;
      do $$ begin perform set_config('request.jwt.claims','{"role":"service_role"}',false); end $$;
      delete from public.competition_day_events where season_year='${season}';
      delete from public.finale_registrations where season_year='${season}';
      delete from public.semifinal_eligibility where season_year='${season}';
      delete from public.admin_settings where season_year='${season}';
      delete from public.profiles where id in ('${admin}','${profile}');
      delete from auth.users where id in ('${admin}','${profile}'); commit;`);
    requireSuccess(cleanup, "Synthetic fixture cleanup");
    console.log("PASS: committed synthetic race fixtures removed");
  }
}
