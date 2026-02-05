-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Fix: JOIN-Problem beheben - Punkte werden nicht gefunden

-- Zuerst: Prüfe, warum der JOIN fehlschlägt
-- Diese Abfrage zeigt, ob die Punkte-Berechnung funktioniert
SELECT 
  r.profile_id,
  p.first_name || ' ' || p.last_name as name,
  rt.discipline,
  COUNT(*) as result_count,
  SUM(coalesce(r.points, 0)) as sum_points,
  SUM(CASE WHEN r.flash THEN 1 ELSE 0 END) as flash_count,
  SUM(coalesce(r.points, 0)) + SUM(CASE WHEN r.flash THEN 1 ELSE 0 END) as total_points,
  MIN(r.created_at) as earliest_result,
  MAX(r.created_at) as latest_result
FROM public.results r
JOIN public.routes rt ON rt.id = r.route_id
JOIN public.profiles p ON p.id = r.profile_id
WHERE rt.discipline = 'toprope'
  AND LOWER(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) LIKE '%janosch%test%'
GROUP BY r.profile_id, p.first_name, p.last_name, rt.discipline;

-- Prüfe die Datumsfilterung
SELECT 
  qualification_start,
  qualification_end,
  CASE 
    WHEN qualification_start IS NULL OR qualification_end IS NULL THEN 'Keine Datumsfilterung'
    ELSE 'Datumsfilterung aktiv: ' || qualification_start::text || ' bis ' || qualification_end::text
  END as filter_status
FROM public.admin_settings
LIMIT 1;

-- Jetzt: Fixierte Funktion ohne restriktive Filter
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

  -- Fallback für cutoff
  if v_cutoff is null then
    v_cutoff := coalesce(v_start, current_date)::date;
  end if;
  
  return query
  with
  -- Points per profile - ENTFERNT restriktive Filter
  points_per_profile as (
    select
      r.profile_id,
      coalesce(sum(coalesce(r.points, 0)::bigint), 0)::bigint + 
      coalesce(sum(case when r.flash then 1 else 0 end)::bigint, 0)::bigint as total
    from public.results r
    inner join public.routes rt on rt.id = r.route_id
    where rt.discipline = p_league
      -- Nur filtern wenn v_start und v_end gesetzt sind
      and (v_start is null or v_end is null or (r.created_at::date >= v_start and r.created_at::date <= v_end))
      -- ENTFERNT: and (coalesce(r.points, 0) > 0 or r.flash = true)
      -- Alle Ergebnisse zählen, auch wenn points = 0
    group by r.profile_id
  ),
  -- Profile + computed class
  profile_class as (
    select
      p.id,
      trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
      case
        when p.gender is null or p.birth_date is null then null
        when extract(year from age(v_cutoff, p.birth_date::date))::int <= v_u16_max then 'u16-' || lower(p.gender)
        when extract(year from age(v_cutoff, p.birth_date::date))::int < v_u40_min then 'ue16-' || lower(p.gender)
        else 'ue40-' || lower(p.gender)
      end as computed_class
    from public.profiles p
    where (p.role is null or p.role not in ('gym_admin', 'league_admin'))
      and p.league = p_league
      and p.gender is not null
      and p.birth_date is not null
  )
  select
    (row_number() over (order by coalesce(pp.total, 0) desc nulls last))::int as rank,
    coalesce(nullif(trim(pc.name), ''), 'Unbekannt') as display_name,
    coalesce(pp.total, 0)::bigint as points
  from profile_class pc
  left join points_per_profile pp on pp.profile_id = pc.id
  where pc.computed_class = lower(p_class)
  order by coalesce(pp.total, 0) desc nulls last
  limit 50;
end;
$$;

-- Teste die Funktion
SELECT * FROM public.get_public_rankings('toprope', 'ue16-m');

-- Prüfe spezifisch für janosch test
SELECT 
  rank,
  display_name,
  points
FROM public.get_public_rankings('toprope', 'ue16-m')
WHERE display_name LIKE '%janosch%';
