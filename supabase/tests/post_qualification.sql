-- Run ONLY in an isolated local/staging database after the migration.
-- psql "$LOCAL_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/post_qualification.sql
-- Every fixture and setting change is rolled back, including on assertion failure.
begin;

create function pg_temp.assert_true(p_condition boolean, p_label text)
returns void language plpgsql as $$
begin
  if p_condition is distinct from true then raise exception 'FAIL: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end;
$$;
create function pg_temp.assert_denied(p_sql text, p_message text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_message in sqlerrm) > 0 then
      raise notice 'PASS: denied with %', p_message;
      return;
    end if;
    raise;
  end;
  raise exception 'FAIL: statement was not denied with %', p_message;
end;
$$;

-- Fixed synthetic UUIDs and reserved .invalid addresses; never real athletes.
insert into auth.users (id, email) values
  ('99999999-0000-4000-8000-000000000001', 'semifinal-admin@test.invalid'),
  ('99999999-0000-4000-8000-000000000002', 'semifinal-athlete@test.invalid'),
  ('99999999-0000-4000-8000-000000000003', 'semifinal-other@test.invalid');
-- Trusted fixture setup; participants cannot initialize these privileges.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into public.profiles (id, role) values ('99999999-0000-4000-8000-000000000001', 'league_admin')
on conflict (id) do update set role = 'league_admin';
select set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.profiles (id, role, birth_date, gender, league, participation_activated_at) values
  ('99999999-0000-4000-8000-000000000002', 'participant', '2000-01-01', 'm', 'toprope', now()),
  ('99999999-0000-4000-8000-000000000003', 'participant', '2001-01-01', 'w', 'lead', now())
on conflict (id) do update set birth_date = excluded.birth_date, gender = excluded.gender,
  league = excluded.league, participation_activated_at = excluded.participation_activated_at;

insert into public.admin_settings (id, season_year, qualification_start, qualification_end,
  finale_enabled, finale_registration_deadline, finale_date, updated_at)
values ('99999999-0000-4000-8000-000000000010', 'TEST-ONLY', '2026-05-01', '2026-09-13',
  false, '2026-09-27', '2026-10-03', now() + interval '100 years');

select pg_temp.assert_true(public.qualification_entry_is_open('2026-09-13T21:59:59.999Z'), 'Berlin final day inclusive');
select pg_temp.assert_true(not public.qualification_entry_is_open('2026-09-13T22:00:00Z'), 'Berlin following midnight closed');
select pg_temp.assert_true(not public.qualification_entry_is_open('2026-04-30T21:59:59Z'), 'before qualification start closed');
select pg_temp.assert_true(public.qualification_entry_is_open('2026-04-30T22:00:00Z'), 'Berlin opening midnight allowed');
-- Winter timezone and reversed/NULL settings also fail closed.
update public.admin_settings set qualification_start = '2026-01-01', qualification_end = '2026-01-02'
where id = '99999999-0000-4000-8000-000000000010';
select pg_temp.assert_true(public.qualification_entry_is_open('2026-01-02T22:59:59Z'), 'Berlin winter day inclusive');
select pg_temp.assert_true(not public.qualification_entry_is_open('2026-01-02T23:00:00Z'), 'Berlin winter midnight closed');
update public.admin_settings set qualification_end = null where id = '99999999-0000-4000-8000-000000000010';
select pg_temp.assert_true(not public.qualification_entry_is_open(), 'missing end fails closed');
update public.admin_settings set qualification_end = '2025-12-31' where id = '99999999-0000-4000-8000-000000000010';
select pg_temp.assert_true(not public.qualification_entry_is_open(), 'reversed window fails closed');

-- Runtime-relative season keeps these tests valid after the real event.
update public.admin_settings set qualification_start = (now() at time zone 'Europe/Berlin')::date - 20,
  qualification_end = (now() at time zone 'Europe/Berlin')::date - 1,
  finale_registration_deadline = (now() at time zone 'Europe/Berlin')::date + 3,
  finale_date = (now() at time zone 'Europe/Berlin')::date + 4
