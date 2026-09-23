-- Isolated synthetic fixtures only. Run after the competition-day migration.
begin;
create function pg_temp.assert_true(p_condition boolean,p_label text) returns void language plpgsql as $$
begin if p_condition is distinct from true then raise exception 'FAIL: %',p_label; end if; raise notice 'PASS: %',p_label; end; $$;
create function pg_temp.assert_denied(p_sql text,p_message text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then if position(p_message in sqlerrm)>0 then raise notice 'PASS: denied with %',p_message; return; end if; raise; end;
  raise exception 'FAIL: expected denial containing %',p_message;
end; $$;

insert into auth.users(id,email) values
 ('99999999-6000-4000-8000-000000000001','competition-admin@test.invalid'),
 ('99999999-6000-4000-8000-000000000002','competition-athlete@test.invalid'),
 ('99999999-6000-4000-8000-000000000003','competition-other@test.invalid');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.profiles(id,role,first_name,last_name,participation_activated_at) values
 ('99999999-6000-4000-8000-000000000001','league_admin','Competition','Admin',now()),
 ('99999999-6000-4000-8000-000000000002','participant','Alex','Athlete',now()),
 ('99999999-6000-4000-8000-000000000003','participant','Sam','Other',now());
insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_enabled,finale_registration_deadline,finale_date)
values('COMP-TEST','2026-01-01','2026-01-02',false,'2026-01-03','2026-01-04');
insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label) values
 ('COMP-TEST','99999999-6000-4000-8000-000000000002','eligible','lead','Youth'),
 ('COMP-TEST','99999999-6000-4000-8000-000000000003','eligible','toprope','Adults');
insert into public.finale_registrations(profile_id,season_year,registration_status) values
 ('99999999-6000-4000-8000-000000000002','COMP-TEST','registered'),
 ('99999999-6000-4000-8000-000000000003','COMP-TEST','registered');
select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;

select pg_temp.assert_true(public.get_competition_day('COMP-TEST')->'event'='null'::jsonb,'no event is seeded automatically');
select public.save_competition_config('COMP-TEST',jsonb_build_object(
 'routes',(select jsonb_agg(jsonb_build_object('number',n,'name','Route '||n,'grade','6a','color','blue') order by n) from generate_series(1,12) n),
 'assignments',jsonb_build_array(
   jsonb_build_object('league','lead','class_label','Youth','route_numbers',jsonb_build_array(1,2,3,4,5)),
   jsonb_build_object('league','toprope','class_label','Adults','route_numbers',jsonb_build_array(6,7,8,9,10))),
 'zone_points',jsonb_build_array(0,1,2,3,4,5,6,7,8,9,10),'flash_bonus',2));
select public.set_competition_staff('COMP-TEST','99999999-6000-4000-8000-000000000001',true);
select public.set_competition_phase('COMP-TEST','open');
select pg_temp.assert_true((public.get_competition_day('COMP-TEST')->'event'->>'phase')='open','admin can open fully configured day');
select pg_temp.assert_true((public.get_competition_day('COMP-TEST')->'event'->>'opened_at') is not null,'first opening timestamp is recorded');
select set_config('test.competition_qr',(public.get_competition_staff_routes('COMP-TEST')->0->>'qr_token'),true);
select set_config('test.competition_route',(public.get_competition_staff_routes('COMP-TEST')->0->>'id'),true);
select set_config('test.competition_wrong_route',(public.get_competition_staff_routes('COMP-TEST')->5->>'id'),true);
select pg_temp.assert_denied($sql$select public.save_competition_config('COMP-TEST',public.get_competition_admin('COMP-TEST')->'config')$sql$,'COMPETITION_CONFIG_LOCKED');

select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000002","role":"authenticated"}',true);
select pg_temp.assert_true(not (public.get_competition_day('COMP-TEST')->>'is_admin')::boolean,'participant is not admin');
select pg_temp.assert_true(position(current_setting('test.competition_qr') in public.get_competition_day('COMP-TEST')::text)=0,'participant state never exposes QR secrets');
select pg_temp.assert_denied($sql$select public.get_competition_staff_routes('COMP-TEST')$sql$,'COMPETITION_STAFF_REQUIRED');

select public.submit_competition_result('COMP-TEST',current_setting('test.competition_route')::uuid,10,true,current_setting('test.competition_qr'));
select pg_temp.assert_true(jsonb_array_length(public.get_competition_day('COMP-TEST')->'results')=1,'participant result saved once');
select public.submit_competition_result('COMP-TEST',current_setting('test.competition_route')::uuid,10,true,current_setting('test.competition_qr'));
select pg_temp.assert_true(jsonb_array_length(public.get_competition_day('COMP-TEST')->'results')=1,'same retry is idempotent');
select pg_temp.assert_denied('select public.submit_competition_result(''COMP-TEST'','''||current_setting('test.competition_route')||'''::uuid,9,false,'''||current_setting('test.competition_qr')||''')','COMPETITION_RESULT_IMMUTABLE');
select pg_temp.assert_denied('select public.submit_competition_result(''COMP-TEST'','''||current_setting('test.competition_wrong_route')||'''::uuid,10,true,'''||current_setting('test.competition_qr')||''')','COMPETITION_QR_INVALID');

select set_config('request.jwt.claim.sub','99999999-6000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-6000-4000-8000-000000000001","role":"authenticated"}',true);
select public.correct_competition_result((public.get_competition_day('COMP-TEST')->'results'->0->>'id')::uuid,9,false,'Corrected judge transcription');
select pg_temp.assert_true(jsonb_array_length(public.list_competition_standings('COMP-TEST'))=2,'standings returns all eligible registrants including zero-result entries');
reset role;
select pg_temp.assert_true((select count(*)=1 and min(reason)='Corrected judge transcription' and min(before_data->>'zone')='10' and min(after_data->>'zone')='9' from public.competition_day_result_audit),'correction audit stores before, after and reason');
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.assert_denied('select public.get_competition_day(''COMP-TEST'')','permission denied');
reset role;
rollback;
