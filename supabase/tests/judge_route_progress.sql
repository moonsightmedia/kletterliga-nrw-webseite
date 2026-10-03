-- Synthetic fixtures only; the entire suite rolls back on local PostgreSQL.
begin;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
create function pg_temp.person(n integer) returns uuid language sql as $$ select ('f0000000-7777-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
create function pg_temp.route(n integer) returns jsonb language sql as $$
  select item from jsonb_array_elements(public.get_competition_judge_routes('JUDGE-PROGRESS-QA',current_setting('test.judge_code'))->'routes') item where (item->>'number')::integer=n
$$;
do $$ begin perform set_config('request.jwt.claims','{"role":"service_role"}',true); perform set_config('test.judge_code',substring(replace(gen_random_uuid()::text,'-',''),1,24),true); end $$;
insert into auth.users(id,email) select pg_temp.person(n),'judge-progress-'||n||'@test.invalid' from generate_series(1,14) n;
insert into public.profiles(id,role,first_name,last_name,participation_activated_at,archived_at)
select pg_temp.person(n),case when n=1 then 'league_admin' else 'participant' end,'Fixture','Person '||n,
  case when n=10 then null else now() end,case when n=11 then now() else null end from generate_series(1,14) n;
insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label)
select 'JUDGE-PROGRESS-QA',pg_temp.person(n),case when n=9 then 'not_eligible' else 'eligible' end,
  case when n=5 then 'toprope' else 'lead' end,case when n=5 then 'Adults' else 'Youth' end from generate_series(2,14) n;
insert into public.finale_registrations(profile_id,season_year,registration_status)
select pg_temp.person(n),'JUDGE-PROGRESS-QA',case when n=6 then 'cancelled' else 'registered' end from generate_series(2,14) n where n<>13;
insert into public.competition_day_events(season_year,phase,zone_points,flash_bonus,submission_deadline_at)
values('JUDGE-PROGRESS-QA','open','[0,10,20,30,40,50,60,70,80,90,100]'::jsonb,0,now()+interval '1 day');
do $$ begin perform set_config('test.event',(select id::text from public.competition_day_events where season_year='JUDGE-PROGRESS-QA'),true); end $$;
insert into public.competition_day_routes(event_id,route_number,name,grade,color)
select current_setting('test.event')::uuid,n,'Fixture route '||n,'6a','blue' from generate_series(1,4) n;
insert into public.competition_day_classes(event_id,league,class_label)
values(current_setting('test.event')::uuid,'lead','Youth'),(current_setting('test.event')::uuid,'toprope','Adults'),(current_setting('test.event')::uuid,'lead','Empty');
insert into public.competition_day_class_routes(event_id,class_id,route_id)
select c.event_id,c.id,r.id from public.competition_day_classes c join public.competition_day_routes r on r.event_id=c.event_id
where c.event_id=current_setting('test.event')::uuid and ((r.route_number=1 and c.class_label in ('Youth','Adults')) or (r.route_number=2 and c.class_label='Youth') or (r.route_number=4 and c.class_label='Empty'));
insert into public.competition_day_judge_access(event_id,salt,password_hash)
values(current_setting('test.event')::uuid,'fixture-salt',encode(sha256(convert_to('fixture-salt'||current_setting('test.judge_code'),'UTF8')),'hex'));
insert into public.competition_attendance(event_id,profile_id,status,checked_in_at,actor_kind)
select current_setting('test.event')::uuid,pg_temp.person(n),case when n=14 then 'absent' else 'arrived' end,case when n=14 then null else now() end,'admin' from (values(2),(3),(12),(14)) p(n);
insert into public.competition_final_exclusions(event_id,profile_id,status,reason)
values(current_setting('test.event')::uuid,pg_temp.person(7),'dns','Fixture no-show'),(current_setting('test.event')::uuid,pg_temp.person(8),'withdrawn','Fixture withdrawal');
insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points)
select r.event_id,r.id,pg_temp.person(2),0,false,0 from public.competition_day_routes r where r.event_id=current_setting('test.event')::uuid and r.route_number=1;
insert into public.competition_semifinal_settlements(event_id,route_id,profile_id,reason)
select r.event_id,r.id,pg_temp.person(12),'Fixture clarified non-climb' from public.competition_day_routes r where r.event_id=current_setting('test.event')::uuid and r.route_number=1;

do $$ begin perform set_config('request.jwt.claims','{"role":"anon"}',true); perform set_config('request.jwt.claim.sub','',true); end $$;
set local role anon;
select pg_temp.ok(pg_temp.route(1)->'progress'=jsonb_build_object('total',5,'completed',2,'remaining',3,'not_checked_in',2),'shared route aggregates both classes, zero and settled entries');
select pg_temp.ok(jsonb_array_length(pg_temp.route(1)->'classes')=2,'both assigned classes are listed');
select pg_temp.ok(pg_temp.route(2)->'progress'->>'remaining'='4','a result on another route does not complete this route');
select pg_temp.ok(pg_temp.route(3)->'classes'='[]'::jsonb and pg_temp.route(3)->'progress'->>'total'='0','unassigned route has zero counts');
select pg_temp.ok(jsonb_array_length(pg_temp.route(4)->'classes')=1 and pg_temp.route(4)->'progress'->>'remaining'='0','assigned empty class stays visible');
select pg_temp.ok(not exists(select 1 from jsonb_object_keys(pg_temp.route(1)->'classes'->0) k where k not in ('league','class_label','total','completed','remaining','not_checked_in')),'aggregates expose no participant identity or contact fields');
select pg_temp.ok(not has_table_privilege('anon','public.competition_attendance','SELECT'),'shared judge access grants no attendance table access');
do $$ begin
  begin perform public.get_competition_judge_routes('JUDGE-PROGRESS-QA',repeat('x',24)); exception when insufficient_privilege then raise notice 'PASS: wrong password rejected'; return; end;
  raise exception 'FAIL: wrong password accepted';
end $$;
reset role;
do $$ begin perform set_config('request.jwt.claims','{"role":"service_role"}',true); end $$;
insert into public.finale_registrations(profile_id,season_year,registration_status) values(pg_temp.person(13),'JUDGE-PROGRESS-QA','registered');
insert into public.competition_attendance(event_id,profile_id,status,checked_in_at,actor_kind) values(current_setting('test.event')::uuid,pg_temp.person(13),'arrived',now(),'admin');
select pg_temp.ok(pg_temp.route(1)->'progress'=jsonb_build_object('total',6,'completed',2,'remaining',4,'not_checked_in',2),'late registration increases remaining and checked-in count immediately');
update public.finale_registrations set registration_status='cancelled' where profile_id=pg_temp.person(3) and season_year='JUDGE-PROGRESS-QA';
select pg_temp.ok(pg_temp.route(1)->'progress'->>'remaining'='3','cancellation removes participant from remaining count');
update public.competition_day_events set submission_deadline_at=now()-interval '1 second' where id=current_setting('test.event')::uuid;
select pg_temp.ok(public.get_competition_judge_routes('JUDGE-PROGRESS-QA',current_setting('test.judge_code'))->'event'->>'phase'='closed','valid judge refresh preserves automatic deadline closure');
rollback;
