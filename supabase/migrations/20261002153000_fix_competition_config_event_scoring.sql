begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- INSERT constraints run before ON CONFLICT. The candidate event must already
-- have valid scoring even when this season's event exists. Keep all existing
-- authorization, validation, locking, route-ID and QR preservation logic.
do $$
declare
  v_definition text;
  v_old text := 'insert into public.competition_day_events(season_year) values(p_season) on conflict(season_year) do nothing;';
  v_new text := 'insert into public.competition_day_events(season_year, zone_points, flash_bonus) values(p_season, v_points, v_flash) on conflict(season_year) do nothing;';
begin
  v_definition := pg_get_functiondef('public.save_competition_config(text,jsonb)'::regprocedure);
  if position(v_old in v_definition) > 0 then
    execute replace(v_definition, v_old, v_new);
  elsif position(v_new in v_definition) = 0 then
    raise exception 'Unexpected save_competition_config definition; refusing to replace unrelated logic';
  end if;
end;
$$;

-- The route-only draft has the same INSERT-before-conflict problem. For 2026
-- use the established grip-point scale; other seasons keep their draft scale.
do $$
declare
  v_definition text;
  v_old text := $old$values(p_season, '[0,0,0,0,0,0,0,0,0,0,0]'::jsonb)$old$;
  v_new text := $new$values(p_season, case when p_season = '2026' then '[0,10,20,30,40,50,60,70,80,90,100]'::jsonb else '[0,0,0,0,0,0,0,0,0,0,0]'::jsonb end)$new$;
begin
  v_definition := pg_get_functiondef('public.save_competition_route_draft(text,jsonb)'::regprocedure);
  if position(v_old in v_definition) > 0 then
    execute replace(v_definition, v_old, v_new);
  elsif position(v_new in v_definition) = 0 then
    raise exception 'Unexpected save_competition_route_draft definition; refusing to replace unrelated logic';
  end if;
end;
$$;

commit;
