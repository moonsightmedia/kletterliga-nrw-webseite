begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Publishing is separate from closing score entry. A repeat publication replaces
-- the entire reviewed snapshot after a correction.
create table public.certificate_publications (
  season_year text primary key,
  published_at timestamptz not null default statement_timestamp(),
  published_by uuid not null references public.profiles(id),
  revision integer not null default 1
);

create table public.finale_certificates (
  season_year text not null references public.certificate_publications(season_year) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  league text not null check (league in ('lead', 'toprope')),
  class_label text not null,
  rank integer not null check (rank > 0),
  primary key (season_year, profile_id)
);

alter table public.certificate_publications enable row level security;
alter table public.finale_certificates enable row level security;
revoke all on public.certificate_publications, public.finale_certificates from public, anon, authenticated;

create or replace function public.get_my_certificates(p_season text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_settings public.admin_settings;
  v_qualification jsonb;
  v_finale jsonb;
  v_published_at timestamptz;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  select * into v_settings from public.admin_settings
    where season_year = p_season order by updated_at desc nulls last, id desc limit 1;
  if v_settings.id is null then return jsonb_build_object('qualification', null, 'finale', null, 'finale_published_at', null); end if;

  -- Same class, season window and scoring as the participant profile. Ranking
  -- includes all activated participants; only actual climbers receive a document.
  with participants as (
    select p.id, trim(concat_ws(' ', p.first_name, p.last_name)) as display_name,
      case when p.league = 'vorstieg' then 'lead' else p.league end as league,
      case
        when extract(year from age(coalesce(v_settings.age_cutoff_date, v_settings.qualification_start), p.birth_date))::int <= coalesce(v_settings.age_u16_max, 14) then 'U15-'
        when extract(year from age(coalesce(v_settings.age_cutoff_date, v_settings.qualification_start), p.birth_date))::int < coalesce(v_settings.age_u40_min, 40) then 'Ü15-'
        else 'Ü40-'
      end || p.gender as class_label
    from public.profiles p
    where p.role = 'participant' and p.participation_activated_at is not null
      and p.archived_at is null and p.birth_date is not null and p.gender in ('m','w')
      and p.league in ('lead','toprope','vorstieg')
  ), scores as (
    select r.profile_id, case when rt.discipline = 'vorstieg' then 'lead' else rt.discipline end as league,
      sum(coalesce(r.points, 0)::numeric + case when r.flash then 1 else 0 end) as points,
      count(*) as result_count
    from public.results r
    join public.routes rt on rt.id = r.route_id
    join public.gyms g on g.id = rt.gym_id
    where g.archived_at is null and r.created_at::date between v_settings.qualification_start and v_settings.qualification_end
    group by r.profile_id, case when rt.discipline = 'vorstieg' then 'lead' else rt.discipline end
  ), ranked as (
    select p.*, coalesce(s.points, 0) as points, coalesce(s.result_count, 0) as result_count,
      rank() over (partition by p.league, p.class_label order by coalesce(s.points, 0) desc) as place
    from participants p left join scores s on s.profile_id = p.id and s.league = p.league
  )
  select jsonb_build_object('phase', 'qualification', 'season_year', p_season,
    'display_name', display_name, 'league', league, 'class_label', class_label,
    'rank', place, 'issued_at', v_settings.qualification_end)
    into v_qualification from ranked where id = auth.uid() and result_count > 0
      and statement_timestamp() >= ((v_settings.qualification_end + 1)::timestamp at time zone 'Europe/Berlin');

  select published_at into v_published_at from public.certificate_publications where season_year = p_season;
  select jsonb_build_object('phase', 'finale', 'season_year', c.season_year,
    'display_name', c.display_name, 'league', c.league, 'class_label', c.class_label,
    'rank', c.rank, 'issued_at', v_published_at)
    into v_finale from public.finale_certificates c
    where c.season_year = p_season and c.profile_id = auth.uid();

  return jsonb_build_object('qualification', v_qualification, 'finale', v_finale,
    'finale_published_at', v_published_at);
end;
$$;

create or replace function public.get_certificate_publication(p_season text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_publication public.certificate_publications; v_count integer; v_needs_refresh boolean := false;
begin
  if not public.is_league_admin() then raise exception using errcode = '42501', message = 'LEAGUE_ADMIN_REQUIRED'; end if;
  select * into v_publication from public.certificate_publications where season_year = p_season;
  select count(*) into v_count from public.finale_certificates where season_year = p_season;
  if v_publication.published_at is not null then
    select exists(
      select 1 from public.competition_day_results r
      join public.competition_day_events e on e.id = r.event_id
      where e.season_year = p_season and r.created_at > v_publication.published_at
    ) or exists(
      select 1 from public.competition_day_result_audit a
      join public.competition_day_results r on r.id = a.result_id
      join public.competition_day_events e on e.id = r.event_id
      where e.season_year = p_season and a.created_at > v_publication.published_at
    ) into v_needs_refresh;
  end if;
  return jsonb_build_object('published_at', v_publication.published_at,
    'revision', v_publication.revision, 'certificate_count', v_count,
    'needs_refresh', v_needs_refresh);
end;
$$;

create or replace function public.publish_finale_certificates(p_season text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_date date; v_count integer;
begin
  if not public.is_league_admin() then raise exception using errcode = '42501', message = 'LEAGUE_ADMIN_REQUIRED'; end if;
  select * into v_event from public.competition_day_events where season_year = p_season for update;
  select finale_date into v_date from public.admin_settings where season_year = p_season
    order by updated_at desc nulls last, id desc limit 1;
  if v_event.id is null or v_event.phase <> 'closed' or v_date is null or
     statement_timestamp() < (v_date::timestamp at time zone 'Europe/Berlin') then
    raise exception using errcode = '23514', message = 'FINALE_NOT_READY';
  end if;

  insert into public.certificate_publications(season_year, published_by)
    values(p_season, auth.uid())
    on conflict(season_year) do update set published_at = statement_timestamp(),
      published_by = auth.uid(), revision = public.certificate_publications.revision + 1;
  delete from public.finale_certificates where season_year = p_season;

  insert into public.finale_certificates(season_year, profile_id, display_name, league, class_label, rank)
  with scored as (
    select e.profile_id, trim(concat_ws(' ', p.first_name, p.last_name)) as display_name,
      e.league, e.class_label, sum(r.points) as points, count(distinct r.route_id) as result_count
    from public.semifinal_eligibility e
    join public.profiles p on p.id = e.profile_id
    join public.finale_registrations f on f.profile_id = e.profile_id and f.season_year = e.season_year
      and f.registration_status = 'registered'
    left join public.competition_day_results r on r.event_id = v_event.id and r.profile_id = e.profile_id
    where e.season_year = p_season and e.status = 'eligible'
      and p.role = 'participant' and p.participation_activated_at is not null and p.archived_at is null
    group by e.profile_id, p.first_name, p.last_name, e.league, e.class_label
  ), ranked as (
    select *, rank() over(partition by league, class_label order by coalesce(points, 0) desc) as place
    from scored
  )
  select p_season, profile_id, display_name, league, class_label, place
    from ranked where result_count > 0;
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception using errcode = '23514', message = 'FINALE_NO_RESULTS'; end if;
  return public.get_certificate_publication(p_season);
end;
$$;

revoke all on function public.get_my_certificates(text), public.get_certificate_publication(text),
  public.publish_finale_certificates(text) from public, anon;
grant execute on function public.get_my_certificates(text), public.get_certificate_publication(text),
  public.publish_finale_certificates(text) to authenticated;

-- Keep the public qualification list's placement rule aligned with the
-- participant profile and the certificate. Equal scores share a place.
create or replace function public.get_public_rankings(p_league text, p_class text)
returns table(rank int, display_name text, points numeric)
language plpgsql security definer set search_path = public
as $$
declare v_cutoff date; v_u15_max int; v_u40_min int; v_start date; v_end date;
begin
  select coalesce(age_cutoff_date, qualification_start), coalesce(age_u16_max, 14),
    coalesce(age_u40_min, 40), qualification_start, qualification_end
    into v_cutoff, v_u15_max, v_u40_min, v_start, v_end
    from public.admin_settings order by updated_at desc nulls last, id desc limit 1;
  if v_start is null or v_end is null then return; end if;
  return query with points_per_profile as (
    select r.profile_id,
      sum(coalesce(r.points, 0)::numeric + case when r.flash then 1 else 0 end) as total
    from public.results r join public.routes rt on rt.id = r.route_id
      join public.gyms g on g.id = rt.gym_id
    where (rt.discipline = p_league or (p_league = 'lead' and rt.discipline = 'vorstieg'))
      and g.archived_at is null
      and r.created_at::date between v_start and v_end
    group by r.profile_id
  ), participants as (
    select p.id, trim(concat_ws(' ', p.first_name, p.last_name)) as name,
      case
        when extract(year from age(v_cutoff, p.birth_date))::int <= v_u15_max then 'u15-'
        when extract(year from age(v_cutoff, p.birth_date))::int < v_u40_min then 'ue15-'
        else 'ue40-'
      end || p.gender as class_label
    from public.profiles p
    where p.role = 'participant' and (p.league = p_league or (p_league = 'lead' and p.league = 'vorstieg'))
      and p.participation_activated_at is not null and p.archived_at is null
      and p.birth_date is not null and p.gender in ('m','w')
  ), ranked as (
    select p.name, coalesce(pp.total, 0) as total,
      rank() over(order by coalesce(pp.total, 0) desc)::int as place
    from participants p left join points_per_profile pp on pp.profile_id = p.id
    where p.class_label = p_class
  )
  select ranked.place, coalesce(nullif(ranked.name, ''), 'Unbekannt'), ranked.total
    from ranked order by ranked.total desc, ranked.name limit 50;
end;
$$;
commit;
