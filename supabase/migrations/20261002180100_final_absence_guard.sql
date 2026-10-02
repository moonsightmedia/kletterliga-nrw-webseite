-- Explicit no-shows/withdrawals cannot compete and require no invented zero results.
-- Unresolved expected/arrived participants still block final publication.
begin;
set local lock_timeout='5s';

create or replace function public.publish_competition_final_class(p_season text,p_league text,p_label text,p_route uuid,p_station smallint,p_expected_version integer)
returns void language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; c public.competition_final_classes; n integer; cut numeric; prior jsonb;
begin
  perform public.close_expired_competition_semifinal(p_season);
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season for update;
  if ev.phase<>'closed' then raise exception 'Halbfinaleingabe zuerst schließen.'; end if;
  if p_station not in (1,2) or not exists(select 1 from public.competition_final_routes where id=p_route and event_id=ev.id) then raise exception 'Finalroute oder Station fehlt.'; end if;
  insert into public.competition_final_classes(event_id,league,class_label) values(ev.id,p_league,p_label) on conflict(event_id,league,class_label) do nothing;
  select * into c from public.competition_final_classes where event_id=ev.id and league=p_league and class_label=p_label for update;
  if c.version is distinct from p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
  if c.phase in ('running','review','final') then raise exception 'Die Klasse hat bereits begonnen.'; end if;
  if exists(select 1 from public.semifinal_eligibility e join public.finale_registrations f on f.profile_id=e.profile_id and f.season_year=e.season_year and f.registration_status='registered' join public.profiles p on p.id=e.profile_id join public.competition_day_classes sc on sc.event_id=ev.id and sc.league=e.league and sc.class_label=e.class_label join public.competition_day_class_routes cr on cr.class_id=sc.id left join public.competition_day_results r on r.event_id=ev.id and r.profile_id=e.profile_id and r.route_id=cr.route_id left join public.competition_semifinal_settlements s on s.event_id=ev.id and s.profile_id=e.profile_id and s.route_id=cr.route_id where e.season_year=p_season and e.league=p_league and e.class_label=p_label and e.status='eligible' and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null and not exists(select 1 from public.competition_final_exclusions ex where ex.event_id=ev.id and ex.profile_id=e.profile_id and ex.status in ('dns','withdrawn')) and r.id is null and s.route_id is null) then raise exception 'Halbfinalergebnisse fehlen oder sind ungeklärt.'; end if;
  if exists(select 1 from public.competition_final_attempts a join public.competition_final_entries en on en.id=a.entry_id where en.class_id=c.id) then raise exception 'Ergebnisse vorhanden; Startliste kann nicht ersetzt werden.'; end if;
  prior:=jsonb_build_object('version',c.version,'entries',public.competition_final_rankings(c.id));
  delete from public.competition_final_entries where class_id=c.id;
  with scores as (select e.profile_id,coalesce(sum(r.points),0) points from public.semifinal_eligibility e join public.finale_registrations f on f.profile_id=e.profile_id and f.season_year=e.season_year and f.registration_status='registered' join public.profiles p on p.id=e.profile_id left join public.competition_day_results r on r.event_id=ev.id and r.profile_id=e.profile_id where e.season_year=p_season and e.league=p_league and e.class_label=p_label and e.status='eligible' and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null group by e.profile_id), ranked as (select s.*,rank() over(order by s.points desc) semifinal_rank from scores s), available as (select q.*,rank() over(order by q.points desc) selection_rank from ranked q where not exists(select 1 from public.competition_final_exclusions ex where ex.event_id=ev.id and ex.profile_id=q.profile_id)), ordered as (select q.*,row_number() over(order by q.semifinal_rank desc,p.last_name,p.first_name,q.profile_id) start_position from available q join public.profiles p on p.id=q.profile_id where q.selection_rank<=6)
    insert into public.competition_final_entries(class_id,profile_id,semifinal_rank,semifinal_points,start_position) select c.id,profile_id,semifinal_rank,points,start_position from ordered;
  get diagnostics n=row_count;
  if n=0 then raise exception 'Keine Finalstarter in dieser Klasse.'; end if;
  update public.competition_final_classes set route_id=p_route,station_no=p_station,phase='published',version=version+1,published_at=statement_timestamp(),updated_at=statement_timestamp(),semifinal_fingerprint=public.competition_final_fingerprint(ev.id,p_league,p_label) where id=c.id;
  insert into public.competition_final_audit(event_id,class_id,actor_id,action,before_data,after_data,reason) values(ev.id,c.id,auth.uid(),'publish',prior,jsonb_build_object('version',c.version+1,'entries',public.competition_final_rankings(c.id)),'Finalfeld bestätigt');
end $$;

-- CREATE OR REPLACE retains league-admin guarded authenticated execute grants.
commit;
