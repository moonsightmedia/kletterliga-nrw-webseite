begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- A route-only draft must never invent class assignments or scoring.
create or replace function public.save_competition_route_draft(p_season text, p_routes jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_route jsonb; v_number integer;
begin
  if not public.is_league_admin() then raise exception using errcode='42501', message='LEAGUE_ADMIN_REQUIRED'; end if;
  if length(btrim(coalesce(p_season, ''))) not between 1 and 20 then raise exception 'Die Saisonangabe ist ungültig.'; end if;
  if not exists(select 1 from public.admin_settings where season_year=p_season) then raise exception 'Die Saison ist nicht aktiv.'; end if;
  if jsonb_typeof(p_routes) is distinct from 'array' then raise exception 'Routen müssen als Liste übergeben werden.'; end if;
  if jsonb_array_length(p_routes) not between 5 and 30 then raise exception 'Es werden 5 bis 30 Routen benötigt.'; end if;
  for v_route in select value from jsonb_array_elements(p_routes) loop
    if jsonb_typeof(v_route) is distinct from 'object'
      or jsonb_typeof(v_route->'number') is distinct from 'number'
      or coalesce(v_route->>'number','') !~ '^[0-9]+$'
      or jsonb_typeof(v_route->'name') is distinct from 'string'
      or jsonb_typeof(v_route->'grade') is distinct from 'string'
      or jsonb_typeof(v_route->'color') is distinct from 'string' then
      raise exception 'Jede Route benötigt Nummer, Name, Grad und Farbe.';
    end if;
    v_number := (v_route->>'number')::integer;
    if v_number not between 1 and 99 or length(btrim(v_route->>'name')) not between 1 and 100
      or length(v_route->>'grade')>40 or length(v_route->>'color')>40 then
      raise exception 'Ungültige Routennummer oder Routenangabe.';
    end if;
  end loop;
  if (select count(distinct (value->>'number')::integer) from jsonb_array_elements(p_routes))<>jsonb_array_length(p_routes) then
    raise exception 'Routennummern müssen eindeutig sein.';
  end if;

  insert into public.competition_day_events(season_year, zone_points)
    values(p_season, '[0,0,0,0,0,0,0,0,0,0,0]'::jsonb)
    on conflict(season_year) do nothing;
  select * into v_event from public.competition_day_events where season_year=p_season for update;
  if v_event.opened_at is not null then raise exception using errcode='42501', message='COMPETITION_CONFIG_LOCKED'; end if;
  if exists(select 1 from public.competition_day_classes where event_id=v_event.id)
    or exists(select 1 from public.competition_day_results where event_id=v_event.id)
    or exists(select 1 from public.competition_day_staff where event_id=v_event.id) then
    raise exception using errcode='42501', message='COMPETITION_DRAFT_ONLY';
  end if;
  for v_route in select value from jsonb_array_elements(p_routes) loop
    insert into public.competition_day_routes(event_id, route_number, name, grade, color)
      values(v_event.id, (v_route->>'number')::integer, btrim(v_route->>'name'), btrim(v_route->>'grade'), btrim(v_route->>'color'))
      on conflict(event_id, route_number) do update
        set name=excluded.name, grade=excluded.grade, color=excluded.color;
  end loop;
  delete from public.competition_day_routes r where r.event_id=v_event.id
    and not exists(select 1 from jsonb_array_elements(p_routes) x where (x->>'number')::integer=r.route_number);
  update public.competition_day_events set updated_at=statement_timestamp() where id=v_event.id;
end; $$;

revoke all on function public.save_competition_route_draft(text,jsonb) from public, anon;
grant execute on function public.save_competition_route_draft(text,jsonb) to authenticated;
commit;
