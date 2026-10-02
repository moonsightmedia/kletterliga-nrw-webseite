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
('99999999-7100-4000-8000-000000000001','deadline-admin@test.invalid'),
('99999999-7100-4000-8000-000000000002','deadline-athlete@test.invalid');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.profiles(id,role,first_name,last_name,participation_activated_at) values
('99999999-7100-4000-8000-000000000001','league_admin','Deadline','Admin',now()),
('99999999-7100-4000-8000-000000000002','participant','Zero','Athlete',now());
insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_enabled,finale_registration_deadline,finale_date)
values('DEADLINE-TEST','2026-01-01','2026-01-02',false,'2026-01-03','2026-01-04');
insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label)
values('DEADLINE-TEST','99999999-7100-4000-8000-000000000002','eligible','lead','Youth');
insert into public.finale_registrations(profile_id,season_year,registration_status)
values('99999999-7100-4000-8000-000000000002','DEADLINE-TEST','registered');
select set_config('request.jwt.claim.sub','99999999-7100-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-7100-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.save_competition_config('DEADLINE-TEST',jsonb_build_object(
 'routes',(select jsonb_agg(jsonb_build_object('number',n,'name','Route '||n,'grade','6a','color','blue')) from generate_series(1,5) n),
 'assignments',jsonb_build_array(jsonb_build_object('league','lead','class_label','Youth','route_numbers',jsonb_build_array(1,2,3,4,5))),
 'zone_points','[0,10,20,30,40,50,60,70,80,90,100]'::jsonb,'flash_bonus',0));
select public.set_competition_phase('DEADLINE-TEST','open');
select public.set_competition_judge_password('DEADLINE-TEST','DEADLINE1234567890123456');
select set_config('test.deadline.route1',(public.get_competition_judge_routes('DEADLINE-TEST','DEADLINE1234567890123456')->'routes'->0->>'id'),true);
select set_config('test.deadline.qr1',(public.get_competition_judge_routes('DEADLINE-TEST','DEADLINE1234567890123456')->'routes'->0->>'qr_token'),true);
select set_config('test.deadline.route2',(public.get_competition_judge_routes('DEADLINE-TEST','DEADLINE1234567890123456')->'routes'->1->>'id'),true);
select set_config('test.deadline.qr2',(public.get_competition_judge_routes('DEADLINE-TEST','DEADLINE1234567890123456')->'routes'->1->>'qr_token'),true);
reset role;
update public.competition_day_events set submission_deadline_at=clock_timestamp()+interval '1 hour' where season_year='DEADLINE-TEST';
select set_config('request.jwt.claim.sub','99999999-7100-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"99999999-7100-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select public.submit_competition_result('DEADLINE-TEST',current_setting('test.deadline.route1')::uuid,0,false,current_setting('test.deadline.qr1'));
select pg_temp.assert_true((public.list_competition_standings('DEADLINE-TEST')->0->>'completed_routes')::integer=1,'zero is a completed result without admin approval');
reset role;
update public.competition_day_events set submission_deadline_at=clock_timestamp()-interval '1 second' where season_year='DEADLINE-TEST';
select pg_temp.assert_denied($sql$insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points) values ((select id from public.competition_day_events where season_year='DEADLINE-TEST'),current_setting('test.deadline.route2')::uuid,'99999999-7100-4000-8000-000000000002',8,false,80)$sql$,'COMPETITION_DEADLINE_REACHED');
set local role authenticated;
select pg_temp.assert_denied($sql$select public.submit_competition_result('DEADLINE-TEST',current_setting('test.deadline.route2')::uuid,8,false,current_setting('test.deadline.qr2'))$sql$,'COMPETITION_DEADLINE_REACHED');
select pg_temp.assert_true(public.get_competition_day('DEADLINE-TEST')->'event'->>'phase'='closed','server closes without an admin browser');
select pg_temp.assert_denied($sql$select public.enter_competition_semifinal_result('DEADLINE-TEST','99999999-7100-4000-8000-000000000002',current_setting('test.deadline.route2')::uuid,8,'Late entry')$sql$,'LEAGUE_ADMIN_REQUIRED');
select set_config('request.jwt.claim.sub','99999999-7100-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-7100-4000-8000-000000000001","role":"authenticated"}',true);
select pg_temp.assert_denied($sql$select public.set_competition_phase('DEADLINE-TEST','open')$sql$,'COMPETITION_DEADLINE_REACHED');
select public.enter_competition_semifinal_result('DEADLINE-TEST','99999999-7100-4000-8000-000000000002',current_setting('test.deadline.route2')::uuid,8,'Confirmed by judge after cutoff');
select pg_temp.assert_true((public.list_competition_standings('DEADLINE-TEST')->0->>'points')::integer=80,'admin aftercare counts immediately');
select pg_temp.assert_true((public.get_competition_live('DEADLINE-TEST')->'classes'->0->'entries'->0->>'points')::integer=80,'public TV and participant ranking agree');
reset role;
select pg_temp.assert_true((select count(*)=1 from public.competition_day_result_audit a join public.competition_day_results r on r.id=a.result_id join public.competition_day_events e on e.id=r.event_id where e.season_year='DEADLINE-TEST'),'admin aftercare is audited');
rollback;
