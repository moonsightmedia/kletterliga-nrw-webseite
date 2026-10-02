-- Event-specific cutoff: 3 October 2026, 16:00 Europe/Berlin (14:00 UTC).
-- Every read/write checks the server clock. No open browser or scheduled job is required.
-- Rejected late submissions roll back the phase update but can never insert results.
begin;
set local lock_timeout = '5s';
alter table public.competition_day_events add column submission_deadline_at timestamptz;
update public.competition_day_events set submission_deadline_at='2026-10-03 16:00:00+02'
where season_year='2026';

create function public.default_competition_semifinal_deadline()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.season_year='2026' and new.submission_deadline_at is null then
    new.submission_deadline_at:='2026-10-03 16:00:00+02'::timestamptz;
  end if;
  return new;
end $$;
create trigger default_competition_semifinal_deadline before insert on public.competition_day_events
for each row execute function public.default_competition_semifinal_deadline();

create function public.close_expired_competition_semifinal(p_season text)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.competition_day_events set phase='closed',updated_at=clock_timestamp()
  where season_year=p_season and phase='open' and submission_deadline_at<=clock_timestamp();
end $$;
revoke all on function public.close_expired_competition_semifinal(text),public.default_competition_semifinal_deadline() from public,anon,authenticated;

-- Recheck immediately before an insert, even if a request waited on a lock
-- or crossed the cutoff after its first RPC validation. Admin aftercare remains allowed.
create function public.guard_competition_semifinal_deadline()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.is_league_admin() and exists (
    select 1 from public.competition_day_events where id=new.event_id
    and submission_deadline_at<=clock_timestamp()
  ) then
    raise exception using errcode='42501',message='COMPETITION_DEADLINE_REACHED';
  end if;
  return new;
end $$;
create trigger guard_competition_semifinal_deadline before insert on public.competition_day_results
for each row execute function public.guard_competition_semifinal_deadline();
revoke all on function public.guard_competition_semifinal_deadline() from public,anon,authenticated;

create or replace function public.get_competition_day(p_season text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_elig public.semifinal_eligibility;
  v_staff boolean := false; v_admin boolean := false; v_ok boolean := false;
begin
  perform public.close_expired_competition_semifinal(p_season);
  if auth.uid() is null then raise exception using errcode='42501', message='AUTHENTICATION_REQUIRED'; end if;
  v_admin := public.is_league_admin();
  select * into v_event from public.competition_day_events where season_year=p_season;
  select * into v_elig from public.semifinal_eligibility where season_year=p_season and profile_id=auth.uid();
  v_staff := exists(select 1 from public.competition_day_staff s join public.profiles p on p.id=s.profile_id
    where s.event_id=v_event.id and s.profile_id=auth.uid() and p.archived_at is null);
  v_ok := exists(select 1 from public.profiles p join public.finale_registrations r on r.profile_id=p.id
    join public.semifinal_eligibility e on e.profile_id=p.id and e.season_year=r.season_year
    where p.id=auth.uid() and p.role='participant' and p.participation_activated_at is not null
      and p.archived_at is null and r.season_year=p_season and r.registration_status='registered'
      and e.status='eligible' and e.league is not null and e.class_label is not null);
  return jsonb_build_object(
    'event', case when v_event.id is null then null else jsonb_build_object('id',v_event.id,'season_year',v_event.season_year,'phase',v_event.phase,'zone_points',v_event.zone_points,'flash_bonus',v_event.flash_bonus,'opened_at',v_event.opened_at,'submission_deadline_at',v_event.submission_deadline_at) end,
    'eligible',v_ok,'league',case when v_ok then v_elig.league else null end,'class_label',case when v_ok then v_elig.class_label else null end,
    'routes',case when v_admin then coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'number',r.route_number,'name',r.name,'grade',r.grade,'color',r.color) order by r.route_number)
      from public.competition_day_routes r where r.event_id=v_event.id),'[]'::jsonb)
      when v_ok then coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'number',r.route_number,'name',r.name,'grade',r.grade,'color',r.color) order by r.route_number)
      from public.competition_day_class_routes cr join public.competition_day_classes c on c.id=cr.class_id
      join public.competition_day_routes r on r.id=cr.route_id where c.event_id=v_event.id and c.league=v_elig.league and c.class_label=v_elig.class_label), '[]'::jsonb)
      else '[]'::jsonb end,
    'results',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'route_id',x.route_id,'profile_id',x.profile_id,'zone',x.zone,'flash',x.flash,'points',x.points,'created_at',x.created_at) order by x.created_at)
      from public.competition_day_results x where x.event_id=v_event.id and (x.profile_id=auth.uid() or v_admin)), '[]'::jsonb),
    'is_staff',v_staff,'is_admin',v_admin);
