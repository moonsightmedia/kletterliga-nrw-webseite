-- Tighten public exposure on invite/config tables.
drop policy if exists "Gym invites read by token" on public.gym_invites;
