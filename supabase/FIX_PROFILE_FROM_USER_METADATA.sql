-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Fix: Profil-Daten aus user_metadata übernehmen wenn Profil leer ist

-- Problem: Wenn E-Mail-Bestätigung aktiviert ist, wird das Profil möglicherweise
-- ohne first_name/last_name erstellt. Die Daten sind aber in auth.users.raw_user_meta_data gespeichert.

-- 1. Prüfe, welche Daten in user_metadata gespeichert sind
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data,
  p.first_name,
  p.last_name,
  p.birth_date,
  p.gender,
  p.league
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'junebaum@web.de';

-- 2. Aktualisiere Profile aus user_metadata für alle User, deren Profile leer sind
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

-- 3. Prüfe das Ergebnis für junebaum@web.de
SELECT 
  id,
  email,
  first_name,
  last_name,
  trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) as display_name,
  birth_date,
  gender,
  league,
  role
FROM public.profiles
WHERE email = 'junebaum@web.de';

-- 4. Erstelle einen Trigger, der automatisch Profile aus user_metadata aktualisiert
--    wenn ein User bestätigt wird (email_confirmed_at wird gesetzt)
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

-- 5. Teste die Funktion für junebaum@web.de
--    (Simuliere E-Mail-Bestätigung)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'junebaum@web.de'
  AND email_confirmed_at IS NULL;

-- Prüfe das Ergebnis
SELECT 
  id,
  email,
  first_name,
  last_name,
  trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) as display_name,
  birth_date,
  gender,
  league,
  role
FROM public.profiles
WHERE email = 'junebaum@web.de';