where id = '99999999-0000-4000-8000-000000000010';
insert into public.gyms (id, name) values ('99999999-0000-4000-8000-000000000020', 'Isolated test gym');
insert into public.routes (id, gym_id, discipline, code) values
  ('99999999-0000-4000-8000-000000000021', '99999999-0000-4000-8000-000000000020', 'toprope', 'TEST-ONLY');
insert into public.results (id, profile_id, route_id, points) values
  ('99999999-0000-4000-8000-000000000030', '99999999-0000-4000-8000-000000000002', '99999999-0000-4000-8000-000000000021', 10);

select set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.results where id = '99999999-0000-4000-8000-000000000030'), 'own old results readable');
select pg_temp.assert_denied($sql$insert into public.results (profile_id, route_id, points)
  values ('99999999-0000-4000-8000-000000000002', '99999999-0000-4000-8000-000000000021', 20)$sql$, 'QUALIFICATION_READ_ONLY');
select pg_temp.assert_denied($sql$update public.results set points = 50 where id = '99999999-0000-4000-8000-000000000030'$sql$, 'QUALIFICATION_READ_ONLY');
select pg_temp.assert_denied($sql$update public.profiles set birth_date = '2015-01-01' where id = '99999999-0000-4000-8000-000000000002'$sql$, 'COMPETITION_PROFILE_READ_ONLY');
select pg_temp.assert_denied($sql$update public.profiles set gender = 'w' where id = '99999999-0000-4000-8000-000000000002'$sql$, 'COMPETITION_PROFILE_READ_ONLY');
select pg_temp.assert_denied($sql$update public.profiles set league = 'lead' where id = '99999999-0000-4000-8000-000000000002'$sql$, 'COMPETITION_PROFILE_READ_ONLY');
select pg_temp.assert_denied($sql$update public.profiles set archived_at = now() where id = '99999999-0000-4000-8000-000000000002'$sql$, 'COMPETITION_PROFILE_READ_ONLY');
update public.profiles set first_name = 'Synthetic' where id = '99999999-0000-4000-8000-000000000002';
select pg_temp.assert_true((select first_name = 'Synthetic' from public.profiles where id = '99999999-0000-4000-8000-000000000002'), 'unrelated profile edit allowed');
select pg_temp.assert_denied($sql$select public.set_semifinal_eligibility('99999999-0000-4000-8000-000000000002', 'eligible', 'toprope', 'Ü15 männlich')$sql$, 'LEAGUE_ADMIN_REQUIRED');
select pg_temp.assert_denied($sql$insert into public.semifinal_eligibility(season_year, profile_id, status, league, class_label)
  values ('TEST-ONLY', '99999999-0000-4000-8000-000000000002', 'eligible', 'toprope', 'Ü15 männlich')$sql$, 'permission denied');
select pg_temp.assert_denied('select public.register_for_semifinal()', 'SEMIFINAL_REGISTRATION_CLOSED');
select pg_temp.assert_denied($sql$insert into public.finale_registrations (profile_id)
  values ('99999999-0000-4000-8000-000000000002')$sql$, 'SEMIFINAL_REGISTRATION_CLOSED');
select pg_temp.assert_true(public.get_semifinal_registration_state() ->> 'eligibility_status' = 'pending', 'unapproved athlete remains pending');

