-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Debug-Abfrage: Warum werden keine Punkte angezeigt?

-- 1. Prüfe alle Profile mit Toprope-Ergebnissen und ihre berechnete Klasse
WITH profile_points AS (
  SELECT
    p.id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
    p.league,
    p.gender,
    p.birth_date,
    p.role,
    -- Berechne Klasse wie in der Funktion
    CASE
      WHEN p.gender IS NULL THEN NULL
      WHEN extract(year from age(
        coalesce((SELECT age_cutoff_date FROM public.admin_settings LIMIT 1), current_date), 
        p.birth_date::date
      ))::int <= coalesce((SELECT age_u16_max FROM public.admin_settings LIMIT 1), 15) THEN 'u16-' || p.gender
      WHEN extract(year from age(
        coalesce((SELECT age_cutoff_date FROM public.admin_settings LIMIT 1), current_date), 
        p.birth_date::date
      ))::int < coalesce((SELECT age_u40_min FROM public.admin_settings LIMIT 1), 40) THEN 'ue16-' || p.gender
      ELSE 'ue40-' || p.gender
    END as computed_class,
    -- Berechne Punkte wie in der Funktion
    (
      SELECT 
        coalesce(sum(coalesce(r.points, 0)::bigint), 0) + 
        coalesce(sum(case when r.flash then 1 else 0 end)::bigint, 0)
      FROM public.results r
      JOIN public.routes rt ON rt.id = r.route_id
      WHERE r.profile_id = p.id
        AND rt.discipline = 'toprope'
    ) as total_points,
    (
      SELECT COUNT(*)
      FROM public.results r
      JOIN public.routes rt ON rt.id = r.route_id
      WHERE r.profile_id = p.id
        AND rt.discipline = 'toprope'
    ) as result_count
  FROM public.profiles p
  WHERE (p.role IS NULL OR p.role NOT IN ('gym_admin', 'league_admin'))
)
SELECT 
  name,
  league,
  gender,
  birth_date,
  computed_class,
  total_points,
  result_count,
  CASE 
    WHEN league != 'toprope' THEN '❌ Falsche League (sollte toprope sein)'
    WHEN gender IS NULL THEN '❌ Gender fehlt'
    WHEN birth_date IS NULL THEN '❌ Geburtsdatum fehlt'
    WHEN computed_class IS NULL THEN '❌ Klasse konnte nicht berechnet werden'
    WHEN total_points = 0 THEN '⚠️ Keine Punkte (aber Ergebnisse vorhanden)'
    ELSE '✅ OK'
  END as status
FROM profile_points
WHERE result_count > 0
ORDER BY total_points DESC;

-- 2. Prüfe die Admin-Einstellungen
SELECT 
  qualification_start,
  qualification_end,
  age_cutoff_date,
  age_u16_max,
  age_u40_min
FROM public.admin_settings
LIMIT 1;

-- 3. Teste die Funktion mit allen Klassen für toprope
SELECT 'ue16-m' as klasse, * FROM public.get_public_rankings('toprope', 'ue16-m')
UNION ALL
SELECT 'ue16-w', * FROM public.get_public_rankings('toprope', 'ue16-w')
UNION ALL
SELECT 'u16-m', * FROM public.get_public_rankings('toprope', 'u16-m')
UNION ALL
SELECT 'u16-w', * FROM public.get_public_rankings('toprope', 'u16-w')
UNION ALL
SELECT 'ue40-m', * FROM public.get_public_rankings('toprope', 'ue40-m')
UNION ALL
SELECT 'ue40-w', * FROM public.get_public_rankings('toprope', 'ue40-w')
ORDER BY klasse, rank;

-- 4. Prüfe, ob die Punkte-Berechnung in der Funktion korrekt ist
--    Simuliere die Funktion manuell für ein Profil
WITH test_profile AS (
  SELECT id, first_name, last_name, league, gender, birth_date
  FROM public.profiles
  WHERE LOWER(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) LIKE '%janosch%test%'
  LIMIT 1
),
test_points AS (
  SELECT
    r.profile_id,
    sum(coalesce(r.points, 0)::bigint) + sum(case when r.flash then 1 else 0 end)::bigint as total
  FROM public.results r
  JOIN public.routes rt ON rt.id = r.route_id
  JOIN test_profile tp ON tp.id = r.profile_id
  WHERE rt.discipline = 'toprope'
  GROUP BY r.profile_id
)
SELECT 
  tp.id,
  trim(coalesce(tp.first_name, '') || ' ' || coalesce(tp.last_name, '')) as name,
  tp.league,
  tp.gender,
  tp.birth_date,
  coalesce(tpp.total, 0) as calculated_points
FROM test_profile tp
LEFT JOIN test_points tpp ON tpp.profile_id = tp.id;
