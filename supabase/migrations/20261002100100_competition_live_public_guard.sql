-- Keep preparation private; a started final retains its frozen semifinal ranks.
begin;

create or replace function public.get_competition_live(p_season text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; d public.competition_live_display;
begin
  select * into ev from public.competition_day_events where season_year=p_season;
  if ev.id is null then return jsonb_build_object('season',p_season,'phase','semifinal','pinned_key',null,'interval_seconds',15,'class_keys','[]'::jsonb,'semifinal_open',false,'classes','[]'::jsonb,'notices','[]'::jsonb,'updated_at',statement_timestamp()); end if;
  select * into d from public.competition_live_display where event_id=ev.id;
  return jsonb_build_object('season',p_season,'phase',coalesce(d.phase,'semifinal'),'pinned_key',d.pinned_key,'interval_seconds',coalesce(d.interval_seconds,15),'class_keys',coalesce(d.class_keys,'[]'::jsonb),'semifinal_open',ev.phase='open','updated_at',statement_timestamp(),
    'classes',case when ev.phase='draft' then '[]'::jsonb when coalesce(d.phase,'semifinal')='final' then public.get_competition_final_public(p_season)
    else coalesce((select jsonb_agg(jsonb_build_object('key',q.league||'|'||q.class_label,'league',q.league,'class_label',q.class_label,'entries',q.entries) order by q.league,q.class_label) from (select e.league,e.class_label,jsonb_agg(jsonb_build_object('name',e.name,'points',e.points,'completed',e.completed,'rank',e.rank) order by e.rank,e.name) entries from (select v.league,v.class_label,v.name,v.points,v.completed,rank() over(partition by v.league,v.class_label order by v.points desc) rank from (select el.league,el.class_label,concat_ws(' ',p.first_name,p.last_name) name,coalesce(sum(r.points),0) points,count(r.id) completed from public.semifinal_eligibility el join public.profiles p on p.id=el.profile_id join public.finale_registrations f on f.profile_id=p.id and f.season_year=el.season_year and f.registration_status='registered' left join public.competition_day_results r on r.event_id=ev.id and r.profile_id=p.id where el.season_year=p_season and el.status='eligible' and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null group by el.league,el.class_label,p.id,p.first_name,p.last_name) v) e group by e.league,e.class_label) q),'[]'::jsonb) end,
    'notices',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body,'show_app',show_app,'show_tv',show_tv,'fullscreen',fullscreen,'expires_at',expires_at) order by created_at desc) from public.competition_live_notices where event_id=ev.id and withdrawn_at is null and (expires_at is null or expires_at>statement_timestamp())),'[]'::jsonb));
end $$;

