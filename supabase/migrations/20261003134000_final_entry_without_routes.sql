begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

-- Paper determines the physical route. Without a digital route, grip numbers
-- are whole numbers 0..999; TOP is a separate outcome with canonical grip 0.
-- Preserve password verification, class locks, versions, retries and audit.
do $migration$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('public.submit_competition_final_attempt(text,smallint,text,uuid,uuid,integer,boolean,integer,integer,text)'::regprocedure);
  anchor:='  if c.route_id is null or c.station_no is null then raise exception ''Diese Starterliste wird auf Papier geführt. Für digitale Ergebnisse ist eine Finalroute erforderlich.''; end if;';
  if strpos(definition,anchor)=0 then raise exception 'Final entry guard changed; review required'; end if;
  definition:=replace(definition,anchor,'');
  anchor:='p_grip not between 0 and r.max_grip';
  if strpos(definition,anchor)=0 then raise exception 'Grip validation changed'; end if;
  definition:=replace(definition,anchor,'p_grip not between 0 and coalesce(r.max_grip,999)');
  anchor:='(p_top and p_grip<>r.max_grip)';
  if strpos(definition,anchor)=0 then raise exception 'TOP validation changed'; end if;
  definition:=replace(definition,anchor,'(p_top and p_grip<>coalesce(r.max_grip,0))');
  execute definition;

  definition:=pg_get_functiondef('public.set_competition_final_phase(uuid,text,integer,text)'::regprocedure);
  anchor:='  oldphase:=c.phase;';
  if strpos(definition,anchor)=0 then raise exception 'Phase transition changed'; end if;
  definition:=replace(definition,anchor,anchor || $guard$
  if p_phase='running' and not exists(select 1 from public.competition_final_access where event_id=c.event_id) then raise exception 'Finalpasswort zuerst einrichten.'; end if;
  if p_phase='running' and not exists(select 1 from public.competition_final_entries where class_id=c.id and status='ready') then raise exception 'Keine verfügbaren Starter.'; end if;
  $guard$);
  execute definition;
end $migration$;
notify pgrst,'reload schema';
commit;
