create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text := coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '');
begin
  if auth.uid() = old.id and actor_role <> 'league_admin' then
    if new.role is distinct from old.role then
      raise exception 'role cannot be changed by the user';
    end if;

    if new.participation_activated_at is distinct from old.participation_activated_at then
      raise exception 'participation_activated_at cannot be changed by the user';
    end if;

    if new.email is distinct from old.email then
      raise exception 'email cannot be changed by the user';
    end if;
  end if;

  return new;
end;
$$;
drop trigger if exists protect_profile_privileged_fields_trigger on public.profiles;
create trigger protect_profile_privileged_fields_trigger
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileged_fields();
drop policy if exists "Profiles read authenticated" on public.profiles;
drop policy if exists "Profiles read league admin" on public.profiles;
create policy "Profiles read league admin" on public.profiles
  for select using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'league_admin');
drop policy if exists "Profiles update own" on public.profiles;
create policy "Profiles update own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
drop policy if exists "Results read authenticated" on public.results;
drop policy if exists "Results read league admin" on public.results;
create policy "Results read league admin" on public.results
  for select using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'league_admin');
drop policy if exists "Change requests read authenticated" on public.change_requests;
drop policy if exists "Change requests read league admin" on public.change_requests;
create policy "Change requests read league admin" on public.change_requests
  for select using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'league_admin');
drop policy if exists "Gym codes read for redemption" on public.gym_codes;
drop policy if exists "Gym invites read by token" on public.gym_invites;
drop policy if exists "Master codes read for redemption" on public.master_codes;
