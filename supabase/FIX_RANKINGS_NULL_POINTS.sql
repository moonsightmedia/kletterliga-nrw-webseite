-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Fix für das Problem: Alle Teilnehmer haben null Punkte in der Rangliste

-- 1. Aktualisiere die get_public_rankings Funktion
--    Problem: Wenn qualification_start/end nicht gesetzt sind oder Ergebnisse außerhalb liegen,
--    werden keine Punkte gezählt.
--    Lösung: Wenn qualification_start/end nicht gesetzt sind, alle Ergebnisse berücksichtigen.

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
  
  -- WICHTIG: Wenn qualification_start/end nicht gesetzt sind, verwende alle Ergebnisse
  -- (keine Datumsfilterung)
  
  return query
  with
  -- Points per profile in this league (mit optionaler Datumsfilterung)
  points_per_profile as (
    select
      r.profile_id,
      coalesce(sum(coalesce(r.points, 0)::bigint), 0) + coalesce(sum(case when r.flash then 1 else 0 end)::bigint, 0) as total
    from public.results r
    join public.routes rt on rt.id = r.route_id
    where rt.discipline = p_league
      -- WICHTIG: Nur filtern wenn v_start und v_end gesetzt sind
      and (v_start is null or v_end is null or (r.created_at::date >= v_start and r.created_at::date <= v_end))
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

-- 2. Debug-Abfrage: Prüfe, ob es Ergebnisse mit Punkten gibt
--    Führe diese Abfrage aus, um zu sehen, ob es Ergebnisse gibt:
SELECT 
  COUNT(*) as total_results,
  COUNT(CASE WHEN points IS NOT NULL AND points > 0 THEN 1 END) as results_with_points,
  COUNT(CASE WHEN points IS NULL THEN 1 END) as results_null_points,
  COUNT(CASE WHEN flash = true THEN 1 END) as flash_results,
  MIN(created_at) as earliest_result,
  MAX(created_at) as latest_result
FROM public.results;

-- 3. Debug-Abfrage: Prüfe die admin_settings
SELECT 
  qualification_start,
  qualification_end,
  age_cutoff_date,
  age_u16_max,
  age_u40_min
FROM public.admin_settings
LIMIT 1;

-- 4. Debug-Abfrage: Teste die Funktion direkt
--    Ersetze 'toprope' und 'ue16-m' mit den gewünschten Werten
SELECT * FROM public.get_public_rankings('toprope', 'ue16-m');

-- 5. Prüfe, ob Ergebnisse außerhalb des Qualifikationszeitraums liegen
SELECT 
  COUNT(*) as results_outside_period,
  MIN(created_at) as earliest_outside,
  MAX(created_at) as latest_outside
FROM public.results r
JOIN public.routes rt ON rt.id = r.route_id
WHERE rt.discipline = 'toprope'
  AND EXISTS (
    SELECT 1 FROM public.admin_settings 
    WHERE qualification_start IS NOT NULL 
      AND qualification_end IS NOT NULL
      AND (r.created_at::date < qualification_start OR r.created_at::date > qualification_end)
  );