reset role;
-- Trigger also denies DELETE even when a privileged connection bypasses RLS but
-- carries a participant identity (e.g. an incorrectly implemented server endpoint).
select pg_temp.assert_denied($sql$delete from public.results where id = '99999999-0000-4000-8000-000000000030'$sql$, 'QUALIFICATION_READ_ONLY');
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated","user_metadata":{"role":"league_admin"}}', true);
select pg_temp.assert_denied($sql$update public.results set points = 999 where id = '99999999-0000-4000-8000-000000000030'$sql$, 'QUALIFICATION_READ_ONLY');
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.results set points = 10.5 where id = '99999999-0000-4000-8000-000000000030';
select pg_temp.assert_true((select points = 10.5 from public.results where id = '99999999-0000-4000-8000-000000000030'), 'server maintenance credential preserved');
select set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
update public.results set points = 11 where id = '99999999-0000-4000-8000-000000000030';
select pg_temp.assert_true((select points = 11 from public.results where id = '99999999-0000-4000-8000-000000000030'), 'league admin correction allowed');
select pg_temp.assert_true(exists(select 1 from public.data_change_audit where entity_id = '99999999-0000-4000-8000-000000000030' and action = 'update'), 'league admin correction audited');
update public.admin_settings set finale_enabled = true where id = '99999999-0000-4000-8000-000000000010';
reset role;
select set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_denied('select public.register_for_semifinal()', 'SEMIFINAL_NOT_ELIGIBLE');
select pg_temp.assert_denied($sql$insert into public.finale_registrations (profile_id)
  values ('99999999-0000-4000-8000-000000000002')$sql$, 'SEMIFINAL_NOT_ELIGIBLE');
select pg_temp.assert_denied($sql$insert into public.finale_registrations (profile_id, registration_status)
  values ('99999999-0000-4000-8000-000000000002', 'cancelled')$sql$, 'SEMIFINAL_NOT_ELIGIBLE');
reset role;
select set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.set_semifinal_eligibility('99999999-0000-4000-8000-000000000002', 'eligible', 'toprope', 'Ü15 männlich');
select public.set_semifinal_eligibility('99999999-0000-4000-8000-000000000003', 'eligible', 'lead', 'Ü15 weiblich');
reset role;
select set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.semifinal_eligibility), 'other athlete eligibility private');
select pg_temp.assert_denied($sql$insert into public.finale_registrations (profile_id)
  values ('99999999-0000-4000-8000-000000000003')$sql$, 'REGISTRATION_OWN_PROFILE_ONLY');
select pg_temp.assert_denied($sql$insert into public.finale_registrations (profile_id, season_year)
  values ('99999999-0000-4000-8000-000000000002', 'WRONG-SEASON')$sql$, 'REGISTRATION_SEASON_MISMATCH');
select pg_temp.assert_true((public.register_for_semifinal() ->> 'registered')::boolean, 'approved athlete can register');
select pg_temp.assert_true((public.register_for_semifinal() ->> 'registered')::boolean, 'double registration is idempotent');
select pg_temp.assert_true((select count(*) = 1 from public.finale_registrations where season_year = 'TEST-ONLY'), 'no duplicate row');
select pg_temp.assert_true((select count(*) = 0 from public.semifinal_registration_audit), 'audit private from participant');
select pg_temp.assert_true(not (public.cancel_semifinal_registration() ->> 'registered')::boolean, 'cancellation succeeds');
select pg_temp.assert_true((select registration_status = 'cancelled' from public.finale_registrations where season_year = 'TEST-ONLY'), 'cancellation retained, not deleted');
select public.register_for_semifinal();
reset role;
select set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}', true);
update public.admin_settings set finale_registration_deadline = (now() at time zone 'Europe/Berlin')::date - 1
where id = '99999999-0000-4000-8000-000000000010';
select pg_temp.assert_true(exists(select 1 from public.semifinal_registration_audit where profile_id = '99999999-0000-4000-8000-000000000002' and action = 'UPDATE'), 'registration/cancellation changes audited');
select set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_denied('select public.register_for_semifinal()', 'SEMIFINAL_REGISTRATION_CLOSED');
select pg_temp.assert_denied('select public.cancel_semifinal_registration()', 'SEMIFINAL_REGISTRATION_CLOSED');
select pg_temp.assert_denied($sql$select public.admin_cancel_semifinal_registration(
  (select id from public.finale_registrations where profile_id = '99999999-0000-4000-8000-000000000002' and season_year = 'TEST-ONLY'))$sql$, 'LEAGUE_ADMIN_REQUIRED');
