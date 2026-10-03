-- Roll back the optional ranking-reader exception. Preserve scoring and DNS rules.
begin;
do $migration$
declare
  definition text := pg_get_functiondef('public.list_competition_standings(text)'::regprocedure);
  viewer_guard text := ' and not exists(select 1 from public.competition_rankings_viewers rv join public.profiles p on p.id=rv.profile_id where rv.event_id=v_event.id and rv.profile_id=auth.uid() and p.archived_at is null)';
begin
  if (length(definition) - length(replace(definition, viewer_guard, ''))) / length(viewer_guard) <> 1 then
    raise exception 'Unexpected ranking viewer guard: rollback not applied';
  end if;
  execute replace(definition, viewer_guard, '');
end;
$migration$;
delete from public.competition_rankings_viewers rv
using public.profiles p, public.competition_day_events e
where p.id=rv.profile_id and e.id=rv.event_id
  and p.id='2e0f2267-a72c-4ece-8ca5-a3ce94520ab8'
  and lower(p.email)='info@moonsight.media' and e.season_year='2026';
commit;
