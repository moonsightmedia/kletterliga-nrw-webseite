-- Allow participants to read codes for redemption
drop policy if exists "Gym codes read for redemption" on public.gym_codes;
create policy "Gym codes read for redemption" on public.gym_codes
  for select
  using (auth.role() = 'authenticated');
