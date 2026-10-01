-- Participant-focused admin entry does not require closing the whole semifinal.
-- Admin entry/correction only; participant deadline remains enforced.
begin;
set local lock_timeout = '5s';

create or replace function public.enter_competition_semifinal_result(p_season text,p_profile uuid,p_route uuid,p_zone integer,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; pts numeric; rid uuid;
begin
  perform public.close_expired_competition_semifinal(p_season);
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season for update;
  if ev.id is null or ev.phase not in ('open','closed') or p_zone is null or p_zone not between 0 and 10 or length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Das Halbfinale muss eingerichtet sein; Griff und Begründung sind erforderlich.'; end if;
  if not exists(select 1 from public.semifinal_eligibility e join public.finale_registrations f on f.profile_id=e.profile_id and f.season_year=e.season_year and f.registration_status='registered' join public.competition_day_classes c on c.event_id=ev.id and c.league=e.league and c.class_label=e.class_label join public.competition_day_class_routes cr on cr.class_id=c.id and cr.route_id=p_route where e.profile_id=p_profile and e.season_year=p_season and e.status='eligible') then raise exception 'Person oder Route ist nicht startberechtigt.'; end if;
  pts:=(ev.zone_points->>p_zone)::numeric;
  insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points) values(ev.id,p_route,p_profile,p_zone,false,pts) returning id into rid;
  delete from public.competition_semifinal_settlements where event_id=ev.id and profile_id=p_profile and route_id=p_route;
  insert into public.competition_day_result_audit(result_id,actor_profile_id,reason,before_data,after_data) values(rid,auth.uid(),btrim(p_reason),'{}'::jsonb,jsonb_build_object('zone',p_zone,'points',pts));
end $$;

create or replace function public.settle_competition_semifinal(p_season text,p_profile uuid,p_route uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events;
begin
  perform public.close_expired_competition_semifinal(p_season);
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season for update;
  if ev.id is null or ev.phase not in ('open','closed') or length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Das Halbfinale muss eingerichtet sein; eine Begründung ist erforderlich.'; end if;
  if not exists(select 1 from public.semifinal_eligibility e join public.competition_day_classes c on c.event_id=ev.id and c.league=e.league and c.class_label=e.class_label join public.competition_day_class_routes cr on cr.class_id=c.id and cr.route_id=p_route where e.profile_id=p_profile and e.season_year=p_season and e.status='eligible') then raise exception 'Person oder Route gehört nicht zu dieser Klasse.'; end if;
  if exists(select 1 from public.competition_day_results where event_id=ev.id and profile_id=p_profile and route_id=p_route) then raise exception 'Für diese Route ist bereits ein Ergebnis vorhanden.'; end if;
  insert into public.competition_semifinal_settlements(event_id,profile_id,route_id,reason,actor_id) values(ev.id,p_profile,p_route,btrim(p_reason),auth.uid())
    on conflict(event_id,profile_id,route_id) do update set reason=excluded.reason,actor_id=excluded.actor_id,created_at=statement_timestamp();
  insert into public.competition_final_audit(event_id,actor_id,action,after_data,reason) values(ev.id,auth.uid(),'semifinal_zero',jsonb_build_object('profile_id',p_profile,'route_id',p_route,'points',0),btrim(p_reason));
end $$;

-- A guarded correction uses the value and latest audit timestamp observed by
-- the editor. Event/result locks keep the comparison and original audited RPC
-- in one transaction, rejecting a race after the browser's last refresh.
create function public.correct_competition_semifinal_result(
  p_result_id uuid,p_zone integer,p_reason text,
  p_expected_zone integer,p_expected_points numeric,p_expected_changed_at timestamptz
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_event uuid; v_result public.competition_day_results; v_changed_at timestamptz;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select e.id into v_event from public.competition_day_events e
    join public.competition_day_results r on r.event_id=e.id
    where r.id=p_result_id for update of e;
  if v_event is null then raise exception 'Das Ergebnis wurde nicht gefunden.'; end if;
  select * into v_result from public.competition_day_results where id=p_result_id for update;
  select max(created_at) into v_changed_at from public.competition_day_result_audit where result_id=p_result_id;
  if v_result.zone is distinct from p_expected_zone or v_result.points is distinct from p_expected_points
    or v_changed_at is distinct from p_expected_changed_at then
    raise exception using errcode='40001',message='COMPETITION_VERSION_CONFLICT';
  end if;
  return public.correct_competition_result(p_result_id,p_zone,false,p_reason);
end $$;
revoke all on function public.correct_competition_semifinal_result(uuid,integer,text,integer,numeric,timestamptz) from public,anon;
grant execute on function public.correct_competition_semifinal_result(uuid,integer,text,integer,numeric,timestamptz) to authenticated;

-- CREATE OR REPLACE preserves the existing authenticated-only grants.
commit;
