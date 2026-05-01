drop policy if exists "Profiles read gym admin code redeemers" on public.profiles;

create policy "Profiles read gym admin code redeemers" on public.profiles
  for select
  using (
    exists (
      select 1
      from public.gym_codes gc
      join public.gym_admins ga on ga.gym_id = gc.gym_id
      where ga.profile_id = auth.uid()
        and gc.redeemed_by = profiles.id
        and gc.redeemed_at is not null
    )
    or exists (
      select 1
      from public.master_codes mc
      join public.gym_admins ga on ga.gym_id = mc.gym_id
      where ga.profile_id = auth.uid()
        and mc.redeemed_by = profiles.id
        and mc.redeemed_at is not null
    )
  );