end; $$;

create or replace function public.get_competition_judge_routes(p_season text, p_password text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_access public.competition_day_judge_access;
begin
  perform public.close_expired_competition_semifinal(p_season);
  -- A single generic failure avoids disclosing whether a season/code exists.
  if p_season is null or length(p_season) > 20 or p_password is null
    or p_password !~ '^[A-Za-z0-9]{24}$' then
    raise exception using errcode='42501', message='COMPETITION_JUDGE_PASSWORD_INVALID';
  end if;
  select * into v_event from public.competition_day_events where season_year=p_season;
  select * into v_access from public.competition_day_judge_access where event_id=v_event.id;
  if v_access.event_id is null or
    v_access.password_hash <> encode(sha256(convert_to(v_access.salt || p_password, 'UTF8')), 'hex') then
    raise exception using errcode='42501', message='COMPETITION_JUDGE_PASSWORD_INVALID';
  end if;
  return jsonb_build_object(
    'event', jsonb_build_object('id',v_event.id,'phase',v_event.phase,'submission_deadline_at',v_event.submission_deadline_at),
    'routes', coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'number',r.route_number,'name',r.name,'grade',r.grade,
      'color',r.color,'qr_token',r.qr_token) order by r.route_number)
      from public.competition_day_routes r where r.event_id=v_event.id), '[]'::jsonb));
end; $$;

create or replace function public.submit_competition_result(p_season text,p_route_id uuid,p_zone integer,p_flash boolean,p_qr_token text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_profile public.profiles; v_elig public.semifinal_eligibility; v_route public.competition_day_routes; v_points numeric; v_result public.competition_day_results;
begin
  perform public.close_expired_competition_semifinal(p_season);
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_event from public.competition_day_events where season_year=p_season for update;
  if v_event.submission_deadline_at <= clock_timestamp() then raise exception using errcode='42501',message='COMPETITION_DEADLINE_REACHED'; end if;
  if v_event.id is null or v_event.phase<>'open' then raise exception using errcode='42501',message='COMPETITION_NOT_OPEN'; end if;
  select * into v_profile from public.profiles where id=auth.uid();
  select * into v_elig from public.semifinal_eligibility where profile_id=auth.uid() and season_year=p_season;
  if v_profile.id is null or v_profile.role<>'participant' or v_profile.participation_activated_at is null or v_profile.archived_at is not null
    or v_elig.status is distinct from 'eligible' or not exists(select 1 from public.finale_registrations where profile_id=auth.uid() and season_year=p_season and registration_status='registered') then raise exception using errcode='42501',message='COMPETITION_NOT_ELIGIBLE'; end if;
  select r.* into v_route from public.competition_day_routes r join public.competition_day_class_routes cr on cr.route_id=r.id join public.competition_day_classes c on c.id=cr.class_id
    where r.id=p_route_id and r.event_id=v_event.id and c.event_id=v_event.id and c.league=v_elig.league and c.class_label=v_elig.class_label;
  if v_route.id is null or v_route.qr_token is distinct from p_qr_token then raise exception using errcode='42501',message='COMPETITION_QR_INVALID'; end if;
  if p_zone is null or p_flash is null or p_zone not between 0 and 10 or (p_flash and p_zone<>10) then raise exception 'Zone muss zwischen 0 und 10 liegen; Flash ist nur mit Zone 10 möglich.'; end if;
  v_points:=(v_event.zone_points->>p_zone)::numeric+case when p_flash then v_event.flash_bonus else 0 end;
  select * into v_result from public.competition_day_results where event_id=v_event.id and profile_id=auth.uid() and route_id=p_route_id;
  if v_result.id is not null then
    if v_result.zone=p_zone and v_result.flash=p_flash then return to_jsonb(v_result); end if;
    raise exception using errcode='23505',message='COMPETITION_RESULT_IMMUTABLE';
  end if;
  insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points) values(v_event.id,p_route_id,auth.uid(),p_zone,p_flash,v_points) returning * into v_result;
  return to_jsonb(v_result);
