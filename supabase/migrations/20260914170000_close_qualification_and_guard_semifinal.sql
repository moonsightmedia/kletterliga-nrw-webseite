-- Preparation only: does not enable registration, approve athletes, or change rankings.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Approval RPCs rely on a trustworthy DB role. A new participant must not
-- bootstrap administrator/activation privileges through a self-owned INSERT.
create or replace function public.guard_profile_initial_privileges()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.is_league_admin() or auth.role() = 'service_role' then return new; end if;
  if new.role is distinct from 'participant'
    or new.participation_activated_at is not null
    or new.archived_at is not null or new.archived_by is not null
    or new.archive_reason is not null then
    raise exception using errcode = '42501', message = 'PROFILE_PRIVILEGED_INSERT_FORBIDDEN';
  end if;
  return new;
end;
$$;
create trigger guard_profile_initial_privileges_trigger
before insert on public.profiles
for each row execute function public.guard_profile_initial_privileges();

-- Existing Auth confirmation trigger used user-editable metadata for role.
-- Confirming an email only creates a missing participant; it never overwrites
-- an existing official profile or imports a privileged role from metadata.
create or replace function public.sync_profile_from_user_metadata()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null
    and not exists (select 1 from public.profiles where id = new.id) then
    insert into public.profiles (id, email, first_name, last_name, birth_date, gender, league, role)
    values (new.id, new.email, new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name',
      nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
      new.raw_user_meta_data ->> 'gender', new.raw_user_meta_data ->> 'league', 'participant')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

-- Match the settings RPC: the most recently updated season is authoritative.
-- Date fields are inclusive calendar days in Germany, never the DB/server timezone.
create or replace function public.qualification_entry_is_open(p_at timestamptz default statement_timestamp())
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select s.qualification_start is not null
      and s.qualification_end is not null
      and s.qualification_start <= s.qualification_end
      and p_at >= (s.qualification_start::timestamp at time zone 'Europe/Berlin')
      and p_at < ((s.qualification_end + 1)::timestamp at time zone 'Europe/Berlin')
    from public.admin_settings s order by s.updated_at desc nulls last, s.id desc limit 1
  ), false);
$$;

create or replace function public.guard_qualification_result_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Auth's existing admin-delete path uses its own SQL login, not a JWT.
  -- Only its FK cascade is exempt; clients cannot forge session_user.
  if tg_op = 'DELETE' and session_user = 'supabase_auth_admin' and pg_trigger_depth() > 1 then
    return old;
  end if;
  -- Trusted roles come from profiles or the server-only service credential,
  -- never editable user_metadata. Preserve existing authenticated admin endpoints.
  if not public.is_league_admin() and coalesce(auth.role(), '') <> 'service_role'
    and not public.qualification_entry_is_open() then
    raise exception using errcode = '42501', message = 'QUALIFICATION_READ_ONLY';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger guard_qualification_result_write_trigger
before insert or update or delete on public.results
for each row execute function public.guard_qualification_result_write();

create or replace function public.guard_closed_competition_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_end date;
  v_start date;
begin
  if public.is_league_admin() or auth.role() = 'service_role' then return new; end if;
  if new.birth_date is not distinct from old.birth_date
    and new.gender is not distinct from old.gender
    and new.league is not distinct from old.league
    and new.archived_at is not distinct from old.archived_at
    and new.archived_by is not distinct from old.archived_by
    and new.archive_reason is not distinct from old.archive_reason then return new; end if;

  select qualification_start, qualification_end into v_start, v_end
  from public.admin_settings order by updated_at desc nulls last, id desc limit 1;
  if v_start is null or v_end is null or v_end < v_start
    or statement_timestamp() >= ((v_end + 1)::timestamp at time zone 'Europe/Berlin') then
    raise exception using errcode = '42501', message = 'COMPETITION_PROFILE_READ_ONLY';
  end if;
  return new;
end;
$$;

