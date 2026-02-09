-- Mastercodes: Teilnahmegebühr (15 €), einmal pro Code und pro Teilnehmer einlösbar

-- Spalte auf profiles für Ranglisten-Filter
alter table public.profiles add column if not exists participation_activated_at timestamptz;

-- Tabelle master_codes (analog gym_codes, gym_id nullable = von Liga erstellt)
create table if not exists public.master_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  gym_id uuid references public.gyms(id) on delete set null,
  created_at timestamptz default now(),
  redeemed_by uuid references public.profiles(id) on delete set null,
  redeemed_at timestamptz,
  expires_at timestamptz,
  status text default 'available'
);

create index if not exists master_codes_code_idx on public.master_codes (code);
create index if not exists master_codes_gym_id_idx on public.master_codes (gym_id);
create index if not exists master_codes_redeemed_by_idx on public.master_codes (redeemed_by);

alter table public.master_codes enable row level security;

-- Liga-Admin: alle master_codes lesen/erstellen/ändern/löschen
create policy "Master codes read league admin" on public.master_codes
  for select using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'league_admin')
  );
create policy "Master codes insert league admin" on public.master_codes
  for insert with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'league_admin')
  );
create policy "Master codes update league admin" on public.master_codes
  for update using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'league_admin')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'league_admin')
  );
create policy "Master codes delete league admin" on public.master_codes
  for delete using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'league_admin')
  );

-- Gym-Admin: nur eigene Halle (gym_id = eigene Halle)
create policy "Master codes read gym admin" on public.master_codes
  for select using (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid() and gym_admins.gym_id = master_codes.gym_id
    )
  );
create policy "Master codes insert gym admin" on public.master_codes
  for insert with check (
    gym_id is not null and exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid() and gym_admins.gym_id = master_codes.gym_id
    )
  );
create policy "Master codes update gym admin" on public.master_codes
  for update using (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid() and gym_admins.gym_id = master_codes.gym_id
    )
  )
  with check (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid() and gym_admins.gym_id = master_codes.gym_id
    )
  );
create policy "Master codes delete gym admin" on public.master_codes
  for delete using (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid() and gym_admins.gym_id = master_codes.gym_id
    )
  );

-- Teilnehmer: lesen zum Einlösen (Code-Lookup), updaten nur zum Einlösen (redeemed_by = auth.uid(), war null)
create policy "Master codes read for redemption" on public.master_codes
  for select using (auth.role() = 'authenticated');

create policy "Master codes redeem" on public.master_codes
  for update
  using (redeemed_by is null)
  with check (redeemed_by = auth.uid());

-- Trigger: beim Einlösen participation_activated_at auf dem Profil setzen
create or replace function public.set_participation_activated_on_redeem()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.redeemed_by is not null and (old.redeemed_by is null or old.redeemed_by is distinct from new.redeemed_by) then
    update public.profiles
    set participation_activated_at = coalesce(participation_activated_at, now())
    where id = new.redeemed_by;
  end if;
  return new;
end;
$$;

drop trigger if exists master_codes_set_participation_trigger on public.master_codes;
create trigger master_codes_set_participation_trigger
  after update on public.master_codes
  for each row
  execute function public.set_participation_activated_on_redeem();
