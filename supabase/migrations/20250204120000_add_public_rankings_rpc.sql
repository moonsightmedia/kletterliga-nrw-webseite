-- Public rankings: RPC callable by anon, returns top N per league/class for website preview
create or replace function public.get_public_rankings(
  p_league text,  -- 'toprope' or 'lead'
  p_class text   -- 'u16-w', 'u16-m', 'ue16-w', 'ue16-m', 'ue40-w', 'ue40-m'
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
  v_u16_max int := 15;
  v_u40_min int := 40;
  v_start date;
  v_end date;
begin
  -- Load season settings (single row)
  select
    coalesce(age_cutoff_date, qualification_start::date),
    coalesce(age_u16_max, 15),
    coalesce(age_u40_min, 40),
    qualification_start::date,
    qualification_end::date
  into v_cutoff, v_u16_max, v_u40_min, v_start, v_end
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
  -- Points per profile in this league within qualification period
  points_per_profile as (
    select
      r.profile_id,
      sum(r.points::bigint) + sum(case when r.flash then 1 else 0 end)::bigint as total
    from public.results r
    join public.routes rt on rt.id = r.route_id
    where rt.discipline = p_league
      and r.created_at::date >= v_start
      and r.created_at::date <= v_end
    group by r.profile_id
  ),
  -- Profile + computed class (same logic as seasonSettings.getClassName)
  profile_class as (
    select
      p.id,
      trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
      case
        when p.gender is null then null
        when extract(year from age(v_cutoff, p.birth_date::date))::int <= v_u16_max then 'u16-' || p.gender
        when extract(year from age(v_cutoff, p.birth_date::date))::int < v_u40_min then 'ue16-' || p.gender
        else 'ue40-' || p.gender
      end as computed_class
    from public.profiles p
    where (p.role is null or p.role not in ('gym_admin', 'league_admin'))
      and p.league = p_league
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

comment on function public.get_public_rankings(text, text) is
  'Returns top 50 ranking rows for public website by league and class. Callable by anon.';

-- Only service role (Edge Function) and authenticated may call; anon uses Edge Function
grant execute on function public.get_public_rankings(text, text) to authenticated;
grant execute on function public.get_public_rankings(text, text) to service_role;
