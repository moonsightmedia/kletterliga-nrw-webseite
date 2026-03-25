drop policy if exists "Gym codes read redeemed by participant" on public.gym_codes;

create policy "Gym codes read redeemed by participant" on public.gym_codes
  for select
  using (redeemed_by = auth.uid() and redeemed_at is not null);
