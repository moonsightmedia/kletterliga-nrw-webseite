-- LOCAL TEST SUPPORT ONLY, never a production migration.
-- The public schema is restored separately from a fresh schema-only live dump.
-- Auth claim helpers mirror the live definitions verified on 2026-09-15.
do $$ begin
  if current_database() not like 'kletterliga_semifinal_test%' then
    raise exception 'LOCAL_TEST_DATABASE_REQUIRED';
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists(select 1 from pg_roles where rolname='supabase_admin') then create role supabase_admin nologin; end if;
  if not exists(select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin noinherit; end if;
end $$;
create schema auth authorization supabase_auth_admin;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  email_confirmed_at timestamptz
);
alter table auth.users owner to supabase_auth_admin;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
    nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),
    nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')::text
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim',true),''),
    nullif(current_setting('request.jwt.claims',true),''))::jsonb
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
-- No CASCADE: abort if the new database unexpectedly contains public objects.
drop schema public;
