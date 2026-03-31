begin;

alter table public.profiles
  alter column role set default 'participant';

update public.profiles
set role = 'participant'
where role is null
   or role not in ('participant', 'gym_admin', 'league_admin');

update public.profiles p
set role = 'gym_admin'
where p.role = 'participant'
  and exists (
    select 1
    from public.gym_admins ga
    where ga.profile_id = p.id
  );

alter table public.profiles
  alter column role set not null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('participant', 'gym_admin', 'league_admin'));

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    'participant'
  );
$$;

create or replace function public.is_league_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() = 'league_admin';
$$;

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text := public.current_user_role();
begin
  if auth.uid() = old.id and actor_role <> 'league_admin' then
    if new.role is distinct from old.role then
      raise exception 'role cannot be changed by the user';
    end if;

    if new.participation_activated_at is distinct from old.participation_activated_at then
      raise exception 'participation_activated_at cannot be changed by the user';
    end if;

    if new.email is distinct from old.email then
      raise exception 'email cannot be changed by the user';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.archive_profile(
  p_profile_id uuid,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_league_admin() then
    raise exception 'Only league admins can archive profiles';
  end if;

  update public.profiles
  set
    archived_at = coalesce(archived_at, now()),
    archived_by = auth.uid(),
    archive_reason = p_reason
  where id = p_profile_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;

create or replace function public.restore_profile(
  p_profile_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_league_admin() then
    raise exception 'Only league admins can restore profiles';
  end if;

  update public.profiles
  set
    archived_at = null,
    archived_by = null,
    archive_reason = null
  where id = p_profile_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;

create or replace function public.archive_gym(
  p_gym_id uuid,
  p_reason text default null
)
returns public.gyms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym public.gyms;
  v_admin_reason text := coalesce(nullif(p_reason, ''), format('auto:gym:%s', p_gym_id::text));
begin
  if not public.is_league_admin() then
    raise exception 'Only league admins can archive gyms';
  end if;

  update public.gyms
  set
    archived_at = coalesce(archived_at, now()),
    archived_by = auth.uid(),
    archive_reason = p_reason
  where id = p_gym_id
  returning * into v_gym;

  if v_gym.id is null then
    raise exception 'Gym not found';
  end if;

  update public.profiles
  set
    archived_at = coalesce(archived_at, now()),
    archived_by = auth.uid(),
    archive_reason = v_admin_reason
  where id in (
    select profile_id
    from public.gym_admins
    where gym_id = p_gym_id
  )
    and archived_at is null;

  return v_gym;
end;
$$;

create or replace function public.restore_gym(
  p_gym_id uuid
)
returns public.gyms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym public.gyms;
begin
  if not public.is_league_admin() then
    raise exception 'Only league admins can restore gyms';
  end if;

  update public.gyms
  set
    archived_at = null,
    archived_by = null,
    archive_reason = null
  where id = p_gym_id
  returning * into v_gym;

  if v_gym.id is null then
    raise exception 'Gym not found';
  end if;

  update public.profiles
  set
    archived_at = null,
    archived_by = null,
    archive_reason = null
  where id in (
    select profile_id
    from public.gym_admins
    where gym_id = p_gym_id
  );

  return v_gym;
end;
$$;

drop policy if exists "Profiles read league admin" on public.profiles;
create policy "Profiles read league admin" on public.profiles
  for select using (public.is_league_admin());

drop policy if exists "Profiles update league admin" on public.profiles;
create policy "Profiles update league admin" on public.profiles
  for update
  using (public.is_league_admin())
  with check (public.is_league_admin());

drop policy if exists "Profiles delete league admin" on public.profiles;
create policy "Profiles delete league admin" on public.profiles
  for delete
  using (public.is_league_admin());

drop policy if exists "Gyms update league admin" on public.gyms;
create policy "Gyms update league admin" on public.gyms
  for update
  using (public.is_league_admin())
  with check (public.is_league_admin());

drop policy if exists "Routes update league admin" on public.routes;
create policy "Routes update league admin" on public.routes
  for update
  using (public.is_league_admin())
  with check (public.is_league_admin());

drop policy if exists "Routes delete league admin" on public.routes;
create policy "Routes delete league admin" on public.routes
  for delete
  using (public.is_league_admin());

drop policy if exists "Routes insert league admin" on public.routes;
create policy "Routes insert league admin" on public.routes
  for insert
  with check (public.is_league_admin());

drop policy if exists "Results read league admin" on public.results;
create policy "Results read league admin" on public.results
  for select using (public.is_league_admin());

drop policy if exists "Change requests read league admin" on public.change_requests;
create policy "Change requests read league admin" on public.change_requests
  for select using (public.is_league_admin());

drop policy if exists "Gym admins read league" on public.gym_admins;
create policy "Gym admins read league" on public.gym_admins
  for select using (public.is_league_admin());

drop policy if exists "Gym admins insert own" on public.gym_admins;

drop policy if exists "Gym admins insert league" on public.gym_admins;
create policy "Gym admins insert league" on public.gym_admins
  for insert
  with check (public.is_league_admin());

drop policy if exists "Admin settings write league" on public.admin_settings;
create policy "Admin settings write league" on public.admin_settings
  for insert
  with check (public.is_league_admin());

drop policy if exists "Admin settings update league" on public.admin_settings;
create policy "Admin settings update league" on public.admin_settings
  for update
  using (public.is_league_admin())
  with check (public.is_league_admin());

drop policy if exists "Profile overrides read league" on public.profile_overrides;
create policy "Profile overrides read league" on public.profile_overrides
  for select using (public.is_league_admin());

drop policy if exists "Profile overrides write league" on public.profile_overrides;
create policy "Profile overrides write league" on public.profile_overrides
  for insert
  with check (public.is_league_admin());

drop policy if exists "Profile overrides update league" on public.profile_overrides;
create policy "Profile overrides update league" on public.profile_overrides
  for update
  using (public.is_league_admin())
  with check (public.is_league_admin());

drop policy if exists "Gym invites read league" on public.gym_invites;
create policy "Gym invites read league" on public.gym_invites
  for select using (public.is_league_admin());

drop policy if exists "Gym invites insert league" on public.gym_invites;
create policy "Gym invites insert league" on public.gym_invites
  for insert
  with check (public.is_league_admin());

drop policy if exists "Gym invites update league" on public.gym_invites;
create policy "Gym invites update league" on public.gym_invites
  for update
  using (public.is_league_admin())
  with check (public.is_league_admin());

drop policy if exists "Finale registrations read league" on public.finale_registrations;
create policy "Finale registrations read league" on public.finale_registrations
  for select using (public.is_league_admin());

drop policy if exists "Finale registrations delete league" on public.finale_registrations;
create policy "Finale registrations delete league" on public.finale_registrations
  for delete
  using (public.is_league_admin());

drop policy if exists "Audit read league admin" on public.data_change_audit;
create policy "Audit read league admin" on public.data_change_audit
  for select using (public.is_league_admin());

commit;
