-- Teilnahme-Flag immer an eingelösten Mastercodes ausrichten:
-- Teilnahme = jemand hat in master_codes redeemed_by/redeemed_at (15€-Nachweis).
--
-- A) Trigger: INSERT + UPDATE auf master_codes (vorher nur UPDATE → Lücken bei INSERT mit voller Einlösung).
-- B) Einmaliger Abgleich aller bestehenden Profile.

create or replace function public.set_participation_activated_on_redeem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.redeemed_by is null or new.redeemed_at is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    update public.profiles
    set participation_activated_at = coalesce(participation_activated_at, new.redeemed_at)
    where id = new.redeemed_by;
  elsif tg_op = 'UPDATE' then
    if old.redeemed_by is distinct from new.redeemed_by
      or old.redeemed_at is distinct from new.redeemed_at then
      update public.profiles
      set participation_activated_at = coalesce(participation_activated_at, new.redeemed_at)
      where id = new.redeemed_by;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists master_codes_set_participation_trigger on public.master_codes;
create trigger master_codes_set_participation_trigger
  after insert or update on public.master_codes
  for each row
  execute function public.set_participation_activated_on_redeem();

-- Kein Einlösungsnachweis → kein Teilnahme-Timestamp
update public.profiles p
set participation_activated_at = null
where coalesce(lower(p.role::text), '') = 'participant'
  and p.participation_activated_at is not null
  and not exists (
    select 1
    from public.master_codes mc
    where mc.redeemed_by = p.id
      and mc.redeemed_at is not null
  );

-- Einlösung vorhanden → Timestamp = frühestes redeemed_at (Normalfall: eine Zeile)
update public.profiles p
set participation_activated_at = agg.first_redeemed_at
from (
  select
    redeemed_by as profile_id,
    min(redeemed_at) as first_redeemed_at
  from public.master_codes
  where redeemed_by is not null
    and redeemed_at is not null
  group by redeemed_by
) agg
where p.id = agg.profile_id
  and coalesce(lower(p.role::text), '') = 'participant'
  and (
    p.participation_activated_at is null
    or p.participation_activated_at is distinct from agg.first_redeemed_at
  );
