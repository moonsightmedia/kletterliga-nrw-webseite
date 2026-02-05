-- Add policy for league admins to update change requests
-- This allows league admins to approve/reject change requests

-- Drop existing update policy if it exists
drop policy if exists "Change requests update admin" on public.change_requests;

-- Create policy for league admins to update change requests
create policy "Change requests update admin" on public.change_requests
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
