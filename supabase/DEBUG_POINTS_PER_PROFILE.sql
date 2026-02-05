-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Debug: Warum findet points_per_profile keine Daten?

-- Schritt 1: Prüfe alle Variablen aus admin_settings
SELECT 
  qualification_start,
  qualification_end,
  age_cutoff_date,
  age_u16_max,
  age_u40_min,
  CASE 
    WHEN qualification_start IS NULL OR qualification_end IS NULL THEN 'Keine Datumsfilterung'
    ELSE 'Datumsfilterung: ' || qualification_start::text || ' bis ' || qualification_end::text
  END as filter_info
FROM public.admin_settings
LIMIT 1;

-- Schritt 2: Simuliere points_per_profile genau wie in der Funktion
-- (mit den tatsächlichen Variablen)
WITH admin_vars AS (
  SELECT
    coalesce(age_cutoff_date, qualification_start::date) as v_cutoff,
    coalesce(age_u16_max, 15) as v_u16_max,
    coalesce(age_u40_min, 40) as v_u40_min,
    qualification_start::date as v_start,
    qualification_end::date as v_end
  FROM public.admin_settings
  LIMIT 1
),
points_per_profile AS (
  SELECT
    r.profile_id,
    p.first_name || ' ' || p.last_name as name,
    rt.discipline,
    COUNT(*) as result_count,
    SUM(coalesce(r.points, 0)) as sum_points,
    SUM(CASE WHEN r.flash THEN 1 ELSE 0 END) as flash_count,
    coalesce(sum(coalesce(r.points, 0)::bigint), 0)::bigint + 
    coalesce(sum(case when r.flash then 1 else 0 end)::bigint, 0)::bigint as total,
    MIN(r.created_at) as earliest,
    MAX(r.created_at) as latest,
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
  INNER JOIN public.routes rt ON rt.id = r.route_id
  CROSS JOIN admin_vars av
  JOIN public.profiles p ON p.id = r.profile_id
  WHERE rt.discipline = 'toprope'
    AND LOWER(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) LIKE '%janosch%test%'
  GROUP BY r.profile_id, p.first_name, p.last_name, rt.discipline, av.v_start, av.v_end
)
SELECT 
  *,
  CASE 
    WHEN v_start IS NULL OR v_end IS NULL THEN 'Keine Datumsfilterung'
    WHEN results_in_period > 0 THEN 'Innerhalb des Zeitraums (' || results_in_period || ' Ergebnisse)'
    WHEN results_outside_period > 0 THEN 'Außerhalb des Zeitraums (' || results_outside_period || ' Ergebnisse)'
    ELSE 'Keine Ergebnisse'
  END as date_status
FROM points_per_profile;

-- Schritt 3: Prüfe alle Ergebnisse für janosch test mit Datumsinfo
SELECT 
  r.id,
  r.profile_id,
  r.route_id,
  r.points,
  r.flash,
  r.created_at,
  r.created_at::date as created_date,
  rt.discipline,
  (SELECT qualification_start FROM public.admin_settings LIMIT 1) as qual_start,
  (SELECT qualification_end FROM public.admin_settings LIMIT 1) as qual_end,
  CASE 
    WHEN (SELECT qualification_start FROM public.admin_settings LIMIT 1) IS NULL 
      OR (SELECT qualification_end FROM public.admin_settings LIMIT 1) IS NULL 
    THEN 'Keine Filterung'
    WHEN r.created_at::date >= (SELECT qualification_start FROM public.admin_settings LIMIT 1)
      AND r.created_at::date <= (SELECT qualification_end FROM public.admin_settings LIMIT 1)
    THEN 'Innerhalb'
    ELSE 'Außerhalb'
  END as filter_status
FROM public.results r
JOIN public.routes rt ON rt.id = r.route_id
JOIN public.profiles p ON p.id = r.profile_id
WHERE rt.discipline = 'toprope'
  AND LOWER(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) LIKE '%janosch%test%'
ORDER BY r.created_at DESC;
