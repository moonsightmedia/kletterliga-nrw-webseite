-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Schritt-für-Schritt Debug: Warum werden keine Punkte angezeigt?

-- Schritt 1: Prüfe die Punkte-Berechnung direkt
WITH points_check AS (
  SELECT
    r.profile_id,
    p.first_name || ' ' || p.last_name as name,
    COUNT(*) as result_count,
    SUM(coalesce(r.points, 0)) as sum_points,
    SUM(CASE WHEN r.flash THEN 1 ELSE 0 END) as flash_count,
    SUM(coalesce(r.points, 0)) + SUM(CASE WHEN r.flash THEN 1 ELSE 0 END) as total_points
  FROM public.results r
  JOIN public.routes rt ON rt.id = r.route_id
  JOIN public.profiles p ON p.id = r.profile_id
  WHERE rt.discipline = 'toprope'
    AND LOWER(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) LIKE '%janosch%test%'
  GROUP BY r.profile_id, p.first_name, p.last_name
)
SELECT * FROM points_check;

-- Schritt 2: Prüfe die Klasse-Berechnung
WITH class_check AS (
  SELECT
    p.id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
    p.league,
    p.gender,
    p.birth_date,
    coalesce((SELECT age_cutoff_date FROM public.admin_settings LIMIT 1), current_date) as cutoff_date,
    extract(year from age(
      coalesce((SELECT age_cutoff_date FROM public.admin_settings LIMIT 1), current_date), 
      p.birth_date::date
    ))::int as age,
    CASE
      WHEN p.gender IS NULL OR p.birth_date IS NULL THEN NULL
      WHEN extract(year from age(
        coalesce((SELECT age_cutoff_date FROM public.admin_settings LIMIT 1), current_date), 
        p.birth_date::date
      ))::int <= coalesce((SELECT age_u16_max FROM public.admin_settings LIMIT 1), 15) THEN 'u16-' || lower(p.gender)
      WHEN extract(year from age(
        coalesce((SELECT age_cutoff_date FROM public.admin_settings LIMIT 1), current_date), 
        p.birth_date::date
      ))::int < coalesce((SELECT age_u40_min FROM public.admin_settings LIMIT 1), 40) THEN 'ue16-' || lower(p.gender)
      ELSE 'ue40-' || lower(p.gender)
    END as computed_class
  FROM public.profiles p
  WHERE LOWER(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) LIKE '%janosch%test%'
)
SELECT * FROM class_check;

-- Schritt 3: Simuliere die komplette Funktion Schritt für Schritt
WITH 
-- Admin Settings
admin_vars AS (
  SELECT
    coalesce(age_cutoff_date, qualification_start::date) as v_cutoff,
    coalesce(age_u16_max, 15) as v_u16_max,
    coalesce(age_u40_min, 40) as v_u40_min,
    qualification_start::date as v_start,
    qualification_end::date as v_end
  FROM public.admin_settings
  LIMIT 1
),
-- Points per profile (wie in der Funktion)
points_per_profile AS (
  SELECT
    r.profile_id,
    coalesce(sum(coalesce(r.points, 0)::bigint), 0)::bigint + 
    coalesce(sum(case when r.flash then 1 else 0 end)::bigint, 0)::bigint as total
  FROM public.results r
  INNER JOIN public.routes rt ON rt.id = r.route_id
  CROSS JOIN admin_vars av
  WHERE rt.discipline = 'toprope'
    AND (av.v_start IS NULL OR av.v_end IS NULL OR (r.created_at::date >= av.v_start AND r.created_at::date <= av.v_end))
    AND (coalesce(r.points, 0) > 0 OR r.flash = true)
  GROUP BY r.profile_id
),
-- Profile class (wie in der Funktion)
profile_class AS (
  SELECT
    p.id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
    CASE
      WHEN p.gender IS NULL OR p.birth_date IS NULL THEN NULL
      WHEN extract(year from age(av.v_cutoff, p.birth_date::date))::int <= av.v_u16_max THEN 'u16-' || lower(p.gender)
      WHEN extract(year from age(av.v_cutoff, p.birth_date::date))::int < av.v_u40_min THEN 'ue16-' || lower(p.gender)
      ELSE 'ue40-' || lower(p.gender)
    END as computed_class
  FROM public.profiles p
  CROSS JOIN admin_vars av
  WHERE (p.role IS NULL OR p.role NOT IN ('gym_admin', 'league_admin'))
    AND p.league = 'toprope'
    AND p.gender IS NOT NULL
    AND p.birth_date IS NOT NULL
)
-- Finale Verknüpfung
SELECT
  pc.id,
  pc.name,
  pc.computed_class,
  pp.profile_id as points_profile_id,
  pp.total as points_total,
  CASE 
    WHEN pp.profile_id IS NULL THEN '❌ Keine Punkte gefunden (JOIN fehlgeschlagen)'
    WHEN pc.computed_class != 'ue16-m' THEN '⚠️ Falsche Klasse: ' || pc.computed_class || ' (erwartet: ue16-m)'
    ELSE '✅ OK'
  END as status
FROM profile_class pc
LEFT JOIN points_per_profile pp ON pp.profile_id = pc.id
WHERE LOWER(pc.name) LIKE '%janosch%test%'
   OR pc.computed_class = 'ue16-m';
