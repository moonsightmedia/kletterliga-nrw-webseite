begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

-- Preserve qualification documents; identify the exact final-day scoring stage.
alter table public.finale_certificates add column scoring_stage text not null default 'semifinal'
  check (scoring_stage in ('semifinal','final'));
do $migration$
declare definition text;
begin
  definition:=pg_get_functiondef('public.get_my_certificates(text)'::regprocedure);
  if strpos(definition,'''rank'', c.rank, ''issued_at'', v_published_at)')=0 then
    raise exception 'Unexpected personal certificate reader; no replacement applied';
  end if;
  execute replace(definition,'''rank'', c.rank, ''issued_at'', v_published_at)',
    '''rank'', c.rank, ''scoring_stage'', c.scoring_stage, ''issued_at'', v_published_at)');
end;
$migration$;

create or replace function public.publish_finale_certificates(p_season text)
returns jsonb language plpgsql security definer set search_path=public as $function$
declare v_event public.competition_day_events; v_date date; v_count integer;
begin
  if not public.is_league_admin() then
    raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED';
  end if;
  select * into v_event from public.competition_day_events where season_year=p_season for update;
  select finale_date into v_date from public.admin_settings where season_year=p_season
    order by updated_at desc nulls last,id desc limit 1;
  if v_event.id is null or v_event.phase<>'closed' or v_date is null or
    statement_timestamp()<(v_date::timestamp at time zone 'Europe/Berlin') then
    raise exception using errcode='23514',message='FINALE_NOT_READY';
  end if;
  -- Class locks are shared with score writers: a publication cannot race edits.
  perform id from public.competition_final_classes where event_id=v_event.id order by id for update;
  if not exists(select 1 from public.competition_final_classes where event_id=v_event.id)
    or exists(select 1 from public.competition_final_classes where event_id=v_event.id and phase<>'final')
    or exists(select 1 from public.competition_day_classes sc where sc.event_id=v_event.id
      and exists(select 1 from public.competition_semifinal_rows(v_event.id) s
        where s.league=sc.league and s.class_label=sc.class_label and s.completed_routes>0
          and not s.is_out_of_competition and s.excluded is distinct from 'dns')
      and not exists(select 1 from public.competition_final_classes fc where fc.event_id=v_event.id
        and fc.league=sc.league and fc.class_label=sc.class_label)) then
    raise exception using errcode='23514',message='FINAL_CLASSES_NOT_RELEASED';
  end if;
  if exists(select 1 from public.competition_final_entries en
    join public.competition_final_classes c on c.id=en.class_id
    left join public.competition_final_attempts a on a.entry_id=en.id and a.counted
    where c.event_id=v_event.id and (en.status='incident'
      or (en.status='ready' and (a.id is null or en.checked_at is null)))) then
    raise exception using errcode='23514',message='FINAL_RESULTS_NOT_REVIEWED';
  end if;
  insert into public.certificate_publications(season_year,published_by) values(p_season,auth.uid())
    on conflict(season_year) do update set published_at=statement_timestamp(),published_by=auth.uid(),
      revision=public.certificate_publications.revision+1;
  delete from public.finale_certificates where season_year=p_season;
  insert into public.finale_certificates(season_year,profile_id,display_name,league,class_label,rank,scoring_stage)
  with final_places as (
    select c.league,c.class_label,(r->>'profile_id')::uuid profile_id,(r->>'rank')::integer place
    from public.competition_final_classes c
      cross join lateral jsonb_array_elements(public.competition_final_rankings(c.id)) r
    where c.event_id=v_event.id and c.phase='final' and r->>'rank' is not null
  )
  select p_season,s.profile_id,trim(regexp_replace(s.name,'\s+',' ','g')),s.league,s.class_label,
    coalesce(f.place,s.rank)::integer,case when f.place is not null then 'final' else 'semifinal' end
  from public.competition_semifinal_rows(v_event.id) s
    left join final_places f on f.profile_id=s.profile_id and f.league=s.league and f.class_label=s.class_label
  where not s.is_out_of_competition and s.excluded is distinct from 'dns'
    and s.rank is not null and (s.completed_routes>0 or f.place is not null);
  get diagnostics v_count=row_count;
  if v_count=0 then raise exception using errcode='23514',message='FINALE_NO_RESULTS'; end if;
  return public.get_certificate_publication(p_season);
end;
$function$;

create or replace function public.get_certificate_publication(p_season text)
returns jsonb language plpgsql security definer set search_path=public as $function$
declare v_publication public.certificate_publications; v_count integer; v_needs_refresh boolean:=false;
begin
  if not public.is_league_admin() then
    raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED';
  end if;
  select * into v_publication from public.certificate_publications where season_year=p_season;
  select count(*) into v_count from public.finale_certificates where season_year=p_season;
  if v_publication.published_at is not null then
    select exists(select 1 from public.competition_day_results r join public.competition_day_events e on e.id=r.event_id
      where e.season_year=p_season and r.created_at>v_publication.published_at)
    or exists(select 1 from public.competition_day_result_audit a
      join public.competition_day_results r on r.id=a.result_id join public.competition_day_events e on e.id=r.event_id
      where e.season_year=p_season and a.created_at>v_publication.published_at)
    or exists(select 1 from public.competition_final_classes c join public.competition_day_events e on e.id=c.event_id
      where e.season_year=p_season and (c.phase<>'final' or c.updated_at>v_publication.published_at))
    or exists(select 1 from public.competition_final_audit a join public.competition_day_events e on e.id=a.event_id
      where e.season_year=p_season and a.created_at>v_publication.published_at)
    or exists(select 1 from public.competition_final_exclusions ex join public.competition_day_events e on e.id=ex.event_id
      where e.season_year=p_season and ex.created_at>v_publication.published_at)
    into v_needs_refresh;
  end if;
  return jsonb_build_object('published_at',v_publication.published_at,'revision',v_publication.revision,
    'certificate_count',v_count,'needs_refresh',v_needs_refresh);
end;
$function$;
revoke all on function public.publish_finale_certificates(text),public.get_certificate_publication(text) from public,anon;
grant execute on function public.publish_finale_certificates(text),public.get_certificate_publication(text) to authenticated;
commit;