select pg_temp.assert_denied($sql$delete from public.finale_registrations where profile_id = '99999999-0000-4000-8000-000000000002'$sql$, 'SEMIFINAL_REGISTRATION_CLOSED');
reset role;
select set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true(public.admin_cancel_semifinal_registration(
  (select id from public.finale_registrations where profile_id = '99999999-0000-4000-8000-000000000002' and season_year = 'TEST-ONLY')) ->> 'registration_status' = 'cancelled', 'admin cancellation works after deadline');
select pg_temp.assert_true((select registration_status = 'cancelled' from public.finale_registrations
  where profile_id = '99999999-0000-4000-8000-000000000002' and season_year = 'TEST-ONLY'), 'admin cancellation retains the row');
select pg_temp.assert_true(exists(select 1 from public.semifinal_registration_audit
  where profile_id = '99999999-0000-4000-8000-000000000002' and season_year = 'TEST-ONLY'
    and actor_user_id = '99999999-0000-4000-8000-000000000001' and entity_type = 'registration'
    and action = 'UPDATE' and before_data ->> 'registration_status' = 'registered'
    and after_data ->> 'registration_status' = 'cancelled'), 'admin cancellation audited with actor and status transition');
reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.assert_denied('select public.get_semifinal_registration_state()', 'AUTHENTICATION_REQUIRED');
set local role anon;
select pg_temp.assert_denied('select public.get_semifinal_registration_state()', 'permission denied');
select pg_temp.assert_denied('select public.register_for_semifinal()', 'permission denied');
reset role;

-- The approved admin change-request endpoint writes with a service JWT.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
update public.profiles set league='toprope', gender='m' where id='99999999-0000-4000-8000-000000000003';
reset role;
select pg_temp.assert_true(exists(select 1 from public.profiles where id='99999999-0000-4000-8000-000000000003' and league='toprope' and gender='m'), 'service-role admin correction path preserved');
select pg_temp.assert_true(exists(select 1 from public.data_change_audit where entity_id='99999999-0000-4000-8000-000000000003' and action='update'), 'service-role profile correction remains audited');

insert into auth.users (id,email) values ('99999999-0000-4000-8000-000000000004','semifinal-gym-admin@test.invalid');
insert into public.profiles (id,role) values ('99999999-0000-4000-8000-000000000004','gym_admin');
insert into public.results (profile_id,route_id,points) values ('99999999-0000-4000-8000-000000000004','99999999-0000-4000-8000-000000000021',1);
select set_config('request.jwt.claim.sub','99999999-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"99999999-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_denied($sql$update public.results set points=2 where profile_id='99999999-0000-4000-8000-000000000004'$sql$,'QUALIFICATION_READ_ONLY');
select pg_temp.assert_denied($sql$select public.set_semifinal_eligibility('99999999-0000-4000-8000-000000000003','eligible','lead','Ü15 weiblich')$sql$,'LEAGUE_ADMIN_REQUIRED');
select pg_temp.assert_true(not (public.get_semifinal_registration_state()->>'eligible')::boolean,'gym admin is not an eligible athlete');
reset role;

-- Real Auth SQL identity, not a spoofable JSON role claim. No production users.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '', true);
set session authorization supabase_auth_admin;
delete from auth.users where id = '99999999-0000-4000-8000-000000000002';
reset session authorization;
select pg_temp.assert_true(not exists(select 1 from public.profiles where id = '99999999-0000-4000-8000-000000000002'), 'trusted Auth deletion still cascades to profile');
select pg_temp.assert_true(not exists(select 1 from public.results where profile_id = '99999999-0000-4000-8000-000000000002'), 'trusted Auth deletion still cascades to result');
select pg_temp.assert_true(exists(select 1 from public.semifinal_registration_audit where profile_id = '99999999-0000-4000-8000-000000000002' and action = 'DELETE'), 'trusted Auth cascade keeps registration audit');

rollback;
