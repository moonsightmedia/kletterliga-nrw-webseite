// Isolated PostgreSQL assertions, no production data/credentials/network.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "@electric-sql/pglite");
const db = new PGlite();
let checks = 0;
function equal(actual, expected) { assert.deepEqual(actual, expected); checks++; }
async function denied(sql, code) { await assert.rejects(() => db.exec(sql), e => e.code === code); checks++; }
const full = { digitalization: "yes", paper_cards: "no", team_mode: "yes", team_scoring: "both", team_size: "two", shirt_interest: "yes", shirt_policy: "optional", pro_league: "yes", pro_rule: "voluntary", league_changes: ["age_classes", "skill_classes"], qual_weight: "controlled_only", hall_model: "choose", hall_count: "6", community_events: "both", weighting: "drop_one", league_idea: "Altersklasse ab 40", weighting_idea: "Streichregel erklären" };
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; grant usage on schema public, auth to anon,authenticated,service_role;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create function public.is_league_admin() returns boolean language sql stable as $$ select coalesce(nullif(current_setting('test.admin',true),'')::boolean,false) $$;
    create table public.profiles(id uuid primary key,archived_at timestamptz);
    insert into public.profiles values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null);`);
  for (const name of ["20261014120000_ideas_survey_2027", "20261014130000_ideas_survey_2027_drafts"]) await db.exec(await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8"));
  const retention = await readFile(new URL("../supabase/migrations/20261014163000_ideas_survey_2027_retention.sql", import.meta.url), "utf8");
  await db.exec(retention.split("-- Production scheduling.")[0] + "\ncommit;");
  const migration = await readFile(new URL("../supabase/migrations/20261015100000_admin_ideas_survey_2027_report.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration); // additive function is safely repeatable; does not mutate data.
  const insert = async (n, answers, completed = false, withdrawn = false) => db.query(`insert into public.ideas_survey_2027(submission_id,answers,completed,withdrawn,consent_version,consent_recorded_at,updated_at)
    values($1,$2::jsonb,$3,$4,2,now(),timestamptz '2026-10-15 09:00:00+00'+$5*interval '1 minute')`, [`00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, JSON.stringify(answers), completed, withdrawn, n]);
  await insert(1, full, true);
  const second = { ...full, team_mode: "no", shirt_interest: "no", pro_league: "no", league_changes: ["keep"] };
  for (const f of ["team_scoring", "team_size", "shirt_policy", "pro_rule", "league_idea", "weighting_idea"]) delete second[f];
  await insert(2, second, true);
  await insert(3, { digitalization: "no", team_mode: "yes", shirt_interest: "yes", pro_league: "yes", league_changes: ["age_more", "skill_classes"] });
  await insert(4, { weighting_idea: "Eine weitere Wertungsregel" });
  await insert(5, {}, false, true);
  await db.exec("set role anon");
  await denied("select public.admin_ideas_survey_2027_report()", "42501");
  await db.exec("reset role; set role authenticated");
  await denied("select * from public.ideas_survey_2027", "42501");
  await denied("select public.admin_ideas_survey_2027_report()", "42501");
  await db.exec("set test.uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; set test.admin='true'");
  const report = async (status = "all", offset = 0, limit = 20, textOnly = false) => (await db.query("select public.admin_ideas_survey_2027_report($1,$2,$3,$4) as r", [status, offset, limit, textOnly])).rows[0].r;
  let r = await report();
  equal([r.total, r.completed, r.partial, r.scoped_total, r.matched], [4,2,2,4,4]);
  equal(r.entries.length, 4);
  equal(r.entries.map(e => e.submission_id.slice(-1)), ["4","3","2","1"]);
  equal(r.questions.digitalization, { eligible:4, answered:3, counts:{yes:2,no:1} });
  equal(r.questions.team_mode, { eligible:4, answered:3, counts:{both:1,no:1,yes_unspecified:1} });
  equal(r.questions.team_size, { eligible:2, answered:1, counts:{two:1} });
  equal(r.questions.shirt_interest.counts, {optional:1,no:1,yes_unspecified:1});
  equal(r.questions.pro_league.counts, {voluntary:1,no:1,yes_unspecified:1});
  equal(r.questions.league_changes, {eligible:4,answered:3,counts:{age_classes:1,age_more:1,skill_classes:2,keep:1}});
  equal(Object.values(r.questions.league_changes.counts).reduce((a,b) => a+b),5); // not the denominator of 3.
  equal(Object.keys(r.questions).length,12);
  equal(/write_token|consent_version|consent_recorded_at|revision/.test(JSON.stringify(r)),false);
  equal([r.entries[0].completed,r.entries[3].completed], [false,true]);
  const textOnly = await report("all",0,1,true);
  equal([textOnly.total,textOnly.scoped_total,textOnly.matched,textOnly.entries.length],[4,4,2,1]);
  equal(textOnly.questions,r.questions); // text filter cannot change charts.
  const complete = await report("completed");
  equal([complete.total,complete.completed,complete.partial,complete.scoped_total,complete.matched],[4,2,2,2,2]);
  equal(complete.questions.team_size,{eligible:1,answered:1,counts:{two:1}});
  const partial = await report("partial");
  equal([partial.scoped_total,partial.matched],[2,2]);
  equal(partial.questions.hall_model,{eligible:2,answered:0,counts:{}});
  equal(partial.questions.team_size,{eligible:1,answered:0,counts:{}});
  for (const args of ["'bad',0,20,false","null,0,20,false","'all',-1,20,false","'all',0,51,false","'all',0,20,null","'all',1000001,20,false"]) await denied(`select public.admin_ideas_survey_2027_report(${args})`,"22023");
  await db.exec("reset role; update public.profiles set archived_at=now(); set role authenticated");
  await denied("select public.admin_ideas_survey_2027_report()","42501");
  await db.exec("reset role; update public.profiles set archived_at=null; set role authenticated; set test.admin='false'");
  await denied("select public.admin_ideas_survey_2027_report()","42501");
  await db.exec("reset role");
  for (let n=6; n<=26; n++) await insert(n,{digitalization:"yes"});
  await db.exec("set role authenticated; set test.admin='true'");
  r = await report(); const last = await report("all",20);
  equal([r.total,r.entries.length,last.entries.length],[25,20,5]);
  equal(last.questions,r.questions);
  equal(r.questions.digitalization,{eligible:25,answered:24,counts:{yes:23,no:1}});
  equal((await report("all",100)).entries,[]);
  await db.exec("reset role; create or replace function public.ideas_survey_2027_is_open() returns boolean language sql stable as $$ select false $$; set role authenticated");
  const expired = await report();
  equal([expired.total,expired.scoped_total,expired.matched,expired.entries.length],[0,0,0,0]);
  equal(expired.questions.team_mode,{eligible:0,answered:0,counts:{}});
  equal(expired.latest_at,null);
  console.log(`PASS: ${checks} isolated 2027 admin report SQL assertions.`);
} finally { await db.close(); }
