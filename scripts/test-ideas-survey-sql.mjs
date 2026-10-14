// Isolated in-memory PostgreSQL checks. No network, credentials, or production writes.
// Pass a local @electric-sql/pglite dist/index.js path when it is not installed here.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "@electric-sql/pglite");
const db = new PGlite();
const answers = { digitalization: "yes", paper_cards: "no", team_mode: "no", shirt_interest: "no", pro_league: "no", league_changes: ["keep"], qual_weight: "same", hall_model: "all", hall_count: "8", community_events: "both", weighting: "none" };
const id = "67192735-99bc-4d51-bb34-87b0f3f214f3";
let checks = 0;
async function denied(sql, code) {
  await assert.rejects(() => db.exec(sql), error => error.code === code); checks++;
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    grant usage on schema public, auth to anon, authenticated, service_role;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
    create function public.is_league_admin() returns boolean language sql stable as $$ select coalesce(nullif(current_setting('test.admin', true),'')::boolean,false) $$;
    create table public.profiles (id uuid primary key, archived_at timestamptz);
    insert into public.profiles values ('11111111-1111-4111-8111-111111111111', null);
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/20261014120000_ideas_survey_2027.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20261014130000_ideas_survey_2027_drafts.sql", import.meta.url), "utf8"));
  const retention = await readFile(new URL("../supabase/migrations/20261014163000_ideas_survey_2027_retention.sql", import.meta.url), "utf8");
  await db.exec(retention.split("-- Production scheduling.")[0] + "\ncommit;");
  for (const [a, expected] of [[{...answers,league_changes:["age_classes","fewer_classes","other"],league_idea:"Neue Altersgruppen\nAb 40",weighting_idea:"Eine andere Regel"},true],[{...answers,league_idea:"x".repeat(501)},false],[{...answers,weighting_idea:{}},false],[{...answers,league_idea:"bad"+String.fromCharCode(7)},false]]) {
    const r = await db.query("select public.valid_ideas_survey_2027_answers($1::jsonb) as valid",[JSON.stringify(a)]);
    assert.equal(r.rows[0].valid,expected); checks++;
  }
  const noteDraft = await db.query("select public.valid_ideas_survey_2027_draft($1::jsonb) as valid",[JSON.stringify({weighting_idea:"Nur meine Idee"})]);
  assert.equal(noteDraft.rows[0].valid,true); checks++;
  for (const bad of [{ ...answers, email: "not-allowed" }, { ...answers, hall_count: "2" }, { ...answers, league_changes: ["keep", "age_more"] }, { ...answers, team_size: "two" }, { ...answers, team_mode: "yes" }]) {
    const result = await db.query("select public.valid_ideas_survey_2027_answers($1::jsonb) as valid", [JSON.stringify(bad)]);
    assert.equal(result.rows[0].valid, false); checks++;
  }
  await db.exec("set role service_role");
  await denied(`insert into public.ideas_survey_2027(submission_id, answers) values ('${id}','${JSON.stringify(answers)}')`, "23514");
  await db.query("insert into public.ideas_survey_2027(submission_id, answers,consent_version,consent_recorded_at) values ($1,$2,2,now())", [id, JSON.stringify(answers)]); checks++;
  await denied(`insert into public.ideas_survey_2027 select * from public.ideas_survey_2027`, "23505");
  await denied("delete from public.ideas_survey_2027", "42501");
  const draftId = "b8b2dbdd-4c8c-4e50-bdea-d72c51245d25";
  const token = "a".repeat(64);
  const write = async (rev, mode, value, cap = token, consent = mode === "delete" ? null : 2) => (await db.query("select public.save_ideas_survey_2027($1,$2,$3,$4,$5::jsonb,$6) as ok", [draftId,cap,rev,mode,JSON.stringify(value),consent])).rows[0].ok;
  assert.equal(await write(1,"draft",{digitalization:"yes"},token,null),false); checks++;
  assert.equal(await write(1,"draft",{digitalization:"yes"},token,1),false); checks++;
  assert.equal(await write(1,"draft",{digitalization:"yes"}),true); checks++;
  const consentReceipt = (await db.query("select consent_version,consent_recorded_at from public.ideas_survey_2027 where submission_id=$1",[draftId])).rows[0];
  assert.equal(consentReceipt.consent_version,2); assert.ok(consentReceipt.consent_recorded_at); checks++;
  assert.equal(await write(2,"draft",{digitalization:"no"},"b".repeat(64)),false); checks++;
  assert.equal(await write(2,"draft",{digitalization:"no",team_mode:"yes"}),true); checks++;
  assert.equal(await write(1,"draft",{digitalization:"yes"}),false); checks++;
  assert.equal(await write(2,"draft",{digitalization:"no",team_mode:"yes"}),true); checks++;
  assert.equal(await write(2,"draft",{digitalization:"yes"}),false); checks++;
  assert.equal(await write(3,"complete",{digitalization:"yes"}),false); checks++;
  assert.equal(await write(3,"complete",answers),true); checks++;
  assert.deepEqual((await db.query("select consent_version,consent_recorded_at from public.ideas_survey_2027 where submission_id=$1",[draftId])).rows[0],consentReceipt); checks++;
  assert.equal(await write(4,"draft",{digitalization:"no"}),false); checks++;
  assert.equal(await write(4,"delete",{}),true); checks++;
  assert.equal(await write(4,"delete",{}),true); checks++;
  assert.equal(await write(10000,"delete",{}),true); checks++;
  assert.equal(await write(5,"draft",{digitalization:"no"}),false); checks++;
  await db.query("select public.save_ideas_survey_2027($1,$2,1,'draft',$3::jsonb,2)", ["77ccabbc-c2d6-4be3-94f4-d36ae0af65b8",token,JSON.stringify({digitalization:"yes"})]);
  const maxId = "4e5d6864-07a3-45d6-b2ac-cba86f5fc949";
  assert.equal((await db.query("select public.save_ideas_survey_2027($1,$2,10000,'draft',$3::jsonb,2) as ok",[maxId,token,JSON.stringify({digitalization:"yes"})])).rows[0].ok,true); checks++;
  assert.equal((await db.query("select public.save_ideas_survey_2027($1,$2,10000,'delete','{}') as ok",[maxId,token])).rows[0].ok,true); checks++;
  await db.exec("reset role; set role anon");
  await denied("select * from public.ideas_survey_2027", "42501");
  await denied("select public.admin_ideas_survey_2027()", "42501");
  await denied(`select public.save_ideas_survey_2027('${draftId}','${token}',6,'delete','{}')`, "42501");
  await db.exec("reset role; set role authenticated");
  await denied("select * from public.ideas_survey_2027", "42501");
  await denied(`select public.save_ideas_survey_2027('${draftId}','${token}',6,'delete','{}')`, "42501");
  await denied("select public.admin_ideas_survey_2027()", "42501");
  await db.exec("set test.uid = '11111111-1111-4111-8111-111111111111'; set test.admin = 'true'");
  const result = await db.query("select public.admin_ideas_survey_2027() as report");
  assert.equal(result.rows[0].report.total, 2);
  assert.equal(result.rows[0].report.completed, 1);
  assert.equal(result.rows[0].report.partial, 1);
  assert.equal(result.rows[0].report.entries.length, 2);
  assert.equal(JSON.stringify(result.rows[0].report).includes("write_token"),false); checks++;
  await denied("select public.admin_ideas_survey_2027(0,51)", "22023");
  await db.exec("reset role; update public.profiles set archived_at=now(); set role authenticated");
  await denied("select public.admin_ideas_survey_2027()", "42501");
  const rls = await db.query("select relrowsecurity from pg_class where relname='ideas_survey_2027'");
  assert.equal(rls.rows[0].relrowsecurity, true); checks++;
  await denied("select public.purge_ideas_survey_2027()", "42501");
  await db.exec("reset role; set role service_role");
  assert.equal((await db.query("select public.purge_ideas_survey_2027() as removed")).rows[0].removed,0); checks++;
  await db.exec("reset role; create or replace function public.ideas_survey_2027_is_open() returns boolean language sql stable as $$ select false $$; set role service_role");
  assert.equal(await write(9999,"draft",{digitalization:"yes"}),false); checks++;
  assert.equal((await db.query("select count(*)::integer as total from public.ideas_survey_2027")).rows[0].total,0); checks++;
  assert.equal(await write(10000,"delete",{}),true); checks++;
  assert.equal((await db.query("select count(*)::integer as total from public.ideas_survey_2027")).rows[0].total,0); checks++;
  console.log(`PASS: ${checks} isolated SQL checks; migration, validation, UUID uniqueness, private table and active-admin RPC.`);
} finally { await db.close(); }
