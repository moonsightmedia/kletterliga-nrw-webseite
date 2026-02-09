-- Ranglisten: nur Teilnehmer mit aktivierter Teilnahme (Mastercode eingelöst)

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
    where rt.discipline = p_league
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