create trigger guard_closed_competition_profile_trigger
before update on public.profiles
for each row execute function public.guard_closed_competition_profile();

-- The Orga explicitly approves a season + league + class snapshot. No ranking,
-- birthday or zero-results decision is made by this migration.
create table public.semifinal_eligibility (
  season_year text not null check (length(btrim(season_year)) between 1 and 20),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'eligible', 'not_eligible')),
  league text check (league in ('toprope', 'lead')),
  class_label text check (class_label is null or length(btrim(class_label)) between 1 and 80),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz not null default now(),
  primary key (season_year, profile_id),
  constraint semifinal_eligible_requires_class check (
    status <> 'eligible' or (league is not null and class_label is not null)
  )
);
alter table public.semifinal_eligibility enable row level security;
create policy "Semifinal eligibility read own" on public.semifinal_eligibility
  for select to authenticated using (profile_id = auth.uid());
create policy "Semifinal eligibility read league" on public.semifinal_eligibility
  for select to authenticated using (public.is_league_admin());
-- All approval writes go through the checked RPC, including for league admins.
revoke all on public.semifinal_eligibility from anon, authenticated;
grant select on public.semifinal_eligibility to authenticated;

alter table public.finale_registrations
  add column season_year text,
  add column registration_status text not null default 'registered'
    check (registration_status in ('registered', 'cancelled')),
  add column updated_at timestamptz not null default now();
-- Preserve existing rows, but never turn them into eligibility approvals.
update public.finale_registrations set season_year = (
  select nullif(btrim(season_year), '') from public.admin_settings
  order by updated_at desc nulls last, id desc limit 1
);
alter table public.finale_registrations drop constraint if exists finale_registrations_profile_id_key;
create unique index finale_registrations_season_profile_key
  on public.finale_registrations (season_year, profile_id);

