-- LOCAL ONLY: synthetic legacy records to verify that migration keeps data.
do $$ begin
  if current_database() not like 'kletterliga_semifinal_test%' then raise exception 'LOCAL_TEST_DATABASE_REQUIRED'; end if;
end $$;
insert into auth.users (id,email) values ('99999999-2000-4000-8000-000000000001','legacy@test.invalid');
insert into public.profiles (id,role,birth_date,gender,league,participation_activated_at)
values ('99999999-2000-4000-8000-000000000001','participant','2000-01-01','m','toprope',now());
insert into public.gyms (id,name) values ('99999999-2000-4000-8000-000000000002','Legacy synthetic gym');
insert into public.routes (id,gym_id,discipline,code)
values ('99999999-2000-4000-8000-000000000003','99999999-2000-4000-8000-000000000002','toprope','LEGACY-TEST');
insert into public.results (profile_id,route_id,points,rating,feedback)
values ('99999999-2000-4000-8000-000000000001','99999999-2000-4000-8000-000000000003',42.5,4,'Synthetic original result');
insert into public.admin_settings (season_year,qualification_start,qualification_end,finale_enabled,finale_registration_deadline,finale_date)
values ('LEGACY-TEST','2026-05-01','2026-09-13',false,'2026-09-27','2026-10-03');
insert into public.finale_registrations (profile_id,created_at)
values ('99999999-2000-4000-8000-000000000001','2026-09-14T12:00:00Z');
create temp table preserved_before as
select 'results'::text as entity,to_jsonb(r) as original from public.results r
union all select 'profiles',to_jsonb(p) from public.profiles p
union all select 'settings',to_jsonb(s) from public.admin_settings s
union all select 'registrations',to_jsonb(f) from public.finale_registrations f;
