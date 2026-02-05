-- DIREKT AUSFÜHREN IM SUPABASE DASHBOARD → SQL EDITOR
-- Kopiere ALLES und führe es aus!

-- 1. RLS Policy für öffentlichen Zugriff auf gym_invites
DROP POLICY IF EXISTS "Gym invites read by token" ON public.gym_invites;
CREATE POLICY "Gym invites read by token" ON public.gym_invites
  FOR SELECT USING (true);

-- 2. Index für Performance
CREATE INDEX IF NOT EXISTS gym_invites_token_idx ON public.gym_invites (token);

-- 3. Lösche alte Einladung für paulineannalioba@gmail.com
DELETE FROM gym_invites 
WHERE email = 'paulineannalioba@gmail.com' 
AND used_at IS NULL;

-- 4. Prüfe, ob Policy erstellt wurde (sollte eine Zeile zurückgeben)
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'gym_invites' 
AND policyname = 'Gym invites read by token';
