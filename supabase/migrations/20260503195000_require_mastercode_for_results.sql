drop policy if exists "Results insert own" on public.results;
create policy "Results insert own" on public.results
  for insert
  with check (
    auth.uid() = profile_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.participation_activated_at is not null
    )
    and exists (
      select 1 from public.routes
      where routes.id = results.route_id
        and exists (
          select 1 from public.gym_codes
          where gym_codes.gym_id = routes.gym_id
            and gym_codes.redeemed_by = auth.uid()
            and gym_codes.redeemed_at is not null
        )
    )
  );

drop policy if exists "Results update own" on public.results;
create policy "Results update own" on public.results
  for update
  using (auth.uid() = profile_id)
  with check (
    auth.uid() = profile_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.participation_activated_at is not null
    )
    and exists (
      select 1 from public.routes
      where routes.id = results.route_id
        and exists (
          select 1 from public.gym_codes
          where gym_codes.gym_id = routes.gym_id
            and gym_codes.redeemed_by = auth.uid()
            and gym_codes.redeemed_at is not null
        )
    )
  );
