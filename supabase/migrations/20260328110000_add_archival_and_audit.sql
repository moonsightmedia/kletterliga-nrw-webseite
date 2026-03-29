alter table public.profiles
  add column if not exists archived_at timestamp with time zone,
  add column if not exists archived_by uuid references auth.users(id),
  add column if not exists archive_reason text;

alter table public.gyms
  add column if not exists archived_at timestamp with time zone,
  add column if not exists archived_by uuid references auth.users(id),
  add column if not exists archive_reason text;

create table if not exists public.data_change_audit (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('profile', 'result', 'gym')),
  entity_id uuid not null,
  action text not null check (action in ('insert', 'update', 'archive', 'restore')),
  actor_user_id uuid references auth.users(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamp with time zone not null default now()
);

alter table public.data_change_audit enable row level security;

drop policy if exists "Audit read league admin" on public.data_change_audit;
create policy "Audit read league admin" on public.data_change_audit
  for select using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'league_admin');

create or replace function public.write_data_change_audit(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_before_data jsonb,
  p_after_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.data_change_audit (
    entity_type,
    entity_id,
    action,
    actor_user_id,
    before_data,
    after_data
  )
  values (
    p_entity_type,
    p_entity_id,
    p_action,
    auth.uid(),
    p_before_data,
    p_after_data
  );
end;
$$;

create or replace function public.audit_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := 'update';
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.archived_at is null and new.archived_at is not null then
    v_action := 'archive';
  elsif old.archived_at is not null and new.archived_at is null then
    v_action := 'restore';
  elsif old is not distinct from new then
    return new;
  end if;

  perform public.write_data_change_audit(
    'profile',
    new.id,
    v_action,
    to_jsonb(old),
    to_jsonb(new)
  );

  return new;
end;
$$;

create or replace function public.audit_result_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := case when tg_op = 'INSERT' then 'insert' else 'update' end;
begin
  perform public.write_data_change_audit(
    'result',
    coalesce(new.id, old.id),
    v_action,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new)
  );

  return new;
end;
$$;

create or replace function public.audit_gym_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := 'update';
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.archived_at is null and new.archived_at is not null then
    v_action := 'archive';
  elsif old.archived_at is not null and new.archived_at is null then
    v_action := 'restore';
  elsif old is not distinct from new then
    return new;
  end if;

  perform public.write_data_change_audit(
    'gym',
    new.id,
    v_action,
    to_jsonb(old),
    to_jsonb(new)
  );

  return new;
end;
$$;

drop trigger if exists audit_profile_changes_trigger on public.profiles;
create trigger audit_profile_changes_trigger
  after update on public.profiles
  for each row
  execute function public.audit_profile_changes();

drop trigger if exists audit_result_changes_insert_trigger on public.results;
create trigger audit_result_changes_insert_trigger
  after insert on public.results
  for each row
  execute function public.audit_result_changes();

drop trigger if exists audit_result_changes_update_trigger on public.results;
create trigger audit_result_changes_update_trigger
  after update on public.results
  for each row
  execute function public.audit_result_changes();

drop trigger if exists audit_gym_changes_trigger on public.gyms;
create trigger audit_gym_changes_trigger
  after update on public.gyms
  for each row
  execute function public.audit_gym_changes();

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
  if (auth.jwt() -> 'user_metadata' ->> 'role') <> 'league_admin' then
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
  if (auth.jwt() -> 'user_metadata' ->> 'role') <> 'league_admin' then
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
  if (auth.jwt() -> 'user_metadata' ->> 'role') <> 'league_admin' then
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
  if (auth.jwt() -> 'user_metadata' ->> 'role') <> 'league_admin' then
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

grant execute on function public.archive_profile(uuid, text) to authenticated;
grant execute on function public.restore_profile(uuid) to authenticated;
grant execute on function public.archive_gym(uuid, text) to authenticated;
grant execute on function public.restore_gym(uuid) to authenticated;

create or replace function public.get_public_rankings(
  p_league text,
  p_class text
)
returns table (
  rank int,
  display_name text,
  points bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff date;
  v_u15_max int := 14;
  v_u40_min int := 40;
  v_start date;
  v_end date;
begin
  select
    coalesce(age_cutoff_date, qualification_start::date),
    coalesce(age_u16_max, 14),
    coalesce(age_u40_min, 40),
    qualification_start::date,
    qualification_end::date
  into v_cutoff, v_u15_max, v_u40_min, v_start, v_end
  from public.admin_settings
  limit 1;

  if v_cutoff is null then
    v_cutoff := coalesce(v_start, current_date)::date;
  end if;
  if v_start is null or v_end is null then
    return;
  end if;

  return query
  with
  points_per_profile as (
    select
      r.profile_id,
      coalesce(sum(coalesce(r.points, 0)::bigint), 0) + coalesce(sum(case when r.flash then 1 else 0 end)::bigint, 0) as total
    from public.results r
    join public.routes rt on rt.id = r.route_id
    join public.gyms g on g.id = rt.gym_id
    where rt.discipline = p_league
      and g.archived_at is null
      and r.created_at::date >= v_start
      and r.created_at::date <= v_end
    group by r.profile_id
  ),
  profile_class as (
    select
      p.id,
      trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
      case
        when p.gender is null then null
        when extract(year from age(v_cutoff, p.birth_date::date))::int <= v_u15_max then 'u15-' || p.gender
        when extract(year from age(v_cutoff, p.birth_date::date))::int < v_u40_min then 'ue15-' || p.gender
        else 'ue40-' || p.gender
      end as computed_class
    from public.profiles p
    where (p.role is null or p.role not in ('gym_admin', 'league_admin'))
      and p.league = p_league
      and p.participation_activated_at is not null
      and p.archived_at is null
  )
  select
    (row_number() over (order by coalesce(pp.total, 0) desc nulls last))::int as rank,
    coalesce(nullif(trim(pc.name), ''), 'Unbekannt') as display_name,
    coalesce(pp.total, 0)::bigint as points
  from profile_class pc
  left join points_per_profile pp on pp.profile_id = pc.id
  where pc.computed_class = p_class
  order by coalesce(pp.total, 0) desc nulls last
  limit 50;
end;
$$;
