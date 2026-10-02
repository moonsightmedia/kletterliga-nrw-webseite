-- Synthetic, transaction-scoped integration checks. Run after the certificate migration.
begin;
create function pg_temp.assert_true(p_ok boolean, p_message text) returns void language plpgsql as $$
begin if p_ok is distinct from true then raise exception 'FAIL: %', p_message; end if; end; $$;
create function pg_temp.assert_denied(p_sql text, p_message text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if position(p_message in sqlerrm) > 0 then return; end if;
    raise;
  end;
  raise exception 'FAIL: expected denial containing %', p_message;
end; $$;

insert into auth.users(id,email) values
 ('99999999-7000-4000-8000-000000000001','cert-admin@test.invalid'),
 ('99999999-7000-4000-8000-000000000002','cert-athlete@test.invalid'),
 ('99999999-7000-4000-8000-000000000003','cert-no-result@test.invalid');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.profiles(id,role,first_name,last_name,participation_activated_at) values
 ('99999999-7000-4000-8000-000000000001','league_admin','Certificate','Admin',now()),
 ('99999999-7000-4000-8000-000000000002','participant','Mira','Müller',now()),
 ('99999999-7000-4000-8000-000000000003','participant','No','Result',now());
insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_date)
 values('CERT-TEST','2026-01-01','2026-01-02','2026-01-04');
insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label) values
 ('CERT-TEST','99999999-7000-4000-8000-000000000002','eligible','lead','U15-w'),
 ('CERT-TEST','99999999-7000-4000-8000-000000000003','eligible','lead','U15-w');
insert into public.finale_registrations(profile_id,season_year,registration_status) values
 ('99999999-7000-4000-8000-000000000002','CERT-TEST','registered'),
 ('99999999-7000-4000-8000-000000000003','CERT-TEST','registered');
insert into public.competition_day_events(season_year,phase) values('CERT-TEST','closed');
insert into public.competition_day_routes(event_id,route_number,name,grade,color)
 select id,1,'Certificate route','6a','blue' from public.competition_day_events where season_year='CERT-TEST';
insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points)
 select e.id,r.id,'99999999-7000-4000-8000-000000000002',5,false,50
 from public.competition_day_events e join public.competition_day_routes r on r.event_id=e.id
 where e.season_year='CERT-TEST';

select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true(public.get_my_certificates('CERT-TEST')->'finale'='null'::jsonb,
 'closed entry does not release certificate');
select pg_temp.assert_denied('select public.publish_finale_certificates(''CERT-TEST'')','LEAGUE_ADMIN_REQUIRED');
select pg_temp.assert_denied('select * from public.finale_certificates','permission denied');
reset role;

select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.publish_finale_certificates('CERT-TEST');
select pg_temp.assert_true((public.get_certificate_publication('CERT-TEST')->>'certificate_count')::int=1,
 'registered participant without result has no certificate');
reset role;

select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((public.get_my_certificates('CERT-TEST')->'finale'->>'rank')::int=1,
 'athlete reads own published rank');
reset role;

select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true(public.get_my_certificates('CERT-TEST')->'finale'='null'::jsonb,
 'registered participant without result cannot read a certificate');
select pg_temp.assert_denied('select public.get_certificate_publication(''CERT-TEST'')','LEAGUE_ADMIN_REQUIRED');
reset role;

-- A new result cannot silently alter an already published document.
insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points)
 select e.id,r.id,'99999999-7000-4000-8000-000000000003',7,false,70
 from public.competition_day_events e join public.competition_day_routes r on r.event_id=e.id
 where e.season_year='CERT-TEST';
select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((public.get_my_certificates('CERT-TEST')->'finale'->>'rank')::int=1,
 'published snapshot stays unchanged after a later result');
reset role;
select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.publish_finale_certificates('CERT-TEST');
select pg_temp.assert_true((public.get_certificate_publication('CERT-TEST')->>'revision')::int=2,
 'republication increments version');
reset role;
select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((public.get_my_certificates('CERT-TEST')->'finale'->>'rank')::int=2,
 'republished certificate reflects corrected standing');
reset role;
rollback;
