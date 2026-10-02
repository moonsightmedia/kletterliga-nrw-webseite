// Local PostgreSQL regression for the 2026 INSERT-before-ON-CONFLICT failure.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const packageDir = process.argv[2];
if (!packageDir) throw Error('Pass the installed PGlite package directory');
const { PGlite } = await import(pathToFileURL(path.join(packageDir, 'dist/index.js')));
const db = new PGlite();
const adminId = '99999999-6000-4000-8000-000000000001';
const points = [0,10,20,30,40,50,60,70,80,90,100];
let checks = 0;
async function expectError(sql, params, marker) {
  await assert.rejects(db.query(sql, params), e => e.code === marker || e.message.includes(marker));
  checks++;
}
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select coalesce(current_setting('request.jwt.claims',true)::jsonb->>'role','') $$;
    create table public.profiles(id uuid primary key references auth.users(id), role text not null, first_name text, last_name text, participation_activated_at timestamptz, archived_at timestamptz);
    create table public.finale_registrations(id uuid primary key default gen_random_uuid(),profile_id uuid references public.profiles(id),season_year text,registration_status text);
    create table public.semifinal_eligibility(season_year text,profile_id uuid references public.profiles(id),status text,league text,class_label text,primary key(season_year,profile_id));
    create table public.admin_settings(id uuid primary key default gen_random_uuid(),season_year text,qualification_start date,qualification_end date,finale_enabled boolean,finale_registration_deadline date,finale_date date,updated_at timestamptz default now());
    create function public.is_league_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='league_admin') $$;`);
  for (const file of ['20260923160000_competition_day.sql','20260923180000_competition_route_draft.sql','20260925120000_competition_day_no_flash.sql']) await db.exec(await readFile(path.resolve('supabase/migrations',file),'utf8'));
  await db.query('insert into auth.users(id) values($1)',[adminId]);
  await db.query("insert into profiles(id,role) values($1,'league_admin')",[adminId]);
  await db.query("insert into admin_settings(season_year) values('2026')");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[adminId]);
  await db.query("insert into competition_day_events(season_year,zone_points) values('2026',$1)",[JSON.stringify(points)]);
  await db.exec(await readFile(path.resolve('supabase/migrations/20260929140000_competition_day_grip_points_2026.sql'),'utf8'));
  const routes = Array.from({length:14},(_,i)=>({number:i+1,name:`Route ${i+1}`,grade:'',color:'#252525'}));
  const config = {routes,assignments:[{league:'toprope',class_label:'U15-m',route_numbers:[2,4,6,10,14]}],zone_points:points,flash_bonus:0};
  await expectError('select save_competition_config($1,$2)',['2026',JSON.stringify(config)],'23514');
  await expectError('select save_competition_route_draft($1,$2)',['2026',JSON.stringify(routes)],'23514');
  const fix = await readFile(path.resolve('supabase/migrations/20261002153000_fix_competition_config_event_scoring.sql'),'utf8');
  await db.exec(fix);
  await db.query('select save_competition_route_draft($1,$2)',['2026',JSON.stringify(routes)]); checks++;
  const initial = (await db.query('select id,route_number,qr_token from competition_day_routes order by route_number')).rows;
  await db.query('select save_competition_config($1,$2)',['2026',JSON.stringify(config)]); checks++;
  await db.query('select save_competition_config($1,$2)',['2026',JSON.stringify(config)]); checks++;
  assert.deepEqual((await db.query('select id,route_number,qr_token from competition_day_routes order by route_number')).rows, initial); checks++;
  assert.deepEqual((await db.query("select zone_points from competition_day_events where season_year='2026'")).rows[0].zone_points,points); checks++;
  await expectError('select save_competition_config($1,$2)',['2026',JSON.stringify({...config,zone_points:Array.from({length:11},(_,i)=>i)})],'23514');
  await expectError('select save_competition_route_draft($1,$2)',['2026',JSON.stringify(routes)],'COMPETITION_DRAFT_ONLY');
  await db.exec(fix); checks++; // Repeat migration without changing unrelated function logic.
  await db.query("update competition_day_events set phase='open',opened_at=now() where season_year='2026'");
  await expectError('select save_competition_config($1,$2)',['2026',JSON.stringify(config)],'COMPETITION_CONFIG_LOCKED');
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await expectError('select save_competition_config($1,$2)',['2026',JSON.stringify(config)],'LEAGUE_ADMIN_REQUIRED');
  console.log(`PASS: ${checks} PostgreSQL regression checks; original failure reproduced and fixed.`);
} finally { await db.close(); }