end; $$;

create or replace function public.set_competition_phase(p_season text,p_phase text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_need integer; v_bad integer;
begin
  perform public.close_expired_competition_semifinal(p_season);
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  if p_phase is null or p_phase not in ('open','closed') then raise exception 'Der Wettkampftag kann nur geöffnet oder geschlossen werden.'; end if;
  select * into v_event from public.competition_day_events where season_year=p_season for update;
  if v_event.id is null then raise exception 'Für diese Saison ist noch kein Wettkampftag konfiguriert.'; end if;
  if p_phase='open' then
    if v_event.submission_deadline_at <= clock_timestamp() then raise exception using errcode='42501',message='COMPETITION_DEADLINE_REACHED'; end if;
    select count(*) into v_need from (select distinct e.league,e.class_label from public.semifinal_eligibility e join public.finale_registrations f on f.profile_id=e.profile_id and f.season_year=e.season_year
      join public.profiles p on p.id=e.profile_id where e.season_year=p_season and e.status='eligible' and f.registration_status='registered'
      and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null) classes;
    select count(*) into v_bad from (select c.id from public.competition_day_classes c where c.event_id=v_event.id) c
      where (select count(*) from public.competition_day_class_routes cr where cr.class_id=c.id)<>5;
    if jsonb_array_length(v_event.zone_points)<>11 or (v_event.zone_points->>0)::numeric<>0 or (v_event.zone_points->>10)::numeric<=0
      or v_need=0 or (select count(*) from public.competition_day_routes where event_id=v_event.id) not between 5 and 30
      or (select count(*) from public.competition_day_classes where event_id=v_event.id)<v_need or v_bad>0 then
      raise exception 'Zum Öffnen fehlen Routen, gültige elf Zonenwerte oder die vollständigen Fünf-Routen-Zuordnungen für alle angemeldeten und freigegebenen Klassen.';
    end if;
    if exists(select 1 from (select distinct e.league,e.class_label from public.semifinal_eligibility e join public.finale_registrations f on f.profile_id=e.profile_id and f.season_year=e.season_year
      join public.profiles p on p.id=e.profile_id where e.season_year=p_season and e.status='eligible' and f.registration_status='registered'
      and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null) q where not exists(select 1 from public.competition_day_classes c where c.event_id=v_event.id and c.league=q.league and c.class_label=q.class_label)) then raise exception 'Eine aktive, angemeldete und freigegebene Klasse hat keine Routenzuordnung.'; end if;
    update public.competition_day_events set phase='open',opened_at=coalesce(opened_at,statement_timestamp()),updated_at=statement_timestamp() where id=v_event.id;
  else
    if v_event.phase<>'open' then raise exception 'Nur ein geöffneter Wettkampftag kann geschlossen werden.'; end if;
    update public.competition_day_events set phase='closed',updated_at=statement_timestamp() where id=v_event.id;
  end if;
end; $$;

create or replace function public.get_competition_final_admin(p_season text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events;
begin
  perform public.close_expired_competition_semifinal(p_season);
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season;
  if ev.id is null then return jsonb_build_object('phase','draft','classes','[]'::jsonb,'routes','[]'::jsonb,'semifinal','[]'::jsonb,'semifinal_results','[]'::jsonb,'stations','[]'::jsonb,'display',null,'notices','[]'::jsonb,'audit','[]'::jsonb,'semifinal_audit','[]'::jsonb); end if;
  return jsonb_build_object('phase',ev.phase,'submission_deadline_at',ev.submission_deadline_at,
    'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'league',c.league,'class_label',c.class_label,'route_id',c.route_id,'station_no',c.station_no,'phase',c.phase,'version',c.version,'published_at',c.published_at,'stale',c.semifinal_fingerprint is distinct from public.competition_final_fingerprint(ev.id,c.league,c.class_label),'entries',public.competition_final_rankings(c.id)) order by c.league,c.class_label) from public.competition_final_classes c where c.event_id=ev.id),'[]'::jsonb),
    'routes',coalesce((select jsonb_agg(to_jsonb(r) order by r.number) from public.competition_final_routes r where r.event_id=ev.id),'[]'::jsonb),
    'semifinal',coalesce((select jsonb_agg(jsonb_build_object('profile_id',q.profile_id,'name',q.name,'league',q.league,'class_label',q.class_label,'points',q.points,'completed',q.completed,'rank',q.rank,'excluded',q.excluded,'missing',q.missing) order by q.league,q.class_label,q.rank,q.name) from (select v.*,rank() over(partition by v.league,v.class_label order by v.points desc) rank from (select p.id profile_id,concat_ws(' ',p.first_name,p.last_name) name,e.league,e.class_label,coalesce(sum(x.points),0) points,count(x.id) completed,ex.status excluded,coalesce((select jsonb_agg(jsonb_build_object('route_id',cr.route_id,'number',r.route_number,'settled',st.route_id is not null) order by r.route_number) from public.competition_day_classes c join public.competition_day_class_routes cr on cr.class_id=c.id join public.competition_day_routes r on r.id=cr.route_id left join public.competition_day_results rx on rx.event_id=ev.id and rx.profile_id=p.id and rx.route_id=cr.route_id left join public.competition_semifinal_settlements st on st.event_id=ev.id and st.profile_id=p.id and st.route_id=cr.route_id where c.event_id=ev.id and c.league=e.league and c.class_label=e.class_label and rx.id is null),'[]'::jsonb) missing from public.semifinal_eligibility e join public.profiles p on p.id=e.profile_id join public.finale_registrations f on f.profile_id=p.id and f.season_year=e.season_year and f.registration_status='registered' left join public.competition_day_results x on x.event_id=ev.id and x.profile_id=p.id left join public.competition_final_exclusions ex on ex.event_id=ev.id and ex.profile_id=p.id where e.season_year=p_season and e.status='eligible' and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null group by p.id,p.first_name,p.last_name,e.league,e.class_label,ex.status) v) q),'[]'::jsonb),
    'semifinal_results',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'profile_id',x.profile_id,'route_number',r.route_number,'zone',x.zone,'points',x.points,'created_at',x.created_at) order by x.profile_id,r.route_number) from public.competition_day_results x join public.competition_day_routes r on r.id=x.route_id where x.event_id=ev.id),'[]'::jsonb),
    'stations',coalesce((select jsonb_agg(jsonb_build_object('station_no',station_no,'updated_at',updated_at) order by station_no) from public.competition_final_stations where event_id=ev.id),'[]'::jsonb),
    'display',(select to_jsonb(d) from public.competition_live_display d where event_id=ev.id),
    'notices',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.competition_live_notices n where event_id=ev.id),'[]'::jsonb),
    'audit',coalesce((select jsonb_agg(jsonb_build_object('entry_id',a.entry_id,'action',a.action,'reason',a.reason,'created_at',a.created_at,'actor',concat_ws(' ',p.first_name,p.last_name),'station_no',a.station_no,'before_data',a.before_data,'after_data',a.after_data) order by a.created_at desc) from public.competition_final_audit a left join public.profiles p on p.id=a.actor_id where a.event_id=ev.id),'[]'::jsonb),
    'semifinal_audit',coalesce((select jsonb_agg(jsonb_build_object('result_id',a.result_id,'reason',a.reason,'before_data',a.before_data,'after_data',a.after_data,'created_at',a.created_at,'actor',concat_ws(' ',p.first_name,p.last_name)) order by a.created_at desc) from public.competition_day_result_audit a join public.competition_day_results r on r.id=a.result_id left join public.profiles p on p.id=a.actor_profile_id where r.event_id=ev.id),'[]'::jsonb));
