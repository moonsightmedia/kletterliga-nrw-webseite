-- Run after all competition migrations, including 20261002100300, in an isolated test database.
begin;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
create function pg_temp.denied(command text,expected text) returns void language plpgsql as $$
begin
  begin execute command;
  exception when others then if position(expected in sqlerrm)>0 then raise notice 'PASS: %',expected; return; end if; raise; end;
  raise exception 'FAIL: expected %',expected;
end $$;

insert into auth.users(id,email) select ('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'final-test-'||n||'@test.invalid' from generate_series(1,8) n;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.profiles(id,role,first_name,last_name,participation_activated_at)
  select ('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
    case when n=1 then 'league_admin' else 'participant' end,'Final','Person '||n,now() from generate_series(1,8) n;
insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_enabled,finale_registration_deadline,finale_date)
  values('FINAL-TEST','2026-01-01','2026-01-02',false,'2026-01-03','2026-01-04');
insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label)
  select 'FINAL-TEST',('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'eligible','lead','Testklasse' from generate_series(2,8) n;
insert into public.finale_registrations(profile_id,season_year,registration_status)
  select ('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'FINAL-TEST','registered' from generate_series(2,8) n;
select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.save_competition_config('FINAL-TEST',jsonb_build_object(
  'routes',(select jsonb_agg(jsonb_build_object('number',n,'name','Route '||n,'grade','6a','color','blue') order by n) from generate_series(1,5) n),
  'assignments',jsonb_build_array(jsonb_build_object('league','lead','class_label','Testklasse','route_numbers',jsonb_build_array(1,2,3,4,5))),
  'zone_points',jsonb_build_array(0,10,20,30,40,50,60,70,80,90,100),'flash_bonus',0));
select public.set_competition_phase('FINAL-TEST','open');
select public.set_competition_phase('FINAL-TEST','closed');
select public.set_competition_final_route('FINAL-TEST',1,'Finalroute',30);
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',(public.get_competition_final_admin(''FINAL-TEST'')->''routes''->0->>''id'')::uuid,1::smallint,0)','Halbfinalergebnisse fehlen');
reset role;

-- Seven registered starters: sixth and seventh tie at the qualification boundary.
update public.competition_day_events set phase='draft' where season_year='FINAL-TEST';
set local role anon;
select pg_temp.ok(jsonb_array_length(public.get_competition_live('FINAL-TEST')->'classes')=0,'preparation does not expose semifinal names');
select pg_temp.ok(public.get_competition_live('NO-SUCH-SEASON')->'class_keys'='[]'::jsonb,'missing season has complete TV settings');
select pg_temp.denied('select * from public.competition_final_stations','permission denied');
reset role;
update public.competition_day_events set phase='closed' where season_year='FINAL-TEST';
insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points)
  select ev.id,r.id,p.id,case when r.route_number=1 then greatest(1,8-n) else 0 end,false,
    case when r.route_number=1 then case when n>=7 then 10 else (8-n)*10 end else 0 end
  from public.competition_day_events ev join public.competition_day_routes r on r.event_id=ev.id
  cross join generate_series(2,8) n join public.profiles p on p.id=('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid
  where ev.season_year='FINAL-TEST';
-- Paper lists need neither a final route nor an input station.
delete from public.competition_final_routes where event_id=(select id from competition_day_events where season_year='FINAL-TEST');
set local role authenticated;
select public.publish_competition_final_class('FINAL-TEST','lead','Testklasse',null,null,0);
reset role;
select pg_temp.ok((select route_id is null and station_no is null and phase='published' and version=1 from competition_final_classes where event_id=(select id from competition_day_events where season_year='FINAL-TEST')),'paper list published without route or station');
select pg_temp.ok((select count(*)=7 from competition_final_entries),'six places include every tied qualifier');
select pg_temp.ok((select min(start_position)=1 and max(start_position)=7 from competition_final_entries),'paper list has contiguous reverse start positions');
select pg_temp.ok((select semifinal_rank=1 from competition_final_entries where start_position=7),'best semifinal participant starts last');
select pg_temp.ok((select count(*)=1 from competition_final_audit where action='publish'),'paper list records one publication audit');
set local role authenticated;
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',null,null,0)','FINAL_VERSION_CONFLICT');
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',null,1::smallint,1)','gemeinsam');
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',''99999999-7000-4000-8000-000000000099'',null,1)','gemeinsam');
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',''99999999-7000-4000-8000-000000000099'',1::smallint,1)','ungültig');
reset role;
create temporary table missing_result as select x.* from competition_day_results x join competition_day_routes r on r.id=x.route_id where r.route_number=1 and x.profile_id='99999999-7000-4000-8000-000000000002';
delete from competition_day_results where id=(select id from missing_result);
set local role authenticated;
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',null,null,1)','Halbfinalergebnisse fehlen');
reset role;
insert into competition_day_results select * from missing_result;
update competition_day_events set phase='open' where season_year='FINAL-TEST';
set local role authenticated;
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',null,null,1)','zuerst');
reset role;
update competition_day_events set phase='closed' where season_year='FINAL-TEST';
insert into competition_final_exclusions(event_id,profile_id,status,reason,actor_id) select (select id from competition_day_events where season_year='FINAL-TEST'),('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'dns','Testausfall','99999999-7000-4000-8000-000000000001' from generate_series(2,6) n;
set local role authenticated;
select public.publish_competition_final_class('FINAL-TEST','lead','Testklasse',null,null,1);
reset role;
select pg_temp.ok((select count(*)=2 from competition_final_entries),'fewer than six available participants all enter');
select pg_temp.ok((select version=2 from competition_final_classes),'rebuild advances print version');
update competition_final_classes set phase='running';
set local role authenticated;
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',null,null,2)','bereits begonnen');
select set_config('paper.test_password',gen_random_uuid()::text,true);
select public.set_competition_final_password('FINAL-TEST',current_setting('paper.test_password'));
select pg_temp.ok(public.get_competition_final_station('FINAL-TEST',1::smallint,current_setting('paper.test_password'))->'classes'='[]'::jsonb,'paper-only classes stay out of digital entry');
select pg_temp.denied(format('select public.submit_competition_final_attempt(''FINAL-TEST'',1::smallint,%L,(public.get_competition_final_admin(''FINAL-TEST'')->''classes''->0->''entries''->0->>''entry_id'')::uuid,gen_random_uuid(),999,false,10,2,'''')',current_setting('paper.test_password')),'auf Papier');
reset role;
select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',null,null,2)','LEAGUE_ADMIN_REQUIRED');
reset role;
set local role anon;
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',null,null,2)','permission denied');
rollback;
