alter table public.gym_invites
  add column if not exists gym_id uuid references public.gyms(id) on delete cascade;

alter table public.gym_invites
  add column if not exists revoked_at timestamp with time zone;

update public.gym_invites
set revoked_at = coalesce(revoked_at, now())
where gym_id is null
  and used_at is null
  and revoked_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gym_invites_active_requires_gym_id'
  ) then
    alter table public.gym_invites
      add constraint gym_invites_active_requires_gym_id
      check (used_at is not null or revoked_at is not null or gym_id is not null);
  end if;
end $$;

create index if not exists gym_invites_gym_id_idx on public.gym_invites (gym_id);

create index if not exists gym_invites_active_lookup_idx
  on public.gym_invites (gym_id, created_at desc)
  where used_at is null and revoked_at is null;
