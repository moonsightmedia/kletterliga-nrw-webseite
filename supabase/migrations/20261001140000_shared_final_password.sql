-- One event password for both final-entry phones. Existing station numbers remain
-- entry-source labels in the audit; they no longer restrict the selectable class.
begin;
set local lock_timeout = '5s';
do $$ begin
  if to_regprocedure('extensions.crypt(text,text)') is null then
    raise exception 'The Supabase pgcrypto extension in extensions is required.';
  end if;
end $$;

create table public.competition_final_access (
  event_id uuid primary key references public.competition_day_events(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.competition_final_access enable row level security;
revoke all on public.competition_final_access from public,anon,authenticated;

create function public.set_competition_final_password(p_season text,p_password text)
returns void language plpgsql security definer set search_path=public as $$
declare ev uuid;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  if p_password is null or length(p_password)<12 or octet_length(p_password)>72 or p_password<>btrim(p_password) then
    raise exception 'Das Finalpasswort muss mindestens 12 Zeichen und höchstens 72 UTF-8-Bytes enthalten; keine äußeren Leerzeichen.';
  end if;
  select id into ev from public.competition_day_events where season_year=p_season for update;
  if ev is null then raise exception 'Wettkampftag fehlt.'; end if;
  insert into public.competition_final_access(event_id,password_hash)
    values(ev,extensions.crypt(p_password,extensions.gen_salt('bf',12)))
    on conflict(event_id) do update set password_hash=excluded.password_hash,updated_at=clock_timestamp();
  insert into public.competition_final_audit(event_id,actor_id,action,reason)
    values(ev,auth.uid(),'final_password_changed','Gemeinsames Finalpasswort geändert');
end $$;

-- Only callable by the protected RPCs. Holding a share lock until their transaction
-- completes ensures that password replacement and accepted writes cannot overlap.
create function public.verify_competition_final_password(p_season text,p_password text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_access public.competition_final_access;
begin
  if p_password is null or length(p_password)<12 or octet_length(p_password)>72 then
    raise exception using errcode='42501',message='FINAL_PASSWORD_INVALID';
  end if;
  select a.* into v_access from public.competition_final_access a
    join public.competition_day_events ev on ev.id=a.event_id
    where ev.season_year=p_season for share of a;
  if v_access.event_id is null or extensions.crypt(p_password,v_access.password_hash) is distinct from v_access.password_hash then
    raise exception using errcode='42501',message='FINAL_PASSWORD_INVALID';
  end if;
  return v_access.event_id;
end $$;
revoke all on function public.verify_competition_final_password(text,text),public.set_competition_final_password(text,text) from public,anon,authenticated;
grant execute on function public.set_competition_final_password(text,text) to authenticated;
-- Previous per-station passwords cannot be configured or used as a bypass.
revoke all on function public.set_competition_final_station(text,smallint,text) from public,anon,authenticated;

create or replace function public.get_competition_final_station(p_season text,p_station smallint,p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev uuid;
begin
  if p_station is null or p_station not in (1,2) then raise exception using errcode='42501',message='FINAL_PASSWORD_INVALID'; end if;
  ev:=public.verify_competition_final_password(p_season,p_code);
  return jsonb_build_object('classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'league',c.league,'class_label',c.class_label,'phase',c.phase,'version',c.version,'route',jsonb_build_object('number',r.number,'name',r.name,'max_grip',r.max_grip),'entries',public.competition_final_rankings(c.id)) order by c.league,c.class_label) from public.competition_final_classes c join public.competition_final_routes r on r.id=c.route_id where c.event_id=ev and c.phase in ('published','running','review')),'[]'::jsonb));
end $$;

create or replace function public.submit_competition_final_attempt(p_season text,p_station smallint,p_code text,p_entry uuid,p_request uuid,p_grip integer,p_top boolean,p_seconds integer,p_expected_version integer,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; en public.competition_final_entries; r public.competition_final_routes; old public.competition_final_attempts; ev uuid; a public.competition_final_attempts;
begin
  if p_station is null or p_station not in (1,2) then raise exception using errcode='42501',message='FINAL_PASSWORD_INVALID'; end if;
  select fc.* into c from public.competition_final_classes fc join public.competition_final_entries e on e.class_id=fc.id join public.competition_day_events ev on ev.id=fc.event_id where e.id=p_entry and ev.season_year=p_season for update of fc;
  ev:=public.verify_competition_final_password(p_season,p_code);
  if c.id is null or c.event_id is distinct from ev then raise exception using errcode='42501',message='FINAL_PASSWORD_INVALID'; end if;
  select * into a from public.competition_final_attempts where request_id=p_request and entry_id=p_entry;
  if a.id is not null then return to_jsonb(a); end if;
  if c.version is distinct from p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
  if c.phase<>'running' then raise exception 'Finaleingabe ist nicht geöffnet.'; end if;
  select * into en from public.competition_final_entries where id=p_entry for update;
  select * into r from public.competition_final_routes where id=c.route_id;
  if p_request is null or en.status<>'ready' or p_grip is null or p_grip not between 0 and r.max_grip or p_top is null or (p_top and p_grip<>r.max_grip) or p_seconds is null or p_seconds not between 0 and 300 then raise exception 'Griff, TOP, Zeit oder Startstatus ist ungültig.'; end if;
  select * into old from public.competition_final_attempts where entry_id=p_entry and counted for update;
  if old.id is not null and length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Für eine Änderung ist eine Begründung erforderlich.'; end if;
  if old.id is not null then update public.competition_final_attempts set counted=false where id=old.id; end if;
  insert into public.competition_final_attempts(entry_id,request_id,grip,is_top,seconds,station_no,reason) values(p_entry,p_request,p_grip,p_top,p_seconds,p_station,case when old.id is null then 'Papierliste übertragen' else btrim(p_reason) end) returning * into a;
  update public.competition_final_entries set checked_at=null,checked_by=null,updated_at=statement_timestamp() where id=p_entry;
  update public.competition_final_classes set version=version+1,updated_at=statement_timestamp() where id=c.id;
  insert into public.competition_final_audit(event_id,class_id,entry_id,station_no,action,before_data,after_data,reason) values(c.event_id,c.id,p_entry,p_station,case when old.id is null then 'submit' else 'correct' end,case when old.id is null then null else to_jsonb(old) end,to_jsonb(a),a.reason);
  return to_jsonb(a);
end $$;

create or replace function public.get_competition_final_admin(p_season text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events;
begin
  perform public.close_expired_competition_semifinal(p_season);
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season;
  if ev.id is null then return jsonb_build_object('phase','draft','classes','[]'::jsonb,'routes','[]'::jsonb,'semifinal','[]'::jsonb,'semifinal_results','[]'::jsonb,'stations','[]'::jsonb,'display',null,'notices','[]'::jsonb,'audit','[]'::jsonb,'semifinal_audit','[]'::jsonb); end if;
  return jsonb_build_object('phase',ev.phase,'final_password_set',exists(select 1 from public.competition_final_access where event_id=ev.id),'submission_deadline_at',ev.submission_deadline_at,
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

-- Existing reader/writer execute grants are preserved by CREATE OR REPLACE.
commit;
