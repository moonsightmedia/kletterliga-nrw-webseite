-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Fix für das Problem: Punkte werden nicht in der Rangliste angezeigt

-- 1. Aktualisiere die get_public_rankings Funktion
--    Problem: Die Funktion gibt nichts zurück, wenn qualification_start/end nicht gesetzt sind
--    Lösung: Wenn qualification_start/end nicht gesetzt sind, alle Ergebnisse berücksichtigen

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
  -- (keine Datumsfilterung - entfernt die frühere "return;" Logik)
  
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

-- 4. Teste die Funktion direkt
SELECT * FROM public.get_public_rankings('toprope', 'ue16-m');

-- 5. DEBUG: Prüfe, ob Ergebnisse für "janosch test" existieren
SELECT 
  r.id,
  r.profile_id,
  r.route_id,
  r.points,
  r.flash,
  r.created_at,
  rt.discipline,
  rt.gym_id,
  p.first_name || ' ' || p.last_name as profile_name
FROM public.results r
JOIN public.routes rt ON rt.id = r.route_id
JOIN public.profiles p ON p.id = r.profile_id
WHERE LOWER(trim(p.first_name || ' ' || p.last_name)) LIKE '%janosch%test%'
ORDER BY r.created_at DESC
LIMIT 20;

-- 6. DEBUG: Prüfe alle Ergebnisse mit Punkten
SELECT 
  COUNT(*) as total_results,
  COUNT(CASE WHEN r.points IS NOT NULL AND r.points > 0 THEN 1 END) as results_with_points,
  COUNT(CASE WHEN r.points = 0 THEN 1 END) as results_zero_points,
  COUNT(CASE WHEN r.points IS NULL THEN 1 END) as results_null_points,
  SUM(r.points) as total_points_sum,
  SUM(CASE WHEN r.flash THEN 1 ELSE 0 END) as flash_count
FROM public.results r
JOIN public.routes rt ON rt.id = r.route_id
WHERE rt.discipline = 'toprope';

-- 7. DEBUG: Prüfe, ob Ergebnisse mit Routen verknüpft sind
SELECT 
  rt.discipline,
  COUNT(DISTINCT r.id) as result_count,
  COUNT(DISTINCT r.profile_id) as unique_profiles,
  SUM(r.points) as total_points
FROM public.results r
JOIN public.routes rt ON rt.id = r.route_id
GROUP BY rt.discipline;

-- 8. DEBUG: Prüfe Profile-Klassifizierung und League-Zuordnung
--    Dies zeigt, welche Klasse für jedes Profil berechnet wird
WITH profile_class_check AS (
  SELECT
    p.id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
    p.league,
    p.gender,
    p.birth_date,
    p.role,
    CASE
      WHEN p.gender IS NULL THEN NULL
      WHEN extract(year from age(coalesce((SELECT age_cutoff_date FROM public.admin_settings LIMIT 1), current_date), p.birth_date::date))::int <= 15 THEN 'u16-' || p.gender
      WHEN extract(year from age(coalesce((SELECT age_cutoff_date FROM public.admin_settings LIMIT 1), current_date), p.birth_date::date))::int < 40 THEN 'ue16-' || p.gender
      ELSE 'ue40-' || p.gender
    END as computed_class,
    (SELECT COUNT(*) FROM public.results r 
     JOIN public.routes rt ON rt.id = r.route_id 
     WHERE r.profile_id = p.id AND rt.discipline = 'toprope') as toprope_results,
    (SELECT SUM(r.points) + SUM(CASE WHEN r.flash THEN 1 ELSE 0 END)
     FROM public.results r 
     JOIN public.routes rt ON rt.id = r.route_id 
     WHERE r.profile_id = p.id AND rt.discipline = 'toprope') as toprope_points
  FROM public.profiles p
  WHERE p.role IS NULL OR p.role NOT IN ('gym_admin', 'league_admin')
)
SELECT 
  name,
  league,
  gender,
  birth_date,
  role,
  computed_class,
  toprope_results,
  toprope_points
FROM profile_class_check
WHERE toprope_results > 0
ORDER BY toprope_points DESC NULLS LAST;

-- 9. DEBUG: Teste die Funktion mit verschiedenen Klassen
--    Prüfe, welche Klasse "janosch test" haben sollte
SELECT * FROM public.get_public_rankings('toprope', 'ue16-m');
SELECT * FROM public.get_public_rankings('toprope', 'ue16-w');
SELECT * FROM public.get_public_rankings('toprope', 'u16-m');
SELECT * FROM public.get_public_rankings('toprope', 'u16-w');
SELECT * FROM public.get_public_rankings('toprope', 'ue40-m');
SELECT * FROM public.get_public_rankings('toprope', 'ue40-w');
