-- Final release switch, only after frontend deployment and HTTP end-to-end QA.
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
lock table public.semifinal_eligibility in share mode;
do $$
declare s public.admin_settings;
begin
  select * into strict s from public.admin_settings;
  if s.season_year is distinct from '2026' or s.age_u16_max is distinct from 14
    or s.age_u40_min is distinct from 40 or s.age_cutoff_date is distinct from date '2026-05-01'
    or s.qualification_start is distinct from date '2026-05-01'
    or s.qualification_end is distinct from date '2026-09-13'
    or s.finale_date is distinct from date '2026-10-03'
    or s.finale_registration_deadline is distinct from date '2026-09-27'
    or s.finale_enabled is distinct from false
    or now() < ((s.qualification_end+1)::timestamp at time zone 'Europe/Berlin')
    or now() >= ((s.finale_registration_deadline+1)::timestamp at time zone 'Europe/Berlin') then
    raise exception 'Unexpected season, opening window or current release state';
  end if;
  if (select count(*) from public.profiles where role='participant' and archived_at is null and participation_activated_at is not null)<>148
    or (select count(*) from public.semifinal_eligibility where season_year='2026')<>148
    or (select count(*) from public.semifinal_eligibility where season_year='2026' and status='eligible')<>148 then
    raise exception 'Approved 148-participant population differs';
  end if;
  if exists(select 1 from public.profiles p left join public.semifinal_eligibility e
    on e.profile_id=p.id and e.season_year='2026'
    where p.role='participant' and p.archived_at is null and p.participation_activated_at is not null
    and (e.status is distinct from 'eligible' or e.league is distinct from p.league
      or e.class_label is distinct from ((case when extract(year from age(s.age_cutoff_date,p.birth_date))<15 then 'U15'
        when extract(year from age(s.age_cutoff_date,p.birth_date))<40 then 'Ü15' else 'Ü40' end)||'-'||p.gender))) then
    raise exception 'Missing approval or changed participant class';
  end if;
  update public.admin_settings set finale_enabled=true,updated_at=statement_timestamp() where id=s.id;
end;
$$;
select jsonb_build_object('season_year',season_year,'finale_enabled',finale_enabled,
  'registration_deadline',finale_registration_deadline,'finale_date',finale_date,'updated_at',updated_at)
from public.admin_settings;
\if :apply
commit;
\else
rollback;
\endif
