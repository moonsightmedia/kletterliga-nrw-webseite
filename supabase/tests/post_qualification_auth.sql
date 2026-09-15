-- Isolated test database only. Public schema and Auth trigger from live snapshot.
begin;
do $$ begin
  if current_database() not like 'kletterliga_semifinal_test%' then raise exception 'LOCAL_TEST_DATABASE_REQUIRED'; end if;
end $$;
insert into auth.users (id,email,raw_user_meta_data) values
('99999999-1000-4000-8000-000000000001','forged-role@test.invalid','{"role":"league_admin","birth_date":"2000-01-01","gender":"m","league":"toprope"}');
set session authorization supabase_auth_admin;
update auth.users set email_confirmed_at=now() where id='99999999-1000-4000-8000-000000000001';
reset session authorization;
do $$ begin
  if (select role from public.profiles where id='99999999-1000-4000-8000-000000000001') <> 'participant' then
    raise exception 'FAIL: user metadata elevated newly confirmed profile role';
  end if;
  raise notice 'PASS: confirmed signup cannot self-assign administrator';
end $$;
-- A direct self-owned profile INSERT must not grant privileged fields either.
insert into auth.users (id,email) values ('99999999-1000-4000-8000-000000000002','direct-role@test.invalid');
select set_config('request.jwt.claim.sub','99999999-1000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"99999999-1000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    insert into public.profiles (id,role) values ('99999999-1000-4000-8000-000000000002','league_admin');
  exception when insufficient_privilege then
    raise notice 'PASS: direct participant INSERT cannot grant admin role';
    return;
  end;
  raise exception 'FAIL: direct participant INSERT granted admin role';
end $$;
do $$ begin
  begin
    insert into public.profiles (id,role,participation_activated_at) values ('99999999-1000-4000-8000-000000000002','participant',now());
  exception when insufficient_privilege then
    raise notice 'PASS: direct participant INSERT cannot self-activate';
    return;
  end;
  raise exception 'FAIL: direct participant INSERT self-activated';
end $$;
insert into public.profiles (id,role,birth_date,gender,league) values ('99999999-1000-4000-8000-000000000002','participant','2000-01-01','m','toprope');
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','',true);
set session authorization supabase_auth_admin;
update auth.users set raw_user_meta_data='{"role":"league_admin","birth_date":"2015-01-01","gender":"w","league":"lead"}',email_confirmed_at=now()
where id='99999999-1000-4000-8000-000000000002';
reset session authorization;
do $$ begin
  if not exists(select 1 from public.profiles where id='99999999-1000-4000-8000-000000000002' and birth_date='2000-01-01' and gender='m' and league='toprope' and role='participant') then
    raise exception 'FAIL: confirmation changed existing official profile';
  end if;
  raise notice 'PASS: confirmation leaves existing official profile unchanged';
end $$;
rollback;
