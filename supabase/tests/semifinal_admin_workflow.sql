-- Run on an isolated database after all migrations. All fixtures roll back.
begin;
create function pg_temp.assert_true(p_condition boolean,p_label text) returns void language plpgsql as $$
begin if p_condition is distinct from true then raise exception 'FAIL: %',p_label; end if; raise notice 'PASS: %',p_label; end; $$;
create function pg_temp.assert_denied(p_sql text,p_message text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then if position(p_message in sqlerrm)>0 then return; end if; raise; end;
  raise exception 'FAIL: expected %',p_message;
end; $$;
insert into auth.users(id,email) values
('99999999-7200-4000-8000-000000000001','deadline-admin@test.invalid'),
('99999999-7200-4000-8000-000000000002','deadline-athlete@test.invalid');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.profiles(id,role,first_name,last_name,participation_activated_at) values
('99999999-7200-4000-8000-000000000001','league_admin','Deadline','Admin',now()),
('99999999-7200-4000-8000-000000000002','participant','Zero','Athlete',now());
insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_enabled,finale_registration_deadline,finale_date)
values('ADMIN-UX-TEST','2026-01-01','2026-01-02',false,'2026-01-03','2026-01-04');
insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label)
values('ADMIN-UX-TEST','99999999-7200-4000-8000-000000000002','eligible','lead','Youth');
insert into public.finale_registrations(profile_id,season_year,registration_status)
values('99999999-7200-4000-8000-000000000002','ADMIN-UX-TEST','registered');
select set_config('request.jwt.claim.sub','99999999-7200-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-7200-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.save_competition_config('ADMIN-UX-TEST',jsonb_build_object(
 'routes',(select jsonb_agg(jsonb_build_object('number',n,'name','Route '||n,'grade','6a','color','blue')) from generate_series(1,5) n),
 'assignments',jsonb_build_array(jsonb_build_object('league','lead','class_label','Youth','route_numbers',jsonb_build_array(1,2,3,4,5))),
 'zone_points','[0,10,20,30,40,50,60,70,80,90,100]'::jsonb,'flash_bonus',0));

select set_config('test.ux.route1',(public.get_competition_day('ADMIN-UX-TEST')->'routes'->0->>'id'),true);
select set_config('test.ux.route2',(public.get_competition_day('ADMIN-UX-TEST')->'routes'->1->>'id'),true);
select pg_temp.assert_denied($sql$select public.enter_competition_semifinal_result('ADMIN-UX-TEST','99999999-7200-4000-8000-000000000002',current_setting('test.ux.route1')::uuid,0,'Before opening')$sql$,'eingerichtet');
select public.set_competition_phase('ADMIN-UX-TEST','open');
select pg_temp.assert_denied($sql$select public.enter_competition_semifinal_result('ADMIN-UX-TEST','99999999-7200-4000-8000-000000000002',current_setting('test.ux.route1')::uuid,null,'No value')$sql$,'Griff');
select pg_temp.assert_denied($sql$select public.enter_competition_semifinal_result('ADMIN-UX-TEST','99999999-7200-4000-8000-000000000002',current_setting('test.ux.route1')::uuid,0,'')$sql$,'Begründung');
select public.enter_competition_semifinal_result('ADMIN-UX-TEST','99999999-7200-4000-8000-000000000002',current_setting('test.ux.route1')::uuid,0,'Confirmed zero');
select pg_temp.assert_true(public.get_competition_final_admin('ADMIN-UX-TEST')->>'phase'='open','one admin entry does not close the event');
select pg_temp.assert_true((public.list_competition_standings('ADMIN-UX-TEST')->0->>'completed_routes')::integer=1,'zero is entered, remaining routes stay missing');
select set_config('test.ux.result',(public.get_competition_admin('ADMIN-UX-TEST')->'results'->0->>'id'),true);
select set_config('test.ux.changed_at',(public.get_competition_final_admin('ADMIN-UX-TEST')->'semifinal_audit'->0->>'created_at'),true);
select public.correct_competition_semifinal_result(current_setting('test.ux.result')::uuid,8,'Paper correction',0,0,current_setting('test.ux.changed_at')::timestamptz);
select pg_temp.assert_denied($sql$select public.correct_competition_semifinal_result(current_setting('test.ux.result')::uuid,4,'Stale second window',0,0,current_setting('test.ux.changed_at')::timestamptz)$sql$,'COMPETITION_VERSION_CONFLICT');
select pg_temp.assert_denied($sql$select public.correct_competition_semifinal_result(current_setting('test.ux.result')::uuid,4,'Null expected',null,null,null)$sql$,'COMPETITION_VERSION_CONFLICT');
select pg_temp.assert_true((public.list_competition_standings('ADMIN-UX-TEST')->0->>'points')::integer=80,'correction updates ranking immediately');
select public.set_competition_phase('ADMIN-UX-TEST','closed');
select public.enter_competition_semifinal_result('ADMIN-UX-TEST','99999999-7200-4000-8000-000000000002',current_setting('test.ux.route2')::uuid,0,'After cutoff');
select pg_temp.assert_true((public.get_competition_live('ADMIN-UX-TEST')->'classes'->0->'entries'->0->>'points')::integer=80,'public TV agrees after correction and zero aftercare');
reset role;
select pg_temp.assert_true((select count(*)=3 from public.competition_day_result_audit a join public.competition_day_results r on r.id=a.result_id join public.competition_day_events e on e.id=r.event_id where e.season_year='ADMIN-UX-TEST'),'first entries and correction audited');
select set_config('request.jwt.claim.sub','99999999-7200-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"99999999-7200-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_denied($sql$select public.enter_competition_semifinal_result('ADMIN-UX-TEST','99999999-7200-4000-8000-000000000002',current_setting('test.ux.route1')::uuid,4,'Participant attempt')$sql$,'LEAGUE_ADMIN_REQUIRED');
select pg_temp.assert_denied($sql$select public.correct_competition_result(current_setting('test.ux.result')::uuid,4,false,'Participant attempt')$sql$,'LEAGUE_ADMIN_REQUIRED');
select pg_temp.assert_denied($sql$select public.correct_competition_semifinal_result(current_setting('test.ux.result')::uuid,4,'Participant attempt',8,80,null)$sql$,'LEAGUE_ADMIN_REQUIRED');
reset role;
set local role anon;
select pg_temp.assert_denied($sql$select public.enter_competition_semifinal_result('ADMIN-UX-TEST','99999999-7200-4000-8000-000000000002',current_setting('test.ux.route1')::uuid,4,'Public attempt')$sql$,'permission denied');
select pg_temp.assert_denied($sql$select public.correct_competition_semifinal_result(current_setting('test.ux.result')::uuid,4,'Public attempt',8,80,null)$sql$,'permission denied');
reset role;
rollback;
