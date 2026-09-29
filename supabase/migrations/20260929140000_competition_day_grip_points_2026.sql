begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- The physical grip labels are 10, 20, ..., 100, and now award the same
-- number of points. Do not retroactively change an opened competition or
-- overwrite real results without a separate, audited migration.
do $$
declare v_event public.competition_day_events;
begin
  select * into v_event from public.competition_day_events
    where season_year = '2026' for update;
  if v_event.id is null then
    raise exception '2026 competition event missing; refusing score change';
  end if;
  if v_event.phase <> 'draft' or v_event.opened_at is not null then
    raise exception '2026 competition already opened; refusing score change';
  end if;
  if v_event.flash_bonus <> 0 or v_event.zone_points not in (
    '[0,0,0,0,0,0,0,0,0,0,0]'::jsonb,
    '[0,1,2,3,4,5,6,7,8,9,10]'::jsonb,
    '[0,10,20,30,40,50,60,70,80,90,100]'::jsonb
  ) then
    raise exception '2026 scoring has unexpected values; refusing overwrite';
  end if;
  if exists (select 1 from public.competition_day_results where event_id = v_event.id) then
    raise exception '2026 competition has results; manual audited conversion required';
  end if;
  update public.competition_day_events
    set zone_points = '[0,10,20,30,40,50,60,70,80,90,100]'::jsonb,
        updated_at = statement_timestamp()
    where id = v_event.id;
end;
$$;

-- Reject stale clients that try to save the former 1–10 point scale later.
alter table public.competition_day_events
  add constraint competition_day_2026_grip_points
  check (season_year <> '2026' or zone_points = '[0,10,20,30,40,50,60,70,80,90,100]'::jsonb);

commit;
