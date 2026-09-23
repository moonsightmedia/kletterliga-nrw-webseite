-- All fixtures are rolled back. Run after the route-draft migration.
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
 ('99999999-6100-4000-8000-000000000001','competition-draft-admin@test.invalid'),
 ('99999999-6100-4000-8000-000000000002','competition-draft-participant@test.invalid');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.profiles(id,role,first_name,last_name) values
 ('99999999-6100-4000-8000-000000000001','league_admin','Draft','Admin'),
 ('99999999-6100-4000-8000-000000000002','participant','Draft','Athlete');
insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_enabled,finale_registration_deadline,finale_date)
 values('COMP-DRAFT','2026-01-01','2026-01-02',false,'2026-01-03','2026-01-04');

select set_config('request.jwt.claim.sub','99999999-6100-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-6100-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.save_competition_route_draft('COMP-DRAFT',
  (select jsonb_agg(jsonb_build_object('number',n,'name','Route '||n,'grade','','color','') order by n) from generate_series(1,14) n));
reset role;
select pg_temp.assert_true((select phase='draft' and opened_at is null and zone_points='[0,0,0,0,0,0,0,0,0,0,0]'::jsonb from public.competition_day_events where season_year='COMP-DRAFT'), '14 routes leave event as unopened draft with no invented scoring');
select pg_temp.assert_true((select count(*)=14 from public.competition_day_routes r join public.competition_day_events e on e.id=r.event_id where e.season_year='COMP-DRAFT'), '14 numbered routes saved');
select pg_temp.assert_true((select count(*)=0 from public.competition_day_classes c join public.competition_day_events e on e.id=c.event_id where e.season_year='COMP-DRAFT'), 'no classes invented');

set local role authenticated;
select pg_temp.assert_denied($sql$select public.set_competition_phase('COMP-DRAFT','open')$sql$, 'Zum Öffnen fehlen Routen');
select pg_temp.assert_denied($sql$select public.save_competition_route_draft('COMP-DRAFT', '[{"number":1,"name":"Route 1","grade":"","color":""}]'::jsonb)$sql$, '5 bis 30');
select set_config('request.jwt.claim.sub','99999999-6100-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"99999999-6100-4000-8000-000000000002","role":"authenticated"}',true);
select pg_temp.assert_denied($sql$select public.save_competition_route_draft('COMP-DRAFT', '[]'::jsonb)$sql$, 'LEAGUE_ADMIN_REQUIRED');
reset role;
rollback;
