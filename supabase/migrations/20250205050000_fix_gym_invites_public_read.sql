-- Fix gym_invites public read policy for token-based access
-- This allows unauthenticated users to read invites by token

-- Drop existing policy if it exists
drop policy if exists "Gym invites read by token" on public.gym_invites;

-- Create public read policy for gym_invites (allows reading by token)
create policy "Gym invites read by token" on public.gym_invites
  for select using (true);

-- Ensure index exists for performance
create index if not exists gym_invites_token_idx on public.gym_invites (token);
