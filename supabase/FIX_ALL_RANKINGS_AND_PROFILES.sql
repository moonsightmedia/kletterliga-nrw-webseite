-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Kompletter Fix: Profile-Daten aus user_metadata + Ranglisten-Funktion

-- 1. Aktualisiere Profile aus user_metadata für alle User, deren Profile leer sind
UPDATE public.profiles p
SET 
  first_name = COALESCE(
    p.first_name,
    (u.raw_user_meta_data->>'first_name')::text
  ),
  last_name = COALESCE(
    p.last_name,
    (u.raw_user_meta_data->>'last_name')::text
  ),
  birth_date = COALESCE(
    p.birth_date,
    CASE 
      WHEN u.raw_user_meta_data->>'birth_date' IS NOT NULL 
      THEN (u.raw_user_meta_data->>'birth_date')::date
      ELSE NULL
    END
  ),
  gender = COALESCE(
    p.gender,
    (u.raw_user_meta_data->>'gender')::text
  ),
  league = COALESCE(
    p.league,
    (u.raw_user_meta_data->>'league')::text
  )
FROM auth.users u
WHERE p.id = u.id
  AND (
    p.first_name IS NULL 
    OR p.last_name IS NULL
    OR p.birth_date IS NULL
    OR p.gender IS NULL
    OR p.league IS NULL
  )
  AND (
    u.raw_user_meta_data->>'first_name' IS NOT NULL
    OR u.raw_user_meta_data->>'last_name' IS NOT NULL
  );

-- 2. Fixierte Ranglisten-Funktion (individuelle Datumsfilterung pro Teilnehmer)
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
  -- Points per profile - für jeden Teilnehmer individuell prüfen
  points_per_profile as (
    select
      r.profile_id,
      coalesce(sum(coalesce(r.points, 0)::bigint), 0)::bigint + 
      coalesce(sum(case when r.flash then 1 else 0 end)::bigint, 0)::bigint as total
    from public.results r
    inner join public.routes rt on rt.id = r.route_id
    where rt.discipline = p_league
      -- Für jeden Teilnehmer: Wenn er keine Ergebnisse im Zeitraum hat, alle seine Ergebnisse verwenden
      and (
        v_start is null 
        or v_end is null 
        or (
          -- Prüfe, ob dieser Teilnehmer Ergebnisse im Zeitraum hat
          exists (
            select 1 
            from public.results r2
            join public.routes rt2 on rt2.id = r2.route_id
            where r2.profile_id = r.profile_id
              and rt2.discipline = p_league
              and r2.created_at::date >= v_start
              and r2.created_at::date <= v_end
          )
          -- Wenn ja, nur Ergebnisse im Zeitraum verwenden
          and r.created_at::date >= v_start
          and r.created_at::date <= v_end
        )
        -- Wenn der Teilnehmer keine Ergebnisse im Zeitraum hat, alle seine Ergebnisse verwenden
        or not exists (
          select 1 
          from public.results r2
          join public.routes rt2 on rt2.id = r2.route_id
          where r2.profile_id = r.profile_id
            and rt2.discipline = p_league
            and r2.created_at::date >= v_start
            and r2.created_at::date <= v_end
        )
      )
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

-- 3. Erstelle Trigger für zukünftige User
CREATE OR REPLACE FUNCTION sync_profile_from_user_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Wenn User bestätigt wird und Profil existiert, aktualisiere es aus user_metadata
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      birth_date,
      gender,
      league,
      role
    )
    VALUES (
      NEW.id,
      NEW.email,
      (NEW.raw_user_meta_data->>'first_name')::text,
      (NEW.raw_user_meta_data->>'last_name')::text,
      CASE 
        WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
        THEN (NEW.raw_user_meta_data->>'birth_date')::date
        ELSE NULL
      END,
      (NEW.raw_user_meta_data->>'gender')::text,
      (NEW.raw_user_meta_data->>'league')::text,
      COALESCE((NEW.raw_user_meta_data->>'role')::text, 'participant')
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = COALESCE(
        public.profiles.first_name,
        (NEW.raw_user_meta_data->>'first_name')::text
      ),
      last_name = COALESCE(
        public.profiles.last_name,
        (NEW.raw_user_meta_data->>'last_name')::text
      ),
      birth_date = COALESCE(
        public.profiles.birth_date,
        CASE 
          WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
          THEN (NEW.raw_user_meta_data->>'birth_date')::date
          ELSE NULL
        END
      ),
      gender = COALESCE(
        public.profiles.gender,
        (NEW.raw_user_meta_data->>'gender')::text
      ),
      league = COALESCE(
        public.profiles.league,
        (NEW.raw_user_meta_data->>'league')::text
      );
  END IF;
  RETURN NEW;
END;
$$;

-- Erstelle den Trigger (nur wenn er nicht existiert)
DROP TRIGGER IF EXISTS sync_profile_on_email_confirm ON auth.users;
CREATE TRIGGER sync_profile_on_email_confirm
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION sync_profile_from_user_metadata();

-- 4. Teste die Rangliste für Pauline Pelz (ue40-w, da geboren 1994)
SELECT * FROM public.get_public_rankings('toprope', 'ue40-w')
WHERE display_name LIKE '%Pauline%' OR display_name LIKE '%Pelz%';

-- 5. Teste alle Klassen für toprope
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
