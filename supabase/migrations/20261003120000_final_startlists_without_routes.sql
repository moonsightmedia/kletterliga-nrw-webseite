begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

-- A published start list may be used on paper before a digital route is assigned.
-- Keep the installed selection, absence/AW, locking, version and audit rules.
do $migration$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('public.publish_competition_final_class(text,text,text,uuid,smallint,integer)'::regprocedure);
  anchor:='  if p_station not in (1,2) or not exists(select 1 from public.competition_final_routes where id=p_route and event_id=ev.id) then raise exception ''Finalroute oder Station fehlt.''; end if;';
  if strpos(definition,anchor)=0 then raise exception 'Final start-list validation has changed; review before applying'; end if;
  definition:=replace(definition,anchor,$replacement$
  if (p_route is null) <> (p_station is null) then raise exception 'Route und Eingabegerät entweder gemeinsam angeben oder für Papierlisten freilassen.'; end if;
  if p_route is not null and (p_station not in (1,2) or not exists(select 1 from public.competition_final_routes where id=p_route and event_id=ev.id)) then raise exception 'Finalroute oder Station ist ungültig.'; end if;
  $replacement$);
  execute definition;

  -- A shared final password must not bypass the missing route's grip limit.
  definition:=pg_get_functiondef('public.submit_competition_final_attempt(text,smallint,text,uuid,uuid,integer,boolean,integer,integer,text)'::regprocedure);
  anchor:='  if c.phase<>''running'' then raise exception ''Finaleingabe ist nicht geöffnet.''; end if;';
  if strpos(definition,anchor)=0 then raise exception 'Final input validation has changed; review before applying'; end if;
  definition:=replace(definition,anchor,anchor || $replacement$
  if c.route_id is null or c.station_no is null then raise exception 'Diese Starterliste wird auf Papier geführt. Für digitale Ergebnisse ist eine Finalroute erforderlich.'; end if;
  $replacement$);
  execute definition;
end;
$migration$;
notify pgrst,'reload schema';
commit;
