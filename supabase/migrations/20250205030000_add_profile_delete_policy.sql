-- Fix gym_codes.redeemed_by foreign key to support CASCADE delete
-- When a profile is deleted, set redeemed_by to NULL instead of preventing deletion
ALTER TABLE public.gym_codes
  DROP CONSTRAINT IF EXISTS gym_codes_redeemed_by_fkey;

ALTER TABLE public.gym_codes
  ADD CONSTRAINT gym_codes_redeemed_by_fkey
  FOREIGN KEY (redeemed_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Add delete policy for profiles: League admins can delete profiles
drop policy if exists "Profiles delete league admin" on public.profiles;
create policy "Profiles delete league admin" on public.profiles
  for delete
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'league_admin');
