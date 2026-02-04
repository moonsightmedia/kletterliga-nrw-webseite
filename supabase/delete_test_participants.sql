-- Test-Teilnehmer löschen
-- Löscht alle Test-Teilnehmer, die mit insert_test_participants.sql erstellt wurden
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
BEGIN
  FOR i IN 1..array_length(emails, 1) LOOP
    -- Finde User-ID anhand der E-Mail
    SELECT id INTO v_user_id FROM auth.users WHERE email = emails[i] LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      -- Lösche Profil
      DELETE FROM public.profiles WHERE id = v_user_id;
      
      -- Lösche Identity
      DELETE FROM auth.identities WHERE user_id = v_user_id;
      
      -- Lösche Auth-User
      DELETE FROM auth.users WHERE id = v_user_id;
    END IF;
  END LOOP;
END $$;
