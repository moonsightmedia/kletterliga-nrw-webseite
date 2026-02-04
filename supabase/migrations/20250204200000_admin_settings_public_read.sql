-- Saison-Termine (Qualifikation, Finale) auf der öffentlichen Webseite anzeigen
-- Dafür dürfen auch nicht eingeloggte Besucher admin_settings lesen (nur SELECT).
drop policy if exists "Admin settings read" on public.admin_settings;
create policy "Admin settings read" on public.admin_settings
  for select using (true);
