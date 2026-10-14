-- Operator approved: remove ALL survey responses, including withdrawal receipts,
-- by 31 March 2027. This targets only the new ideas survey, never season feedback.
begin;
create or replace function public.ideas_survey_2027_is_open()
returns boolean language sql stable set search_path = public, pg_temp as $$
 select current_timestamp < timestamptz '2027-03-31 20:00:00+00';
$$;
revoke all on function public.ideas_survey_2027_is_open() from public, anon, authenticated;
grant execute on function public.ideas_survey_2027_is_open() to service_role;

create or replace function public.purge_ideas_survey_2027()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare removed integer := 0;
begin
 if not public.ideas_survey_2027_is_open() then
  delete from public.ideas_survey_2027;
  get diagnostics removed = row_count;
 end if;
 return removed;
end;
$$;
revoke all on function public.purge_ideas_survey_2027() from public, anon, authenticated;
grant execute on function public.purge_ideas_survey_2027() to service_role;
comment on function public.purge_ideas_survey_2027() is
 'No-op before approved expiry, then permanently removes only 2027 ideas responses including tombstones. Run after any backup restore before re-enabling application access.';

-- Production scheduling. PGlite tests exercise the functions above separately.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('ideas-survey-2027-retention', '0 * * * *',
 'select public.purge_ideas_survey_2027();');
commit;
