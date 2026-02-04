-- Funktion zum Erstellen von Test-Benutzern
-- Diese Funktion erstellt Auth-Benutzer UND Profile

CREATE OR REPLACE FUNCTION create_test_user(
  p_email text,
  p_password text DEFAULT 'test123',
  p_first_name text,
  p_last_name text,
  p_birth_date date,
  p_gender text,
  p_league text,
  p_role text DEFAULT 'participant'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Erstelle Auth-Benutzer über auth.users
  -- Hinweis: Dies erfordert Service Role Berechtigungen
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('role', p_role),
    false,
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Erstelle Identity
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    now(),
    now(),
    now()
  );

  -- Erstelle Profil
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    birth_date,
    gender,
    league,
    role,
    created_at
  )
  VALUES (
    v_user_id,
    p_email,
    p_first_name,
    p_last_name,
    p_birth_date,
    p_gender,
    p_league,
    p_role,
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

  RETURN v_user_id;
END;
$$;

-- Test-Teilnehmer erstellen
SELECT create_test_user('max.mustermann@example.com', 'test123', 'Max', 'Mustermann', '2005-03-15', 'm', 'toprope', 'participant');
SELECT create_test_user('sarah.schmidt@example.com', 'test123', 'Sarah', 'Schmidt', '2007-08-22', 'w', 'toprope', 'participant');
SELECT create_test_user('tom.weber@example.com', 'test123', 'Tom', 'Weber', '2004-11-10', 'm', 'lead', 'participant');
SELECT create_test_user('lisa.mueller@example.com', 'test123', 'Lisa', 'Müller', '2006-05-18', 'w', 'lead', 'participant');
SELECT create_test_user('felix.bauer@example.com', 'test123', 'Felix', 'Bauer', '2003-12-03', 'm', 'toprope', 'participant');
SELECT create_test_user('emma.fischer@example.com', 'test123', 'Emma', 'Fischer', '2008-01-25', 'w', 'toprope', 'participant');
SELECT create_test_user('noah.klein@example.com', 'test123', 'Noah', 'Klein', '2005-07-14', 'm', 'lead', 'participant');
SELECT create_test_user('sophia.hoffmann@example.com', 'test123', 'Sophia', 'Hoffmann', '2004-09-30', 'w', 'lead', 'participant');
SELECT create_test_user('lukas.wagner@example.com', 'test123', 'Lukas', 'Wagner', '2006-02-12', 'm', 'toprope', 'participant');
SELECT create_test_user('mia.becker@example.com', 'test123', 'Mia', 'Becker', '2007-06-08', 'w', 'toprope', 'participant');
