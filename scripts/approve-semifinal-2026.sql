-- Explicit Orga decisions, 15 September 2026:
-- U15 means younger than 15 on 1 May; all 148 activated participants qualify,
-- including six without results. This does not open registration.
-- Run only after the release preflight and protected backup. A transaction with
-- SET LOCAL request.jwt.claims identifies server maintenance, not a human login.
-- Default is a rollback preview. Pass psql -v apply=true to commit.
\if :{?apply}
\else
\set apply false
\endif
begin read write;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local request.jwt.claims = '{"role":"service_role"}';
lock table public.admin_settings in share row exclusive mode;
lock table public.profiles in share mode;
lock table public.semifinal_eligibility in share row exclusive mode;

do $$
declare s public.admin_settings; n integer;
begin
  select * into strict s from public.admin_settings;
  if s.season_year is distinct from '2026'
    or s.qualification_start is distinct from date '2026-05-01'
    or s.qualification_end is distinct from date '2026-09-13'
    or s.age_cutoff_date is distinct from date '2026-05-01'
    or s.age_u16_max is null or s.age_u16_max not in (14,15)
    or s.age_u40_min is distinct from 40 or s.finale_enabled is distinct from false then
    raise exception 'Season differs from the reviewed, closed 2026 configuration';
  end if;
  select count(*) into n from public.profiles where role='participant'
    and archived_at is null and participation_activated_at is not null;
  if n <> 148 then raise exception 'Expected 148 activated participants, got %', n; end if;
  if exists(select 1 from public.profiles where role='participant' and archived_at is null
    and participation_activated_at is not null and (league is null or league not in ('toprope','lead')
      or gender is null or gender not in ('w','m') or birth_date is null
      or participation_activated_at >= ((s.qualification_end+1)::timestamp at time zone 'Europe/Berlin'))) then
    raise exception 'Unreviewed participant or incomplete classification';
  end if;
  if (select count(*) from public.profiles where role='participant' and archived_at is null
    and participation_activated_at is not null
    and extract(year from age(s.age_cutoff_date,birth_date))=15) <> 1 then
    raise exception 'The reviewed age-15 population has changed';
  end if;
  if exists(select 1 from public.finale_registrations where season_year='2026') then
    raise exception 'Registrations already exist; review before changing classes';
  end if;
  update public.admin_settings set age_u16_max=14, updated_at=statement_timestamp() where id=s.id;
  insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label,decided_by)
  select s.season_year,p.id,'eligible',p.league,
    (case when extract(year from age(s.age_cutoff_date,p.birth_date))<15 then 'U15'
      when extract(year from age(s.age_cutoff_date,p.birth_date))<40 then 'Ü15' else 'Ü40' end)||'-'||p.gender,
    null
  from public.profiles p where p.role='participant' and p.archived_at is null and p.participation_activated_at is not null
  on conflict (season_year,profile_id) do update set status=excluded.status, league=excluded.league,
    class_label=excluded.class_label, decided_by=null, decided_at=statement_timestamp()
  where (semifinal_eligibility.status,semifinal_eligibility.league,semifinal_eligibility.class_label)
    is distinct from (excluded.status,excluded.league,excluded.class_label);
  if (select count(*) from public.semifinal_eligibility where season_year='2026' and status='eligible')<>148 then
    raise exception 'Final eligibility count differs from approval';
  end if;
  if (select count(*) from public.semifinal_eligibility where season_year='2026' and league='toprope' and class_label='U15-m')<>10
    or (select count(*) from public.semifinal_eligibility where season_year='2026' and league='toprope' and class_label='Ü15-m')<>15 then
    raise exception 'Age-class totals differ from approval';
  end if;
end;
$$;
select jsonb_build_object('eligible',count(*),'league',league,'class_label',class_label)
from public.semifinal_eligibility where season_year='2026' and status='eligible' group by league,class_label order by league,class_label;
\if :apply
commit;
\else
rollback;
\endif