create or replace function public.set_competition_final_phase(p_class uuid,p_phase text,p_expected_version integer,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; oldphase text;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into c from public.competition_final_classes where id=p_class for update;
  if c.id is null or c.version is distinct from p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
  oldphase:=c.phase;
  if not ((oldphase='published' and p_phase='running') or (oldphase='running' and p_phase='review') or (oldphase='review' and p_phase='running' and length(btrim(coalesce(p_reason,''))) between 1 and 500) or (oldphase='review' and p_phase='final') or (oldphase='final' and p_phase='review' and length(btrim(coalesce(p_reason,''))) between 1 and 500)) then raise exception 'Dieser Klassenwechsel ist nicht zulässig.'; end if;
  if oldphase='published' and p_phase='running' and c.semifinal_fingerprint is distinct from public.competition_final_fingerprint(c.event_id,c.league,c.class_label) then raise exception 'Die Halbfinalwertung hat sich seit der Finalfreigabe geändert.'; end if;
  if p_phase='final' and exists(select 1 from public.competition_final_entries en left join public.competition_final_attempts a on a.entry_id=en.id and a.counted where en.class_id=c.id and (en.status='incident' or (en.status='ready' and (a.id is null or en.checked_at is null)))) then raise exception 'Ergebnisse oder Papierabgleich fehlen.'; end if;
  update public.competition_final_classes set phase=p_phase,version=version+1,updated_at=statement_timestamp() where id=c.id;
  insert into public.competition_final_audit(event_id,class_id,actor_id,action,before_data,after_data,reason) values(c.event_id,c.id,auth.uid(),'phase',jsonb_build_object('phase',oldphase),jsonb_build_object('phase',p_phase),coalesce(nullif(btrim(p_reason),''),'Klassenstatus geändert'));
end $$;

-- NULL expected versions must not bypass optimistic concurrency checks.
create or replace function public.publish_competition_final_class(p_season text,p_league text,p_label text,p_route uuid,p_station smallint,p_expected_version integer)
returns void language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; c public.competition_final_classes; n integer; cut numeric; prior jsonb;
begin
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

create or replace function public.move_competition_final_entry(p_entry uuid,p_position integer,p_expected_version integer)
returns void language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; ev uuid; oldpos integer; n integer;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select fc.* into c from public.competition_final_classes fc join public.competition_final_entries en on en.class_id=fc.id where en.id=p_entry for update of fc;
  if c.id is null or c.version is distinct from p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
  if c.phase not in ('published','running') then raise exception 'Startreihenfolge ist jetzt gesperrt.'; end if;
  select start_position into oldpos from public.competition_final_entries where id=p_entry;
  select count(*) into n from public.competition_final_entries where class_id=c.id;
  if p_position not between 1 and n then raise exception 'Ungültige Startposition.'; end if;
  if c.phase='running' and (exists(select 1 from public.competition_final_attempts a join public.competition_final_entries en on en.id=a.entry_id where en.class_id=c.id and en.start_position between least(oldpos,p_position) and greatest(oldpos,p_position)) or exists(select 1 from public.competition_final_entries en where en.class_id=c.id and en.status<>'ready' and en.start_position between least(oldpos,p_position) and greatest(oldpos,p_position))) then raise exception 'Bereits gestartete Personen dürfen nicht verschoben werden.'; end if;
  -- Deferrable uniqueness lets the entire reorder commit atomically.
  set constraints competition_final_entries_class_id_start_position_key deferred;
  if p_position<oldpos then update public.competition_final_entries set start_position=start_position+1 where class_id=c.id and start_position>=p_position and start_position<oldpos;
  elsif p_position>oldpos then update public.competition_final_entries set start_position=start_position-1 where class_id=c.id and start_position<=p_position and start_position>oldpos; end if;
  update public.competition_final_entries set start_position=p_position where id=p_entry;
  update public.competition_final_classes set version=version+1,published_at=statement_timestamp(),updated_at=statement_timestamp() where id=c.id;
  insert into public.competition_final_audit(event_id,class_id,entry_id,actor_id,action,before_data,after_data,reason) values(c.event_id,c.id,p_entry,auth.uid(),'move',jsonb_build_object('profile_id',(select profile_id from public.competition_final_entries where id=p_entry),'position',oldpos),jsonb_build_object('profile_id',(select profile_id from public.competition_final_entries where id=p_entry),'position',p_position),'Startreihenfolge geändert');
end $$;

create or replace function public.submit_competition_final_attempt(p_season text,p_station smallint,p_code text,p_entry uuid,p_request uuid,p_grip integer,p_top boolean,p_seconds integer,p_expected_version integer,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; en public.competition_final_entries; r public.competition_final_routes; old public.competition_final_attempts; s public.competition_final_stations; a public.competition_final_attempts;
begin
  if p_code is null or p_code !~ '^[A-Za-z0-9]{24}$' or p_station not in (1,2) then raise exception using errcode='42501',message='FINAL_STATION_INVALID'; end if;
  select fc.* into c from public.competition_final_classes fc join public.competition_final_entries e on e.class_id=fc.id join public.competition_day_events ev on ev.id=fc.event_id where e.id=p_entry and ev.season_year=p_season for update of fc;
  select * into s from public.competition_final_stations where event_id=c.event_id and station_no=p_station;
  if s.event_id is null or s.code_hash<>encode(sha256(convert_to(s.salt||p_code,'UTF8')),'hex') or c.station_no<>p_station then raise exception using errcode='42501',message='FINAL_STATION_INVALID'; end if;
  select * into a from public.competition_final_attempts where request_id=p_request and entry_id=p_entry;
  if a.id is not null then return to_jsonb(a); end if;
  if c.version is distinct from p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
  if c.phase<>'running' then raise exception 'Finaleingabe ist nicht geöffnet.'; end if;
  select * into en from public.competition_final_entries where id=p_entry for update;
  select * into r from public.competition_final_routes where id=c.route_id;
  if p_request is null or en.status<>'ready' or p_grip is null or p_grip not between 0 and r.max_grip or p_top is null or (p_top and p_grip<>r.max_grip) or p_seconds not between 0 and 300 then raise exception 'Griff, TOP, Zeit oder Startstatus ist ungültig.'; end if;
  select * into old from public.competition_final_attempts where entry_id=p_entry and counted for update;
  if old.id is not null and length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Für eine Änderung ist eine Begründung erforderlich.'; end if;
  if old.id is not null then update public.competition_final_attempts set counted=false where id=old.id; end if;
  insert into public.competition_final_attempts(entry_id,request_id,grip,is_top,seconds,station_no,reason) values(p_entry,p_request,p_grip,p_top,p_seconds,p_station,case when old.id is null then 'Papierliste übertragen' else btrim(p_reason) end) returning * into a;
  update public.competition_final_entries set checked_at=null,checked_by=null,updated_at=statement_timestamp() where id=p_entry;
  update public.competition_final_classes set version=version+1,updated_at=statement_timestamp() where id=c.id;
  insert into public.competition_final_audit(event_id,class_id,entry_id,station_no,action,before_data,after_data,reason) values(c.event_id,c.id,p_entry,p_station,case when old.id is null then 'submit' else 'correct' end,case when old.id is null then null else to_jsonb(old) end,to_jsonb(a),a.reason);
  return to_jsonb(a);
end $$;

create or replace function public.set_competition_final_entry_status(p_entry uuid,p_status text,p_reason text,p_expected_version integer)
returns void language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; en public.competition_final_entries;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select fc.* into c from public.competition_final_classes fc join public.competition_final_entries e on e.class_id=fc.id where e.id=p_entry for update of fc;
  if c.id is null or c.version is distinct from p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
  if c.phase not in ('published','running','review') or p_status not in ('ready','dns','incident') or length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Status oder Begründung ungültig.'; end if;
  select * into en from public.competition_final_entries where id=p_entry for update;
  if p_status='dns' and exists(select 1 from public.competition_final_attempts where entry_id=p_entry) then raise exception 'Eine bereits gestartete Person kann nicht als DNS markiert werden.'; end if;
  update public.competition_final_entries set status=p_status,status_reason=btrim(p_reason),checked_at=null,checked_by=null,updated_at=statement_timestamp() where id=p_entry;
  update public.competition_final_classes set version=version+1,updated_at=statement_timestamp() where id=c.id;
  insert into public.competition_final_audit(event_id,class_id,entry_id,actor_id,action,before_data,after_data,reason) values(c.event_id,c.id,p_entry,auth.uid(),'status',to_jsonb(en),jsonb_build_object('status',p_status),btrim(p_reason));
end $$;

create or replace function public.check_competition_final_entry(p_entry uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; en public.competition_final_entries;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select fc.* into c from public.competition_final_classes fc join public.competition_final_entries e on e.class_id=fc.id where e.id=p_entry for update of fc;
  if c.id is null or c.version is distinct from p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
  if c.phase not in ('running','review') then raise exception 'Papierabgleich ist jetzt nicht möglich.'; end if;
  select * into en from public.competition_final_entries where id=p_entry for update;
  if en.status='incident' or (en.status='ready' and not exists(select 1 from public.competition_final_attempts where entry_id=p_entry and counted)) then raise exception 'Ergebnis oder Zwischenfall ist noch ungeklärt.'; end if;
  update public.competition_final_entries set checked_at=statement_timestamp(),checked_by=auth.uid(),updated_at=statement_timestamp() where id=p_entry;
  update public.competition_final_classes set version=version+1,updated_at=statement_timestamp() where id=c.id;
  insert into public.competition_final_audit(event_id,class_id,entry_id,actor_id,action,before_data,after_data,reason) values(c.event_id,c.id,p_entry,auth.uid(),'paper_check',null,jsonb_build_object('checked_at',statement_timestamp()),'Papierliste abgeglichen');
end $$;

commit;
