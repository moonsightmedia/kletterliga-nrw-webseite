-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Debug: Warum werden die Daten von junebaum@web.de nicht angezeigt?

-- 1. Prüfe Profil-Daten (Name, Geschlecht, Geburtsdatum)
SELECT 
  id,
  email,
  first_name,
  last_name,
  trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) as display_name,
  league,
  gender,
  birth_date,
  role
FROM public.profiles
WHERE email = 'junebaum@web.de';

-- 2. Prüfe berechnete Klasse
WITH admin_vars AS (
  SELECT
    coalesce(age_cutoff_date, qualification_start::date) as v_cutoff,
    coalesce(age_u16_max, 15) as v_u16_max,
    coalesce(age_u40_min, 40) as v_u40_min
  FROM public.admin_settings
  LIMIT 1
)
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  p.gender,
  p.birth_date,
  p.league,
  av.v_cutoff as cutoff_date,
  extract(year from age(av.v_cutoff, p.birth_date::date))::int as age,
  CASE
    WHEN p.gender IS NULL OR p.birth_date IS NULL THEN '❌ NULL - Klasse kann nicht berechnet werden'
    WHEN extract(year from age(av.v_cutoff, p.birth_date::date))::int <= av.v_u16_max THEN 'u16-' || lower(p.gender)
    WHEN extract(year from age(av.v_cutoff, p.birth_date::date))::int < av.v_u40_min THEN 'ue16-' || lower(p.gender)
    ELSE 'ue40-' || lower(p.gender)
  END as computed_class,
  CASE
    WHEN p.gender IS NULL THEN '❌ Gender fehlt'
    WHEN p.birth_date IS NULL THEN '❌ Geburtsdatum fehlt'
    WHEN p.league IS NULL THEN '❌ League fehlt'
    WHEN p.league != 'toprope' AND p.league != 'lead' THEN '⚠️ Falsche League: ' || p.league
    ELSE '✅ OK'
  END as status
FROM public.profiles p
CROSS JOIN admin_vars av
WHERE p.email = 'junebaum@web.de';

-- 3. Prüfe alle Ergebnisse mit Details
SELECT 
  r.id,
  r.points,
  r.flash,
  r.created_at,
  r.created_at::date as created_date,
  rt.discipline,
  rt.code as route_code,
  rt.name as route_name,
  g.name as gym_name
FROM public.results r
JOIN public.routes rt ON rt.id = r.route_id
LEFT JOIN public.gyms g ON g.id = rt.gym_id
WHERE r.profile_id IN (SELECT id FROM public.profiles WHERE email = 'junebaum@web.de')
ORDER BY r.created_at DESC;

-- 4. Teste die Funktion für alle möglichen Klassen
SELECT 'ue16-m' as klasse, * FROM public.get_public_rankings('toprope', 'ue16-m')
WHERE display_name LIKE '%june%' OR LOWER(display_name) LIKE '%baum%'
UNION ALL
SELECT 'ue16-w', * FROM public.get_public_rankings('toprope', 'ue16-w')
WHERE display_name LIKE '%june%' OR LOWER(display_name) LIKE '%baum%'
UNION ALL
SELECT 'u16-m', * FROM public.get_public_rankings('toprope', 'u16-m')
WHERE display_name LIKE '%june%' OR LOWER(display_name) LIKE '%baum%'
UNION ALL
SELECT 'u16-w', * FROM public.get_public_rankings('toprope', 'u16-w')
WHERE display_name LIKE '%june%' OR LOWER(display_name) LIKE '%baum%'
UNION ALL
SELECT 'ue40-m', * FROM public.get_public_rankings('toprope', 'ue40-m')
WHERE display_name LIKE '%june%' OR LOWER(display_name) LIKE '%baum%'
UNION ALL
SELECT 'ue40-w', * FROM public.get_public_rankings('toprope', 'ue40-w')
WHERE display_name LIKE '%june%' OR LOWER(display_name) LIKE '%baum%'
ORDER BY klasse, rank;

-- 5. Prüfe, ob der Name korrekt zusammengesetzt wird
SELECT 
  id,
  email,
  first_name,
  last_name,
  trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) as display_name,
  CASE 
    WHEN trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) = '' THEN '❌ Name ist leer'
    WHEN first_name IS NULL AND last_name IS NULL THEN '❌ Beide Namen fehlen'
    WHEN first_name IS NULL THEN '⚠️ Vorname fehlt'
    WHEN last_name IS NULL THEN '⚠️ Nachname fehlt'
    ELSE '✅ Name vorhanden'
  END as name_status
FROM public.profiles
WHERE email = 'junebaum@web.de';
