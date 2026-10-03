begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

-- Keep the shared password check; preview classes do not publish a final field.
create or replace function public.get_competition_final_station_preview(p_season text,p_station smallint,p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev uuid;
begin
  if p_station is null or p_station not in (1,2) then raise exception using errcode='42501',message='FINAL_PASSWORD_INVALID'; end if;
  ev:=public.verify_competition_final_password(p_season,p_code);
  return jsonb_build_object('classes',coalesce((
    with visible as (
      select c.id,c.league,c.class_label,c.phase,c.version,c.route_id
      from public.competition_final_classes c
      where c.event_id=ev and c.phase in ('published','running','review')
      union all
      select coalesce(c.id,sc.id),sc.league,sc.class_label,'preparation',coalesce(c.version,0),null::uuid
      from public.competition_day_classes sc
      left join public.competition_final_classes c
        on c.event_id=sc.event_id and c.league=sc.league and c.class_label=sc.class_label
      where sc.event_id=ev and (c.id is null or c.phase='preparation')
    )
    select jsonb_agg(jsonb_build_object(
      'id',c.id,'league',c.league,'class_label',c.class_label,'phase',c.phase,'version',c.version,
      'route',case when r.id is null then null else jsonb_build_object('number',r.number,'name',r.name,'max_grip',r.max_grip) end,
      'entries',case when c.phase='preparation' then '[]'::jsonb else public.competition_final_rankings(c.id) end
    ) order by c.league,c.class_label)
    from visible c left join public.competition_final_routes r on r.id=c.route_id
  ),'[]'::jsonb));
end $$;

-- Preserve the legacy route-only response for phones opened before this release.
create or replace function public.get_competition_final_station(p_season text,p_station smallint,p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev uuid;
begin
  if p_station is null or p_station not in (1,2) then raise exception using errcode='42501',message='FINAL_PASSWORD_INVALID'; end if;
  ev:=public.verify_competition_final_password(p_season,p_code);
  return jsonb_build_object('classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'league',c.league,'class_label',c.class_label,'phase',c.phase,'version',c.version,'route',jsonb_build_object('number',r.number,'name',r.name,'max_grip',r.max_grip),'entries',public.competition_final_rankings(c.id)) order by c.league,c.class_label) from public.competition_final_classes c join public.competition_final_routes r on r.id=c.route_id where c.event_id=ev and c.phase in ('published','running','review')),'[]'::jsonb));
end $$;

revoke all on function public.get_competition_final_station_preview(text,smallint,text) from public,anon,authenticated;
grant execute on function public.get_competition_final_station_preview(text,smallint,text) to anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;