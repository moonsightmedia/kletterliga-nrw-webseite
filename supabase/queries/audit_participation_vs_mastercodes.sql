-- Audit: Teilnahme-Flag (profiles.participation_activated_at) vs. Mastercode-Einlösung (master_codes.redeemed_by)
-- In der Supabase-SQL-Konsole ausführen (read-only Checks).

-- 1) Wer hat einen Mastercode-Zeilen-Eintrag (eingelöst)?
select
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.archived_at,
  p.participation_activated_at,
  mc.code,
  mc.redeemed_at as mastercode_redeemed_at,
  mc.gym_id as mastercode_gym_id
from public.profiles p
join public.master_codes mc on mc.redeemed_by = p.id
where p.archived_at is null
  and coalesce(lower(p.role::text), '') = 'participant'
order by mc.redeemed_at desc nulls last;

-- 2) Aktive Teilnehmer ohne Archiv UND ohne eingelösten Mastercode-Zeilen-Eintrag
select
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.participation_activated_at
from public.profiles p
where p.archived_at is null
  and coalesce(lower(p.role::text), '') = 'participant'
  and not exists (
    select 1 from public.master_codes mc where mc.redeemed_by = p.id and mc.redeemed_at is not null
  )
order by p.email nulls last;

-- 3) Dateninkonsistenz A: Teilnahmezeitstempel gesetzt, aber kein Mastercode-Datensatz mit redeemed_by = Profil
--    (Das ist der Fall, wenn die App „Teilnahme aktiv“ zeigt, aber keine Mastercode-Verknüpfung existiert.)
select
  p.id,
  p.email,
  p.participation_activated_at,
  (select count(*) from public.master_codes mc where mc.redeemed_by = p.id)::int as master_code_rows
from public.profiles p
where p.archived_at is null
  and coalesce(lower(p.role::text), '') = 'participant'
  and p.participation_activated_at is not null
  and not exists (
    select 1 from public.master_codes mc where mc.redeemed_by = p.id and mc.redeemed_at is not null
  );

-- 4) Dateninkonsistenz B: Mastercode mit redeemed_by, aber redeemed_at noch null (sollte praktisch nicht vorkommen)
select mc.id, mc.code, mc.redeemed_by, mc.redeemed_at, mc.status
from public.master_codes mc
where mc.redeemed_by is not null and mc.redeemed_at is null;

-- 5) Kurzüberblick Zahlen (Teilnehmer, nicht archiviert)
with base as (
  select p.id, p.participation_activated_at
  from public.profiles p
  where p.archived_at is null
    and coalesce(lower(p.role::text), '') = 'participant'
),
with_mc as (
  select distinct redeemed_by as profile_id
  from public.master_codes
  where redeemed_by is not null and redeemed_at is not null
)
select
  (select count(*) from base)::int as teilnehmer_aktiv_archiv_null,
  (select count(*) from base where participation_activated_at is not null)::int as mit_teilnahme_timestamp,
  (select count(*) from base b where exists (select 1 from with_mc w where w.profile_id = b.id))::int as mit_mastercode_datensatz,
  (
    select count(*) from base b
    where b.participation_activated_at is not null
      and not exists (select 1 from with_mc w where w.profile_id = b.id)
  )::int as inkonsistent_teilnahme_ohne_mastercode;
