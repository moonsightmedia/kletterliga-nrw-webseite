-- Erstellt Profile für bereits existierende Auth-Benutzer
-- WICHTIG: Die Auth-Benutzer müssen bereits existieren!
-- Erstelle sie zuerst über das Supabase Dashboard (Authentication → Users)

-- Hole die User-IDs der existierenden Benutzer und erstelle Profile
DO $$
DECLARE
  user_record RECORD;
  profile_data RECORD;
BEGIN
  -- Liste der Test-Teilnehmer
  FOR profile_data IN
    SELECT * FROM (VALUES
      ('max.mustermann@example.com', 'Max', 'Mustermann', '2005-03-15', 'm', 'toprope', 'participant'),
      ('sarah.schmidt@example.com', 'Sarah', 'Schmidt', '2007-08-22', 'w', 'toprope', 'participant'),
      ('tom.weber@example.com', 'Tom', 'Weber', '2004-11-10', 'm', 'lead', 'participant'),
      ('lisa.mueller@example.com', 'Lisa', 'Müller', '2006-05-18', 'w', 'lead', 'participant'),
      ('felix.bauer@example.com', 'Felix', 'Bauer', '2003-12-03', 'm', 'toprope', 'participant'),
      ('emma.fischer@example.com', 'Emma', 'Fischer', '2008-01-25', 'w', 'toprope', 'participant'),
      ('noah.klein@example.com', 'Noah', 'Klein', '2005-07-14', 'm', 'lead', 'participant'),
      ('sophia.hoffmann@example.com', 'Sophia', 'Hoffmann', '2004-09-30', 'w', 'lead', 'participant'),
      ('lukas.wagner@example.com', 'Lukas', 'Wagner', '2006-02-12', 'm', 'toprope', 'participant'),
      ('mia.becker@example.com', 'Mia', 'Becker', '2007-06-08', 'w', 'toprope', 'participant')
    ) AS t(email, first_name, last_name, birth_date, gender, league, role)
  LOOP
    -- Finde den Auth-Benutzer
    SELECT id INTO user_record
    FROM auth.users
    WHERE email = profile_data.email
    LIMIT 1;

    -- Wenn Benutzer existiert, erstelle/aktualisiere Profil
    IF user_record.id IS NOT NULL THEN
      INSERT INTO public.profiles (
        id, email, first_name, last_name, birth_date, gender, league, role, created_at
      )
      VALUES (
        user_record.id,
        profile_data.email,
        profile_data.first_name,
        profile_data.last_name,
        profile_data.birth_date::date,
        profile_data.gender,
        profile_data.league,
        profile_data.role,
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        birth_date = EXCLUDED.birth_date,
        gender = EXCLUDED.gender,
        league = EXCLUDED.league,
        role = EXCLUDED.role;
      
      RAISE NOTICE 'Profil erstellt/aktualisiert für: %', profile_data.email;
    ELSE
      RAISE WARNING 'Auth-Benutzer nicht gefunden für: %. Bitte erstelle ihn zuerst im Dashboard.', profile_data.email;
    END IF;
  END LOOP;
END $$;
