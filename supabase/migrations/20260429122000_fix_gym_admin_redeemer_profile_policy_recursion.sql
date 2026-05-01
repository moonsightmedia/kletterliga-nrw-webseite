create or replace function public.can_gym_admin_read_code_redeemer(target_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.gym_codes gc
    join public.gym_admins ga on ga.gym_id = gc.gym_id
    where ga.profile_id = auth.uid()
      and gc.redeemed_by = target_profile_id
      and gc.redeemed_at is not null
  )
  or exists (
    select 1
    from public.master_codes mc
    join public.gym_admins ga on ga.gym_id = mc.gym_id
    where ga.profile_id = auth.uid()
      and mc.redeemed_by = target_profile_id
      and mc.redeemed_at is not null
  );
$$;

drop policy if exists "Profiles read gym admin code redeemers" on public.profiles;

create policy "Profiles read gym admin code redeemers" on public.profiles
  for select
  using (public.can_gym_admin_read_code_redeemer(profiles.id));