end $$;

create or replace function public.enter_competition_semifinal_result(p_season text,p_profile uuid,p_route uuid,p_zone integer,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; pts numeric; rid uuid;
begin
  perform public.close_expired_competition_semifinal(p_season);
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season for update;
  if ev.phase<>'closed' or p_zone not between 0 and 10 or length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Geschlossenes Halbfinale, Griff und Begründung sind erforderlich.'; end if;
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
  if ev.phase<>'closed' or length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Die Halbfinaleingabe muss geschlossen sein; eine Begründung ist erforderlich.'; end if;
  if not exists(select 1 from public.semifinal_eligibility e join public.competition_day_classes c on c.event_id=ev.id and c.league=e.league and c.class_label=e.class_label join public.competition_day_class_routes cr on cr.class_id=c.id and cr.route_id=p_route where e.profile_id=p_profile and e.season_year=p_season and e.status='eligible') then raise exception 'Person oder Route gehört nicht zu dieser Klasse.'; end if;
  if exists(select 1 from public.competition_day_results where event_id=ev.id and profile_id=p_profile and route_id=p_route) then raise exception 'Für diese Route ist bereits ein Ergebnis vorhanden.'; end if;
  insert into public.competition_semifinal_settlements(event_id,profile_id,route_id,reason,actor_id) values(ev.id,p_profile,p_route,btrim(p_reason),auth.uid())
    on conflict(event_id,profile_id,route_id) do update set reason=excluded.reason,actor_id=excluded.actor_id,created_at=statement_timestamp();
  insert into public.competition_final_audit(event_id,actor_id,action,after_data,reason) values(ev.id,auth.uid(),'semifinal_zero',jsonb_build_object('profile_id',p_profile,'route_id',p_route,'points',0),btrim(p_reason));
end $$;

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
  if exists(select 1 from public.semifinal_eligibility e join public.finale_registrations f on f.profile_id=e.profile_id and f.season_year=e.season_year and f.registration_status='registered' join public.profiles p on p.id=e.profile_id join public.competition_day_classes sc on sc.event_id=ev.id and sc.league=e.league and sc.class_label=e.class_label join public.competition_day_class_routes cr on cr.class_id=sc.id left join public.competition_day_results r on r.event_id=ev.id and r.profile_id=e.profile_id and r.route_id=cr.route_id left join public.competition_semifinal_settlements s on s.event_id=ev.id and s.profile_id=e.profile_id and s.route_id=cr.route_id where e.season_year=p_season and e.league=p_league and e.class_label=p_label and e.status='eligible' and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null and r.id is null and s.route_id is null) then raise exception 'Halbfinalergebnisse fehlen oder sind ungeklärt.'; end if;
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

create or replace function public.get_competition_live(p_season text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; d public.competition_live_display;
begin
  perform public.close_expired_competition_semifinal(p_season);
  select * into ev from public.competition_day_events where season_year=p_season;
  if ev.id is null then return jsonb_build_object('season',p_season,'phase','semifinal','pinned_key',null,'interval_seconds',15,'class_keys','[]'::jsonb,'semifinal_open',false,'classes','[]'::jsonb,'notices','[]'::jsonb,'updated_at',statement_timestamp()); end if;
  select * into d from public.competition_live_display where event_id=ev.id;
  return jsonb_build_object('season',p_season,'phase',coalesce(d.phase,'semifinal'),'pinned_key',d.pinned_key,'interval_seconds',coalesce(d.interval_seconds,15),'class_keys',coalesce(d.class_keys,'[]'::jsonb),'semifinal_deadline_at',ev.submission_deadline_at,'semifinal_open',ev.phase='open','updated_at',statement_timestamp(),
    'classes',case when ev.phase='draft' then '[]'::jsonb when coalesce(d.phase,'semifinal')='final' then public.get_competition_final_public(p_season)
    else coalesce((select jsonb_agg(jsonb_build_object('key',q.league||'|'||q.class_label,'league',q.league,'class_label',q.class_label,'entries',q.entries) order by q.league,q.class_label) from (select e.league,e.class_label,jsonb_agg(jsonb_build_object('name',e.name,'points',e.points,'completed',e.completed,'rank',e.rank) order by e.rank,e.name) entries from (select v.league,v.class_label,v.name,v.points,v.completed,rank() over(partition by v.league,v.class_label order by v.points desc) rank from (select el.league,el.class_label,concat_ws(' ',p.first_name,p.last_name) name,coalesce(sum(r.points),0) points,count(r.id) completed from public.semifinal_eligibility el join public.profiles p on p.id=el.profile_id join public.finale_registrations f on f.profile_id=p.id and f.season_year=el.season_year and f.registration_status='registered' left join public.competition_day_results r on r.event_id=ev.id and r.profile_id=p.id where el.season_year=p_season and el.status='eligible' and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null group by el.league,el.class_label,p.id,p.first_name,p.last_name) v) e group by e.league,e.class_label) q),'[]'::jsonb) end,
    'notices',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body,'show_app',show_app,'show_tv',show_tv,'fullscreen',fullscreen,'expires_at',expires_at) order by created_at desc) from public.competition_live_notices where event_id=ev.id and withdrawn_at is null and (expires_at is null or expires_at>statement_timestamp())),'[]'::jsonb));
end $$;

-- CREATE OR REPLACE preserves the existing restricted execute grants.
commit;
