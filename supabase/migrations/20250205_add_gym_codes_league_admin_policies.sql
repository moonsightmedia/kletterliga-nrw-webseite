-- Add RLS policies for league_admin to manage gym_codes for all gyms
-- This allows league admins to read, create, update, and delete codes for any gym

-- Read policy for league_admin - can read all codes
drop policy if exists "Gym codes read league admin" on public.gym_codes;
create policy "Gym codes read league admin" on public.gym_codes
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'league_admin'
    )
  );

-- Insert policy for league_admin - can create codes for any gym
drop policy if exists "Gym codes insert league admin" on public.gym_codes;
create policy "Gym codes insert league admin" on public.gym_codes
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'league_admin'
    )
  );

-- Update policy for league_admin - can update codes for any gym
drop policy if exists "Gym codes update league admin" on public.gym_codes;
create policy "Gym codes update league admin" on public.gym_codes
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'league_admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'league_admin'
    )
  );

-- Delete policy for league_admin - can delete codes for any gym
drop policy if exists "Gym codes delete league admin" on public.gym_codes;
create policy "Gym codes delete league admin" on public.gym_codes
  for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'league_admin'
    )
  );
