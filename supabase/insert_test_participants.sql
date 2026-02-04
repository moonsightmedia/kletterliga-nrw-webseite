-- Test-Teilnehmer für Rangliste einfügen
-- Erstellt Profile mit Dummy-Auth-Benutzern (nur für Anzeige-Zwecke)
-- Führe dieses Skript im Supabase SQL Editor aus

DO $$
DECLARE
  i int;
  v_user_id uuid;
  emails text[] := ARRAY[
    'max.mustermann@example.com',
    'sarah.schmidt@example.com',
    'tom.weber@example.com',
    'lisa.mueller@example.com',
    'felix.bauer@example.com',
    'emma.fischer@example.com',
    'noah.klein@example.com',
    'sophia.hoffmann@example.com',
    'lukas.wagner@example.com',
    'mia.becker@example.com',
    -- 20 weitere Toprope Ü16 m
    'jonas.meyer@example.com',
    'benjamin.koch@example.com',
    'leon.schulz@example.com',
    'finn.herrmann@example.com',
    'henry.kruger@example.com',
    'theo.richter@example.com',
    'julian.werner@example.com',
    'luca.schneider@example.com',
    'emil.hartmann@example.com',
    'philip.lang@example.com',
    'alexander.stein@example.com',
    'sebastian.hoffmann@example.com',
    'daniel.gross@example.com',
    'marcus.wolf@example.com',
    'simon.krause@example.com',
    'tobias.lehmann@example.com',
    'christian.huber@example.com',
    'michael.schmidt@example.com',
    'andreas.weiss@example.com',
    'matthias.schwarz@example.com'
  ];
  first_names text[] := ARRAY[
    'Max', 'Sarah', 'Tom', 'Lisa', 'Felix', 'Emma', 'Noah', 'Sophia', 'Lukas', 'Mia',
    'Jonas', 'Benjamin', 'Leon', 'Finn', 'Henry', 'Theo', 'Julian', 'Luca', 'Emil', 'Philip',
    'Alexander', 'Sebastian', 'Daniel', 'Marcus', 'Simon', 'Tobias', 'Christian', 'Michael', 'Andreas', 'Matthias'
  ];
  last_names text[] := ARRAY[
    'Mustermann', 'Schmidt', 'Weber', 'Müller', 'Bauer', 'Fischer', 'Klein', 'Hoffmann', 'Wagner', 'Becker',
    'Meyer', 'Koch', 'Schulz', 'Herrmann', 'Kruger', 'Richter', 'Werner', 'Schneider', 'Hartmann', 'Lang',
    'Stein', 'Hoffmann', 'Gross', 'Wolf', 'Krause', 'Lehmann', 'Huber', 'Schmidt', 'Weiss', 'Schwarz'
  ];
  birth_dates date[] := ARRAY[
    '2005-03-15', '2007-08-22', '2004-11-10', '2006-05-18', '2003-12-03', '2008-01-25', '2005-07-14', '2004-09-30', '2006-02-12', '2007-06-08',
    -- Ü16 männlich (2004-2005, über 16 Jahre alt)
    '2005-01-10', '2005-04-20', '2004-08-15', '2005-11-05', '2004-02-28', '2005-06-12', '2004-09-18', '2005-12-03', '2004-03-25', '2005-07-30',
    '2004-10-08', '2005-01-22', '2004-05-14', '2005-08-26', '2004-12-11', '2005-03-19', '2004-07-02', '2005-10-15', '2004-02-07', '2005-05-21'
  ];
  genders text[] := ARRAY[
    'm', 'w', 'm', 'w', 'm', 'w', 'm', 'w', 'm', 'w',
    'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm',
    'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm'
  ];
  leagues text[] := ARRAY[
    'toprope', 'toprope', 'lead', 'lead', 'toprope', 'toprope', 'lead', 'lead', 'toprope', 'toprope',
    'toprope', 'toprope', 'toprope', 'toprope', 'toprope', 'toprope', 'toprope', 'toprope', 'toprope', 'toprope',
    'toprope', 'toprope', 'toprope', 'toprope', 'toprope', 'toprope', 'toprope', 'toprope', 'toprope', 'toprope'
  ];
BEGIN
  FOR i IN 1..30 LOOP
    -- Prüfe ob Benutzer bereits existiert
    SELECT id INTO v_user_id FROM auth.users WHERE email = emails[i] LIMIT 1;
    
    -- Wenn nicht existiert, erstelle minimalen Auth-Benutzer (nur für Foreign Key)
    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
      )
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        emails[i],
        '$2a$10$dummy', -- Dummy Password Hash
        now(),
        now(),
        now(),
        '{"provider":"email"}'::jsonb,
        '{}'::jsonb,
        false
      );
    END IF;

    -- Erstelle Identity (nur wenn nicht vorhanden)
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE auth.identities.user_id = v_user_id AND provider = 'email') THEN
      INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        v_user_id::text,
        jsonb_build_object('sub', v_user_id::text, 'email', emails[i]),
        'email',
        now(),
        now()
      );
    END IF;

    -- Erstelle Profil
    INSERT INTO public.profiles (id, email, first_name, last_name, birth_date, gender, league, role, created_at)
    VALUES (
      v_user_id,
      emails[i],
      first_names[i],
      last_names[i],
      birth_dates[i],
      genders[i],
      leagues[i],
      'participant',
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      birth_date = EXCLUDED.birth_date,
      gender = EXCLUDED.gender,
      league = EXCLUDED.league;
  END LOOP;
END $$;