create table public.semifinal_registration_audit (
  id uuid primary key default gen_random_uuid(),
  season_year text,
  profile_id uuid,
  actor_user_id uuid,
  entity_type text not null check (entity_type in ('eligibility', 'registration')),
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
alter table public.semifinal_registration_audit enable row level security;
create policy "Semifinal audit read league" on public.semifinal_registration_audit
  for select to authenticated using (public.is_league_admin());
revoke all on public.semifinal_registration_audit from anon, authenticated;
grant select on public.semifinal_registration_audit to authenticated;

create or replace function public.audit_semifinal_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.semifinal_registration_audit (
    season_year, profile_id, actor_user_id, entity_type, action, before_data, after_data
  ) values (
    case when tg_op = 'DELETE' then old.season_year else new.season_year end,
    case when tg_op = 'DELETE' then old.profile_id else new.profile_id end,
    auth.uid(), case when tg_table_name = 'semifinal_eligibility' then 'eligibility' else 'registration' end,
    tg_op, case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger audit_semifinal_eligibility_trigger
after insert or update or delete on public.semifinal_eligibility
for each row execute function public.audit_semifinal_change();
create trigger audit_semifinal_registration_trigger
after insert or update or delete on public.finale_registrations
for each row execute function public.audit_semifinal_change();

create or replace function public.get_semifinal_registration_state()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_settings public.admin_settings;
  v_profile public.profiles;
  v_eligibility public.semifinal_eligibility;
  v_deadline timestamptz;
  v_eligible boolean := false;
  v_open boolean := false;
  v_registered boolean := false;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  select * into v_settings from public.admin_settings
  order by updated_at desc nulls last, id desc limit 1;
  select * into v_profile from public.profiles where id = auth.uid();
  select * into v_eligibility from public.semifinal_eligibility
  where profile_id = auth.uid() and season_year = v_settings.season_year;
  v_deadline := ((v_settings.finale_registration_deadline + 1)::timestamp at time zone 'Europe/Berlin');
  v_eligible := coalesce(v_eligibility.status = 'eligible'
    and v_profile.role = 'participant'
    and v_profile.archived_at is null
    and v_profile.participation_activated_at is not null, false);
  v_open := coalesce(v_settings.finale_enabled
    and nullif(btrim(v_settings.season_year), '') is not null
    and v_settings.qualification_start is not null
    and v_settings.qualification_end >= v_settings.qualification_start
    and v_settings.finale_registration_deadline > v_settings.qualification_end
    and v_settings.finale_date >= v_settings.finale_registration_deadline
    and statement_timestamp() >= ((v_settings.qualification_end + 1)::timestamp at time zone 'Europe/Berlin')
    and statement_timestamp() < v_deadline, false);
  select exists (
    select 1 from public.finale_registrations
    where profile_id = auth.uid() and season_year = v_settings.season_year
      and registration_status = 'registered'
  ) into v_registered;
  return jsonb_build_object(
    'eligible', v_eligible,
    'eligibility_status', case when v_eligible then 'eligible'
      when v_eligibility.status = 'not_eligible' then 'not_eligible' else 'pending' end,
    'registered', v_registered, 'registration_open', v_open,
    'registration_deadline', v_deadline, 'finale_date', v_settings.finale_date,
    'season_year', v_settings.season_year,
    'league', v_eligibility.league, 'class_label', v_eligibility.class_label
  );
end;
$$;

-- Legacy clients still write this table directly. This trigger closes that path
-- too; no client-provided identity, season, timestamp or eligibility is trusted.
create or replace function public.guard_semifinal_registration_write()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_state jsonb;
begin
  if tg_op = 'DELETE' and session_user = 'supabase_auth_admin' and pg_trigger_depth() > 1 then
    return old;
  end if;
  if public.is_league_admin() or auth.role() = 'service_role' then
    if tg_op = 'DELETE' then return old; end if;
    new.updated_at := statement_timestamp();
    return new;
  end if;
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if (tg_op <> 'INSERT' and old.profile_id is distinct from auth.uid())
    or (tg_op <> 'DELETE' and new.profile_id is distinct from auth.uid()) then
    raise exception using errcode = '42501', message = 'REGISTRATION_OWN_PROFILE_ONLY';
  end if;
  v_state := public.get_semifinal_registration_state();
  if not (v_state ->> 'registration_open')::boolean then
    raise exception using errcode = '42501', message = 'SEMIFINAL_REGISTRATION_CLOSED';
  end if;
  if tg_op <> 'INSERT' and old.season_year is distinct from (v_state ->> 'season_year') then
    raise exception using errcode = '42501', message = 'REGISTRATION_SEASON_MISMATCH';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if not (v_state ->> 'eligible')::boolean
    and (tg_op = 'INSERT' or new.registration_status = 'registered') then
    raise exception using errcode = '42501', message = 'SEMIFINAL_NOT_ELIGIBLE';
  end if;
  if new.season_year is not null and new.season_year is distinct from (v_state ->> 'season_year') then
    raise exception using errcode = '42501', message = 'REGISTRATION_SEASON_MISMATCH';
  end if;
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception using errcode = '42501', message = 'REGISTRATION_ID_IMMUTABLE';
  end if;
  new.season_year := v_state ->> 'season_year';
  new.created_at := case when tg_op = 'INSERT' then statement_timestamp() else old.created_at end;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;
create trigger guard_semifinal_registration_write_trigger
before insert or update or delete on public.finale_registrations
for each row execute function public.guard_semifinal_registration_write();

create or replace function public.register_for_semifinal()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_state jsonb;
begin
  v_state := public.get_semifinal_registration_state();
  if not (v_state ->> 'registration_open')::boolean then
    raise exception using errcode = '42501', message = 'SEMIFINAL_REGISTRATION_CLOSED';
  end if;
  if not (v_state ->> 'eligible')::boolean then
    raise exception using errcode = '42501', message = 'SEMIFINAL_NOT_ELIGIBLE';
  end if;
  insert into public.finale_registrations (profile_id, season_year, registration_status)
  values (auth.uid(), v_state ->> 'season_year', 'registered')
  on conflict (season_year, profile_id) do update
    set registration_status = 'registered', updated_at = statement_timestamp();
  return public.get_semifinal_registration_state();
end;
$$;

create or replace function public.cancel_semifinal_registration()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_state jsonb;
begin
  v_state := public.get_semifinal_registration_state();
  if not (v_state ->> 'registration_open')::boolean then
    raise exception using errcode = '42501', message = 'SEMIFINAL_REGISTRATION_CLOSED';
  end if;
  update public.finale_registrations set registration_status = 'cancelled'
  where profile_id = auth.uid() and season_year = v_state ->> 'season_year';
  return public.get_semifinal_registration_state();
end;
$$;

create or replace function public.set_semifinal_eligibility(
  p_profile_id uuid, p_status text, p_league text default null, p_class_label text default null
)
returns public.semifinal_eligibility
language plpgsql security definer set search_path = public
as $$
declare v_season text; v_result public.semifinal_eligibility;
begin
  if not public.is_league_admin() then
    raise exception using errcode = '42501', message = 'LEAGUE_ADMIN_REQUIRED';
  end if;
  select nullif(btrim(season_year), '') into v_season from public.admin_settings
  order by updated_at desc nulls last, id desc limit 1;
  if v_season is null then raise exception 'SEASON_NOT_CONFIGURED'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id
    and role = 'participant' and archived_at is null and participation_activated_at is not null) then
    raise exception 'ACTIVE_PARTICIPANT_REQUIRED';
  end if;
  insert into public.semifinal_eligibility (season_year, profile_id, status, league, class_label, decided_by)
  values (v_season, p_profile_id, p_status, p_league, nullif(btrim(p_class_label), ''), auth.uid())
  on conflict (season_year, profile_id) do update set
    status = excluded.status, league = excluded.league, class_label = excluded.class_label,
    decided_by = auth.uid(), decided_at = statement_timestamp()
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_cancel_semifinal_registration(p_registration_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_registration public.finale_registrations;
begin
  if not public.is_league_admin() then
    raise exception using errcode = '42501', message = 'LEAGUE_ADMIN_REQUIRED';
  end if;
  update public.finale_registrations set registration_status = 'cancelled'
  where id = p_registration_id
  returning * into v_registration;
  if not found then raise exception 'REGISTRATION_NOT_FOUND'; end if;
  return jsonb_build_object('id', v_registration.id, 'registration_status', v_registration.registration_status);
end;
$$;

-- Internal helpers cannot be invoked as arbitrary public RPCs.
revoke all on function public.guard_profile_initial_privileges() from public, anon, authenticated;
revoke all on function public.sync_profile_from_user_metadata() from public, anon, authenticated;
revoke all on function public.guard_qualification_result_write() from public, anon, authenticated;
revoke all on function public.guard_closed_competition_profile() from public, anon, authenticated;
revoke all on function public.guard_semifinal_registration_write() from public, anon, authenticated;
revoke all on function public.audit_semifinal_change() from public, anon, authenticated;
revoke all on function public.qualification_entry_is_open(timestamptz) from public, anon;
grant execute on function public.qualification_entry_is_open(timestamptz) to authenticated;
revoke all on function public.get_semifinal_registration_state() from public, anon;
revoke all on function public.register_for_semifinal() from public, anon;
revoke all on function public.cancel_semifinal_registration() from public, anon;
revoke all on function public.set_semifinal_eligibility(uuid, text, text, text) from public, anon;
revoke all on function public.admin_cancel_semifinal_registration(uuid) from public, anon;
grant execute on function public.get_semifinal_registration_state() to authenticated;
grant execute on function public.register_for_semifinal() to authenticated;
grant execute on function public.cancel_semifinal_registration() to authenticated;
grant execute on function public.set_semifinal_eligibility(uuid, text, text, text) to authenticated;
grant execute on function public.admin_cancel_semifinal_registration(uuid) to authenticated;

commit;
