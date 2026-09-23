-- One-time operation: create only 14 numbered 2026 route placeholders.
-- No class assignments, points, staff, results or phase opening.
-- Default is a rollback preview. Pass psql -v apply=true to commit.
\if :{?apply}
\else
\set apply false
\endif
begin read write;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local request.jwt.claims = '{"role":"service_role"}';

do $$
declare v_event uuid;
begin
  perform 1 from public.admin_settings where season_year='2026' for share;
  if not found then raise exception 'Expected active 2026 season'; end if;
  if exists(select 1 from public.competition_day_events where season_year='2026') then
    raise exception '2026 competition event already exists; refusing to overwrite';
  end if;
  insert into public.competition_day_events(season_year,zone_points)
    values('2026','[0,0,0,0,0,0,0,0,0,0,0]'::jsonb)
    returning id into v_event;
  insert into public.competition_day_routes(event_id,route_number,name,grade,color)
    select v_event,n,'Route '||n,'','' from generate_series(1,14) n;
  if (select count(*) from public.competition_day_routes where event_id=v_event)<>14
    or exists(select 1 from public.competition_day_classes where event_id=v_event)
    or exists(select 1 from public.competition_day_results where event_id=v_event)
    or not exists(select 1 from public.competition_day_events where id=v_event and phase='draft' and opened_at is null) then
    raise exception 'Draft verification failed';
  end if;
end; $$;

select jsonb_build_object('season','2026','phase',e.phase,'routes',count(r.id),
  'number_min',min(r.route_number),'number_max',max(r.route_number),
  'classes',(select count(*) from public.competition_day_classes where event_id=e.id),
  'results',(select count(*) from public.competition_day_results where event_id=e.id),
  'opened_at',e.opened_at)
from public.competition_day_events e join public.competition_day_routes r on r.event_id=e.id
where e.season_year='2026' group by e.id;
\if :apply
commit;
\else
rollback;
\endif
