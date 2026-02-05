-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Debug: Alle Daten für Teilnehmer junebaum@web.de

-- 1. Profil-Daten
SELECT 
  id,
  email,
  first_name,
  last_name,
  trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) as display_name,
  league,
  gender,
  birth_date,
  role,
  created_at
FROM public.profiles
WHERE email = 'junebaum@web.de';

-- 2. Alle Ergebnisse für diesen Teilnehmer
SELECT 
  r.id as result_id,
  r.profile_id,
  r.route_id,
  r.points,
  r.flash,
  r.status,
  r.created_at,
  r.created_at::date as created_date,
  rt.id as route_id_check,
  rt.discipline,
  rt.gym_id,
  rt.code as route_code,
  rt.name as route_name,
  g.name as gym_name
FROM public.results r
LEFT JOIN public.routes rt ON rt.id = r.route_id
LEFT JOIN public.gyms g ON g.id = rt.gym_id
WHERE r.profile_id IN (SELECT id FROM public.profiles WHERE email = 'junebaum@web.de')
ORDER BY r.created_at DESC;

-- 3. Berechnete Klasse für diesen Teilnehmer
WITH admin_vars AS (
  SELECT
    coalesce(age_cutoff_date, qualification_start::date) as v_cutoff,
    coalesce(age_u16_max, 15) as v_u16_max,
    coalesce(age_u40_min, 40) as v_u40_min,
    qualification_start::date as v_start,
    qualification_end::date as v_end
  FROM public.admin_settings
  LIMIT 1
)
SELECT 
  p.id,
  p.email,
  trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
  p.league,
  p.gender,
  p.birth_date,
  av.v_cutoff as cutoff_date,
  extract(year from age(av.v_cutoff, p.birth_date::date))::int as age,
  av.v_u16_max as u16_max,
  av.v_u40_min as u40_min,
  CASE
    WHEN p.gender IS NULL OR p.birth_date IS NULL THEN NULL
    WHEN extract(year from age(av.v_cutoff, p.birth_date::date))::int <= av.v_u16_max THEN 'u16-' || lower(p.gender)
    WHEN extract(year from age(av.v_cutoff, p.birth_date::date))::int < av.v_u40_min THEN 'ue16-' || lower(p.gender)
    ELSE 'ue40-' || lower(p.gender)
  END as computed_class,
  av.v_start as qual_start,
  av.v_end as qual_end
FROM public.profiles p
CROSS JOIN admin_vars av
WHERE p.email = 'junebaum@web.de';

-- 4. Punkte-Berechnung für diesen Teilnehmer
WITH admin_vars AS (
  SELECT
    qualification_start::date as v_start,
    qualification_end::date as v_end
  FROM public.admin_settings
  LIMIT 1
),
points_calculation AS (
  SELECT
    r.profile_id,
    rt.discipline,
    COUNT(*) as result_count,
    SUM(coalesce(r.points, 0)) as sum_points,
    SUM(CASE WHEN r.flash THEN 1 ELSE 0 END) as flash_count,
    SUM(coalesce(r.points, 0)) + SUM(CASE WHEN r.flash THEN 1 ELSE 0 END) as total_points,
    MIN(r.created_at) as earliest_result,
    MAX(r.created_at) as latest_result,
    av.v_start,
    av.v_end,
    COUNT(CASE 
      WHEN av.v_start IS NULL OR av.v_end IS NULL THEN 1
      WHEN r.created_at::date >= av.v_start AND r.created_at::date <= av.v_end THEN 1
      ELSE NULL
    END) as results_in_period,
    COUNT(CASE 
      WHEN av.v_start IS NOT NULL AND av.v_end IS NOT NULL 
        AND (r.created_at::date < av.v_start OR r.created_at::date > av.v_end) THEN 1
      ELSE NULL
    END) as results_outside_period
  FROM public.results r
  JOIN public.routes rt ON rt.id = r.route_id
  CROSS JOIN admin_vars av
  WHERE r.profile_id IN (SELECT id FROM public.profiles WHERE email = 'junebaum@web.de')
  GROUP BY r.profile_id, rt.discipline, av.v_start, av.v_end
)
SELECT 
  pc.*,
  p.email,
  trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
  CASE 
    WHEN pc.v_start IS NULL OR pc.v_end IS NULL THEN 'Keine Datumsfilterung'
    WHEN pc.results_in_period > 0 THEN 'Innerhalb des Zeitraums (' || pc.results_in_period || ' Ergebnisse)'
    WHEN pc.results_outside_period > 0 THEN 'Außerhalb des Zeitraums (' || pc.results_outside_period || ' Ergebnisse)'
    ELSE 'Keine Ergebnisse'
  END as filter_status
FROM points_calculation pc
JOIN public.profiles p ON p.id = pc.profile_id;

-- 5. Teste die get_public_rankings Funktion für alle Klassen
SELECT 'ue16-m' as klasse, * FROM public.get_public_rankings('toprope', 'ue16-m')
WHERE display_name LIKE '%junebaum%' OR display_name LIKE '%june%'
UNION ALL
SELECT 'ue16-w', * FROM public.get_public_rankings('toprope', 'ue16-w')
WHERE display_name LIKE '%junebaum%' OR display_name LIKE '%june%'
UNION ALL
SELECT 'u16-m', * FROM public.get_public_rankings('toprope', 'u16-m')
WHERE display_name LIKE '%junebaum%' OR display_name LIKE '%june%'
UNION ALL
SELECT 'u16-w', * FROM public.get_public_rankings('toprope', 'u16-w')
WHERE display_name LIKE '%junebaum%' OR display_name LIKE '%june%'
UNION ALL
SELECT 'ue40-m', * FROM public.get_public_rankings('toprope', 'ue40-m')
WHERE display_name LIKE '%junebaum%' OR display_name LIKE '%june%'
UNION ALL
SELECT 'ue40-w', * FROM public.get_public_rankings('toprope', 'ue40-w')
WHERE display_name LIKE '%junebaum%' OR display_name LIKE '%june%'
ORDER BY klasse, rank;

-- 6. Prüfe auch für Lead/Vorstieg
SELECT 'lead-ue16-m' as klasse, * FROM public.get_public_rankings('lead', 'ue16-m')
WHERE display_name LIKE '%junebaum%' OR display_name LIKE '%june%'
UNION ALL
SELECT 'lead-ue16-w', * FROM public.get_public_rankings('lead', 'ue16-w')
WHERE display_name LIKE '%junebaum%' OR display_name LIKE '%june%';
