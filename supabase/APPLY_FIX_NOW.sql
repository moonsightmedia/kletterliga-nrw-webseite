-- WICHTIG: Diese SQL-Befehle MÜSSEN im Supabase Dashboard ausgeführt werden!
-- Gehe zu: Supabase Dashboard → SQL Editor → Führe diese Befehle aus

-- 1. Fix RLS Policy für gym_invites (behebt 406-Fehler)
drop policy if exists "Gym invites read by token" on public.gym_invites;
create policy "Gym invites read by token" on public.gym_invites
  for select using (true);

-- Stelle sicher, dass der Index existiert
create index if not exists gym_invites_token_idx on public.gym_invites (token);

-- 2. Lösche alte Einladung für paulineannalioba@gmail.com
DELETE FROM gym_invites 
WHERE email = 'paulineannalioba@gmail.com' 
AND used_at IS NULL;

-- 3. Prüfe, ob die Policy korrekt erstellt wurde
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'gym_invites';
