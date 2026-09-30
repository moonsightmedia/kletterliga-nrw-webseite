begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- The semifinal event and its draft/open/closed lifecycle are left intact.
create table public.competition_final_routes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  number integer not null check (number between 1 and 99),
  name text not null check (length(btrim(name)) between 1 and 100),
  max_grip integer not null check (max_grip between 1 and 999),
  unique(event_id,number), unique(event_id,id)
);
create table public.competition_final_classes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  league text not null check (league in ('toprope','lead')),
  class_label text not null,
  route_id uuid,
  station_no smallint check (station_no in (1,2)),
  phase text not null default 'preparation' check (phase in ('preparation','published','running','review','final')),
  version integer not null default 0,
  semifinal_fingerprint text,
  published_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  unique(event_id,league,class_label), unique(event_id,id),
  foreign key(event_id,route_id) references public.competition_final_routes(event_id,id)
);
create table public.competition_final_exclusions (
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  status text not null check (status in ('dns','withdrawn')),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default statement_timestamp(),
  primary key(event_id,profile_id)
);
create table public.competition_semifinal_settlements (
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  route_id uuid not null,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default statement_timestamp(),
  primary key(event_id,profile_id,route_id),
  foreign key(event_id,route_id) references public.competition_day_routes(event_id,id)
);
create table public.competition_final_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.competition_final_classes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  semifinal_rank integer not null check (semifinal_rank > 0),
  semifinal_points numeric not null,
  start_position integer not null check (start_position > 0),
  status text not null default 'ready' check (status in ('ready','dns','incident')),
  status_reason text,
  checked_at timestamptz,
  checked_by uuid references public.profiles(id),
  updated_at timestamptz not null default statement_timestamp(),
  unique(class_id,profile_id), unique(class_id,start_position)
);
create table public.competition_final_attempts (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.competition_final_entries(id) on delete cascade,
  request_id uuid not null unique,
  grip integer not null check (grip >= 0),
  is_top boolean not null default false,
  seconds integer not null check (seconds between 0 and 300),
  counted boolean not null default true,
  station_no smallint check (station_no in (1,2)),
  actor_id uuid references public.profiles(id),
  reason text not null,
  created_at timestamptz not null default statement_timestamp()
);
create unique index competition_final_one_counted_attempt on public.competition_final_attempts(entry_id) where counted;
create table public.competition_final_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  class_id uuid references public.competition_final_classes(id),
  entry_id uuid references public.competition_final_entries(id) on delete set null,
  actor_id uuid references public.profiles(id),
  station_no smallint,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  reason text not null,
  created_at timestamptz not null default statement_timestamp()
);
create table public.competition_final_stations (
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  station_no smallint not null check (station_no in (1,2)),
  salt text not null,
  code_hash text not null,
  updated_at timestamptz not null default statement_timestamp(),
  primary key(event_id,station_no)
);
create table public.competition_live_display (
  event_id uuid primary key references public.competition_day_events(id) on delete cascade,
  phase text not null default 'semifinal' check (phase in ('semifinal','final')),
  class_keys jsonb not null default '[]'::jsonb check (jsonb_typeof(class_keys)='array'),
  pinned_key text,
  interval_seconds integer not null default 15 check (interval_seconds between 5 and 120),
  updated_at timestamptz not null default statement_timestamp()
);
create table public.competition_live_notices (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 100),
  body text not null check (length(btrim(body)) between 1 and 500),
  show_app boolean not null,
  show_tv boolean not null,
  fullscreen boolean not null default false,
  expires_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

do $$ declare t text; begin
  foreach t in array array['competition_final_routes','competition_final_classes','competition_final_exclusions',
    'competition_semifinal_settlements','competition_final_entries','competition_final_attempts',
    'competition_final_audit','competition_final_stations','competition_live_display','competition_live_notices'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
  end loop;
end $$;

create function public.competition_final_fingerprint(p_event uuid,p_league text,p_label text)
returns text language sql stable security definer set search_path=public as $$
  select md5(coalesce(string_agg(concat_ws(':',p.id,coalesce(sum_result.points,0),coalesce(sum_result.n,0),
      coalesce(sum_result.z,0),coalesce(ex.status,'')), '|' order by p.id::text),'') || ':' ||
      (select count(*)::text from public.competition_day_result_audit a
        join public.competition_day_results r on r.id=a.result_id
        join public.semifinal_eligibility ae on ae.profile_id=r.profile_id
        where r.event_id=p_event and ae.season_year=(select season_year from public.competition_day_events where id=p_event)
          and ae.league=p_league and ae.class_label=p_label) || ':' ||
      (select count(*)::text from public.competition_semifinal_settlements s
        join public.semifinal_eligibility se on se.profile_id=s.profile_id
        where s.event_id=p_event and se.season_year=(select season_year from public.competition_day_events where id=p_event)
          and se.league=p_league and se.class_label=p_label))
  from public.semifinal_eligibility e
  join public.profiles p on p.id=e.profile_id
  join public.finale_registrations f on f.profile_id=p.id and f.season_year=e.season_year and f.registration_status='registered'
  left join lateral (select sum(r.points) points,count(*) n,sum(r.zone) z from public.competition_day_results r where r.event_id=p_event and r.profile_id=p.id) sum_result on true
  left join public.competition_final_exclusions ex on ex.event_id=p_event and ex.profile_id=p.id
  where e.league=p_league and e.class_label=p_label and e.status='eligible'
    and e.season_year=(select season_year from public.competition_day_events where id=p_event)
    and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null;
$$;

-- The function is reused by every public and private reader; no client calculates official ranks.
create function public.competition_final_rankings(p_class uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(to_jsonb(q) order by q.rank nulls last,q.start_position),'[]'::jsonb)
  from (
    select x.*,
      case when x.status='ready' and x.attempt_id is not null then
        rank() over(order by (x.status='ready' and x.attempt_id is not null) desc,
          x.is_top desc,x.grip desc,x.semifinal_rank asc,x.seconds asc)
      else null end as rank
    from (
      select en.id as entry_id,en.profile_id,concat_ws(' ',p.first_name,p.last_name) as name,
        en.semifinal_rank,en.semifinal_points,en.start_position,en.status,en.checked_at,
        a.id as attempt_id,a.is_top,a.grip,a.seconds,a.created_at as entered_at
      from public.competition_final_entries en join public.profiles p on p.id=en.profile_id
      left join public.competition_final_attempts a on a.entry_id=en.id and a.counted
      where en.class_id=p_class
    ) x
  ) q;
$$;

create function public.competition_final_public_rankings(p_class uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('name',x->>'name','rank',(x->>'rank')::integer,
    'semifinal_rank',(x->>'semifinal_rank')::integer,'start_position',(x->>'start_position')::integer,
    'status',x->>'status','is_top',(x->>'is_top')::boolean,'grip',(x->>'grip')::integer,
    'seconds',(x->>'seconds')::integer,'has_result',x->>'attempt_id' is not null)
    order by (x->>'rank')::integer nulls last,(x->>'start_position')::integer),'[]'::jsonb)
  from jsonb_array_elements(public.competition_final_rankings(p_class)) x;
$$;

create function public.get_competition_final_public(p_season text)
returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('key',c.league||'|'||c.class_label,'league',c.league,
    'class_label',c.class_label,'phase',c.phase,'entries',public.competition_final_public_rankings(c.id))
    order by c.league,c.class_label),'[]'::jsonb)
  from public.competition_final_classes c join public.competition_day_events ev on ev.id=c.event_id
  where ev.season_year=p_season and c.phase<>'preparation';
$$;

create function public.get_competition_final_admin(p_season text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season;
  if ev.id is null then return jsonb_build_object('phase','draft','classes','[]'::jsonb,'routes','[]'::jsonb,'semifinal','[]'::jsonb,'semifinal_results','[]'::jsonb,'stations','[]'::jsonb,'display',null,'notices','[]'::jsonb,'audit','[]'::jsonb,'semifinal_audit','[]'::jsonb); end if;
  return jsonb_build_object('phase',ev.phase,
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

create function public.enter_competition_semifinal_result(p_season text,p_profile uuid,p_route uuid,p_zone integer,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; pts numeric; rid uuid;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season for update;
  if ev.phase<>'closed' or p_zone not between 0 and 10 or length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Geschlossenes Halbfinale, Griff und Begründung sind erforderlich.'; end if;
  if not exists(select 1 from public.semifinal_eligibility e join public.finale_registrations f on f.profile_id=e.profile_id and f.season_year=e.season_year and f.registration_status='registered' join public.competition_day_classes c on c.event_id=ev.id and c.league=e.league and c.class_label=e.class_label join public.competition_day_class_routes cr on cr.class_id=c.id and cr.route_id=p_route where e.profile_id=p_profile and e.season_year=p_season and e.status='eligible') then raise exception 'Person oder Route ist nicht startberechtigt.'; end if;
  pts:=(ev.zone_points->>p_zone)::numeric;
  insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points) values(ev.id,p_route,p_profile,p_zone,false,pts) returning id into rid;
  delete from public.competition_semifinal_settlements where event_id=ev.id and profile_id=p_profile and route_id=p_route;
  insert into public.competition_day_result_audit(result_id,actor_profile_id,reason,before_data,after_data) values(rid,auth.uid(),btrim(p_reason),'{}'::jsonb,jsonb_build_object('zone',p_zone,'points',pts));
end $$;

create function public.set_competition_final_route(p_season text,p_number integer,p_name text,p_max_grip integer)
returns void language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season for update;
  if ev.id is null or p_number not between 1 and 99 or length(btrim(coalesce(p_name,''))) not between 1 and 100 or p_max_grip not between 1 and 999 then raise exception 'Ungültige Finalroute.'; end if;
  if exists(select 1 from public.competition_final_classes c join public.competition_final_routes r on r.id=c.route_id where r.event_id=ev.id and r.number=p_number and c.phase<>'preparation') then raise exception 'Die Route wird bereits in einer freigegebenen Klasse verwendet.'; end if;
  insert into public.competition_final_routes(event_id,number,name,max_grip) values(ev.id,p_number,btrim(p_name),p_max_grip)
    on conflict(event_id,number) do update set name=excluded.name,max_grip=excluded.max_grip;
end $$;

create function public.set_competition_final_exclusion(p_season text,p_profile uuid,p_status text,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; c public.competition_final_classes; old_status text;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season for update;
  if not exists(select 1 from public.semifinal_eligibility e join public.finale_registrations f on f.profile_id=e.profile_id and f.season_year=e.season_year and f.registration_status='registered' where e.profile_id=p_profile and e.season_year=p_season and e.status='eligible') then raise exception 'Person gehört nicht zu diesem Halbfinale.'; end if;
  select fc.* into c from public.competition_final_classes fc join public.semifinal_eligibility e on e.league=fc.league and e.class_label=fc.class_label and e.season_year=p_season and e.profile_id=p_profile where fc.event_id=ev.id;
  if ev.phase<>'closed' or c.phase in ('running','review','final') then raise exception 'Nach Klassenstart ist keine Umbesetzung möglich.'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 500 or (p_status is not null and p_status not in ('dns','withdrawn')) then raise exception 'Status und Begründung fehlen.'; end if;
  select status into old_status from public.competition_final_exclusions where event_id=ev.id and profile_id=p_profile;
  if p_status is null then delete from public.competition_final_exclusions where event_id=ev.id and profile_id=p_profile;
  else insert into public.competition_final_exclusions(event_id,profile_id,status,reason,actor_id) values(ev.id,p_profile,p_status,btrim(p_reason),auth.uid())
    on conflict(event_id,profile_id) do update set status=excluded.status,reason=excluded.reason,actor_id=excluded.actor_id,created_at=statement_timestamp(); end if;
  insert into public.competition_final_audit(event_id,class_id,actor_id,action,before_data,after_data,reason) values(ev.id,c.id,auth.uid(),'exclusion',jsonb_build_object('profile_id',p_profile,'status',old_status),jsonb_build_object('profile_id',p_profile,'status',p_status),coalesce(nullif(btrim(p_reason),''),'Ausfallstatus zurückgenommen'));
end $$;

create function public.settle_competition_semifinal(p_season text,p_profile uuid,p_route uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season for update;
  if ev.phase<>'closed' or length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Die Halbfinaleingabe muss geschlossen sein; eine Begründung ist erforderlich.'; end if;
  if not exists(select 1 from public.semifinal_eligibility e join public.competition_day_classes c on c.event_id=ev.id and c.league=e.league and c.class_label=e.class_label join public.competition_day_class_routes cr on cr.class_id=c.id and cr.route_id=p_route where e.profile_id=p_profile and e.season_year=p_season and e.status='eligible') then raise exception 'Person oder Route gehört nicht zu dieser Klasse.'; end if;
  if exists(select 1 from public.competition_day_results where event_id=ev.id and profile_id=p_profile and route_id=p_route) then raise exception 'Für diese Route ist bereits ein Ergebnis vorhanden.'; end if;
  insert into public.competition_semifinal_settlements(event_id,profile_id,route_id,reason,actor_id) values(ev.id,p_profile,p_route,btrim(p_reason),auth.uid())
    on conflict(event_id,profile_id,route_id) do update set reason=excluded.reason,actor_id=excluded.actor_id,created_at=statement_timestamp();
  insert into public.competition_final_audit(event_id,actor_id,action,after_data,reason) values(ev.id,auth.uid(),'semifinal_zero',jsonb_build_object('profile_id',p_profile,'route_id',p_route,'points',0),btrim(p_reason));
end $$;

create function public.publish_competition_final_class(p_season text,p_league text,p_label text,p_route uuid,p_station smallint,p_expected_version integer)
returns void language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; c public.competition_final_classes; n integer; cut numeric; prior jsonb;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into ev from public.competition_day_events where season_year=p_season for update;
  if ev.phase<>'closed' then raise exception 'Halbfinaleingabe zuerst schließen.'; end if;
  if p_station not in (1,2) or not exists(select 1 from public.competition_final_routes where id=p_route and event_id=ev.id) then raise exception 'Finalroute oder Station fehlt.'; end if;
  insert into public.competition_final_classes(event_id,league,class_label) values(ev.id,p_league,p_label) on conflict(event_id,league,class_label) do nothing;
  select * into c from public.competition_final_classes where event_id=ev.id and league=p_league and class_label=p_label for update;
  if c.version<>p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
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

create function public.move_competition_final_entry(p_entry uuid,p_position integer,p_expected_version integer)
returns void language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; ev uuid; oldpos integer; n integer;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select fc.* into c from public.competition_final_classes fc join public.competition_final_entries en on en.class_id=fc.id where en.id=p_entry for update of fc;
  if c.id is null or c.version<>p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
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

-- replace the immediate constraint generated above with a deferrable one.
alter table public.competition_final_entries drop constraint competition_final_entries_class_id_start_position_key;
alter table public.competition_final_entries add constraint competition_final_entries_class_id_start_position_key unique(class_id,start_position) deferrable initially immediate;

create function public.set_competition_final_phase(p_class uuid,p_phase text,p_expected_version integer,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; oldphase text;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into c from public.competition_final_classes where id=p_class for update;
  if c.id is null or c.version<>p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
  oldphase:=c.phase;
  if not ((oldphase='published' and p_phase='running') or (oldphase='running' and p_phase='review') or (oldphase='review' and p_phase='running' and length(btrim(coalesce(p_reason,''))) between 1 and 500) or (oldphase='review' and p_phase='final') or (oldphase='final' and p_phase='review' and length(btrim(coalesce(p_reason,''))) between 1 and 500)) then raise exception 'Dieser Klassenwechsel ist nicht zulässig.'; end if;
  if p_phase='running' and c.semifinal_fingerprint is distinct from public.competition_final_fingerprint(c.event_id,c.league,c.class_label) then raise exception 'Die Halbfinalwertung hat sich seit der Finalfreigabe geändert.'; end if;
  if p_phase='final' and exists(select 1 from public.competition_final_entries en left join public.competition_final_attempts a on a.entry_id=en.id and a.counted where en.class_id=c.id and (en.status='incident' or (en.status='ready' and (a.id is null or en.checked_at is null)))) then raise exception 'Ergebnisse oder Papierabgleich fehlen.'; end if;
  update public.competition_final_classes set phase=p_phase,version=version+1,updated_at=statement_timestamp() where id=c.id;
  insert into public.competition_final_audit(event_id,class_id,actor_id,action,before_data,after_data,reason) values(c.event_id,c.id,auth.uid(),'phase',jsonb_build_object('phase',oldphase),jsonb_build_object('phase',p_phase),coalesce(nullif(btrim(p_reason),''),'Klassenstatus geändert'));
end $$;

create function public.set_competition_final_station(p_season text,p_station smallint,p_code text)
returns void language plpgsql security definer set search_path=public as $$
declare ev uuid; salt text;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  if p_station not in (1,2) or p_code !~ '^[A-Za-z0-9]{24}$' then raise exception 'Station und 24-stelliger Zugangscode sind erforderlich.'; end if;
  select id into ev from public.competition_day_events where season_year=p_season for update;
  if ev is null then raise exception 'Wettkampftag fehlt.'; end if;
  salt:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into public.competition_final_stations(event_id,station_no,salt,code_hash) values(ev,p_station,salt,encode(sha256(convert_to(salt||p_code,'UTF8')),'hex'))
    on conflict(event_id,station_no) do update set salt=excluded.salt,code_hash=excluded.code_hash,updated_at=statement_timestamp();
end $$;

create function public.get_competition_final_station(p_season text,p_station smallint,p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev uuid; s public.competition_final_stations;
begin
  if p_code is null or p_code !~ '^[A-Za-z0-9]{24}$' or p_station not in (1,2) then raise exception using errcode='42501',message='FINAL_STATION_INVALID'; end if;
  select id into ev from public.competition_day_events where season_year=p_season;
  select * into s from public.competition_final_stations where event_id=ev and station_no=p_station;
  if s.event_id is null or s.code_hash<>encode(sha256(convert_to(s.salt||p_code,'UTF8')),'hex') then raise exception using errcode='42501',message='FINAL_STATION_INVALID'; end if;
  return jsonb_build_object('classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'league',c.league,'class_label',c.class_label,'phase',c.phase,'version',c.version,'route',jsonb_build_object('number',r.number,'name',r.name,'max_grip',r.max_grip),'entries',public.competition_final_rankings(c.id)) order by c.league,c.class_label) from public.competition_final_classes c join public.competition_final_routes r on r.id=c.route_id where c.event_id=ev and c.station_no=p_station and c.phase in ('published','running','review')),'[]'::jsonb));
end $$;

create function public.submit_competition_final_attempt(p_season text,p_station smallint,p_code text,p_entry uuid,p_request uuid,p_grip integer,p_top boolean,p_seconds integer,p_expected_version integer,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; en public.competition_final_entries; r public.competition_final_routes; old public.competition_final_attempts; s public.competition_final_stations; a public.competition_final_attempts;
begin
  if p_code is null or p_code !~ '^[A-Za-z0-9]{24}$' or p_station not in (1,2) then raise exception using errcode='42501',message='FINAL_STATION_INVALID'; end if;
  select fc.* into c from public.competition_final_classes fc join public.competition_final_entries e on e.class_id=fc.id join public.competition_day_events ev on ev.id=fc.event_id where e.id=p_entry and ev.season_year=p_season for update of fc;
  select * into s from public.competition_final_stations where event_id=c.event_id and station_no=p_station;
  if s.event_id is null or s.code_hash<>encode(sha256(convert_to(s.salt||p_code,'UTF8')),'hex') or c.station_no<>p_station then raise exception using errcode='42501',message='FINAL_STATION_INVALID'; end if;
  select * into a from public.competition_final_attempts where request_id=p_request and entry_id=p_entry;
  if a.id is not null then return to_jsonb(a); end if;
  if c.version<>p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
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

create function public.set_competition_final_entry_status(p_entry uuid,p_status text,p_reason text,p_expected_version integer)
returns void language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; en public.competition_final_entries;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select fc.* into c from public.competition_final_classes fc join public.competition_final_entries e on e.class_id=fc.id where e.id=p_entry for update of fc;
  if c.id is null or c.version<>p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
  if c.phase not in ('published','running','review') or p_status not in ('ready','dns','incident') or length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Status oder Begründung ungültig.'; end if;
  select * into en from public.competition_final_entries where id=p_entry for update;
  if p_status='dns' and exists(select 1 from public.competition_final_attempts where entry_id=p_entry) then raise exception 'Eine bereits gestartete Person kann nicht als DNS markiert werden.'; end if;
  update public.competition_final_entries set status=p_status,status_reason=btrim(p_reason),checked_at=null,checked_by=null,updated_at=statement_timestamp() where id=p_entry;
  update public.competition_final_classes set version=version+1,updated_at=statement_timestamp() where id=c.id;
  insert into public.competition_final_audit(event_id,class_id,entry_id,actor_id,action,before_data,after_data,reason) values(c.event_id,c.id,p_entry,auth.uid(),'status',to_jsonb(en),jsonb_build_object('status',p_status),btrim(p_reason));
end $$;

create function public.check_competition_final_entry(p_entry uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path=public as $$
declare c public.competition_final_classes; en public.competition_final_entries;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select fc.* into c from public.competition_final_classes fc join public.competition_final_entries e on e.class_id=fc.id where e.id=p_entry for update of fc;
  if c.id is null or c.version<>p_expected_version then raise exception using errcode='40001',message='FINAL_VERSION_CONFLICT'; end if;
  if c.phase not in ('running','review') then raise exception 'Papierabgleich ist jetzt nicht möglich.'; end if;
  select * into en from public.competition_final_entries where id=p_entry for update;
  if en.status='incident' or (en.status='ready' and not exists(select 1 from public.competition_final_attempts where entry_id=p_entry and counted)) then raise exception 'Ergebnis oder Zwischenfall ist noch ungeklärt.'; end if;
  update public.competition_final_entries set checked_at=statement_timestamp(),checked_by=auth.uid(),updated_at=statement_timestamp() where id=p_entry;
  update public.competition_final_classes set version=version+1,updated_at=statement_timestamp() where id=c.id;
  insert into public.competition_final_audit(event_id,class_id,entry_id,actor_id,action,before_data,after_data,reason) values(c.event_id,c.id,p_entry,auth.uid(),'paper_check',null,jsonb_build_object('checked_at',statement_timestamp()),'Papierliste abgeglichen');
end $$;

create function public.set_competition_live_display(p_season text,p_phase text,p_keys jsonb,p_pinned text,p_interval integer)
returns void language plpgsql security definer set search_path=public as $$
declare ev uuid;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select id into ev from public.competition_day_events where season_year=p_season;
  if ev is null or p_phase not in ('semifinal','final') or jsonb_typeof(p_keys) is distinct from 'array' or p_interval not between 5 and 120 then raise exception 'Anzeigeeinstellung ungültig.'; end if;
  if exists(select 1 from jsonb_array_elements_text(p_keys) k where k !~ '^(lead|toprope)\|.{1,80}$') then raise exception 'Klassenfilter ungültig.'; end if;
  if p_pinned is not null and p_pinned not in (select jsonb_array_elements_text(p_keys)) then raise exception 'Fixierte Klasse fehlt in der Auswahl.'; end if;
  insert into public.competition_live_display(event_id,phase,class_keys,pinned_key,interval_seconds) values(ev,p_phase,p_keys,p_pinned,p_interval)
    on conflict(event_id) do update set phase=excluded.phase,class_keys=excluded.class_keys,pinned_key=excluded.pinned_key,interval_seconds=excluded.interval_seconds,updated_at=statement_timestamp();
end $$;

create function public.save_competition_live_notice(p_season text,p_id uuid,p_title text,p_body text,p_app boolean,p_tv boolean,p_fullscreen boolean,p_expires timestamptz,p_withdraw boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare ev uuid; n uuid;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select id into ev from public.competition_day_events where season_year=p_season;
  if ev is null then raise exception 'Wettkampftag fehlt.'; end if;
  if p_withdraw then update public.competition_live_notices set withdrawn_at=statement_timestamp(),updated_at=statement_timestamp() where id=p_id and event_id=ev returning id into n;
  else
    if length(btrim(coalesce(p_title,''))) not between 1 and 100 or length(btrim(coalesce(p_body,''))) not between 1 and 500 or not (p_app or p_tv) then raise exception 'Hinweis benötigt Titel, Text und mindestens ein Ziel.'; end if;
    if p_id is null then insert into public.competition_live_notices(event_id,title,body,show_app,show_tv,fullscreen,expires_at) values(ev,btrim(p_title),btrim(p_body),p_app,p_tv,p_fullscreen,p_expires) returning id into n;
    else update public.competition_live_notices set title=btrim(p_title),body=btrim(p_body),show_app=p_app,show_tv=p_tv,fullscreen=p_fullscreen,expires_at=p_expires,withdrawn_at=null,updated_at=statement_timestamp() where id=p_id and event_id=ev returning id into n; end if;
  end if;
  if n is null then raise exception 'Hinweis nicht gefunden.'; end if;
  return n;
end $$;

create function public.get_competition_live(p_season text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; d public.competition_live_display;
begin
  select * into ev from public.competition_day_events where season_year=p_season;
  if ev.id is null then return jsonb_build_object('season',p_season,'phase','semifinal','classes','[]'::jsonb,'notices','[]'::jsonb,'updated_at',statement_timestamp()); end if;
  select * into d from public.competition_live_display where event_id=ev.id;
  return jsonb_build_object('season',p_season,'phase',coalesce(d.phase,'semifinal'),'pinned_key',d.pinned_key,'interval_seconds',coalesce(d.interval_seconds,15),'class_keys',coalesce(d.class_keys,'[]'::jsonb),'semifinal_open',ev.phase='open','updated_at',statement_timestamp(),
    'classes',case when coalesce(d.phase,'semifinal')='final' then public.get_competition_final_public(p_season)
    else coalesce((select jsonb_agg(jsonb_build_object('key',q.league||'|'||q.class_label,'league',q.league,'class_label',q.class_label,'entries',q.entries) order by q.league,q.class_label) from (select e.league,e.class_label,jsonb_agg(jsonb_build_object('name',e.name,'points',e.points,'completed',e.completed,'rank',e.rank) order by e.rank,e.name) entries from (select v.league,v.class_label,v.name,v.points,v.completed,rank() over(partition by v.league,v.class_label order by v.points desc) rank from (select el.league,el.class_label,concat_ws(' ',p.first_name,p.last_name) name,coalesce(sum(r.points),0) points,count(r.id) completed from public.semifinal_eligibility el join public.profiles p on p.id=el.profile_id join public.finale_registrations f on f.profile_id=p.id and f.season_year=el.season_year and f.registration_status='registered' left join public.competition_day_results r on r.event_id=ev.id and r.profile_id=p.id where el.season_year=p_season and el.status='eligible' and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null group by el.league,el.class_label,p.id,p.first_name,p.last_name) v) e group by e.league,e.class_label) q),'[]'::jsonb) end,
    'notices',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body,'show_app',show_app,'show_tv',show_tv,'fullscreen',fullscreen,'expires_at',expires_at) order by created_at desc) from public.competition_live_notices where event_id=ev.id and withdrawn_at is null and (expires_at is null or expires_at>statement_timestamp())),'[]'::jsonb));
end $$;

revoke all on function public.competition_final_fingerprint(uuid,text,text),public.competition_final_rankings(uuid),public.competition_final_public_rankings(uuid),public.get_competition_final_public(text),public.get_competition_final_admin(text),public.set_competition_final_route(text,integer,text,integer),public.set_competition_final_exclusion(text,uuid,text,text),public.settle_competition_semifinal(text,uuid,uuid,text),public.enter_competition_semifinal_result(text,uuid,uuid,integer,text),public.publish_competition_final_class(text,text,text,uuid,smallint,integer),public.move_competition_final_entry(uuid,integer,integer),public.set_competition_final_phase(uuid,text,integer,text),public.set_competition_final_station(text,smallint,text),public.get_competition_final_station(text,smallint,text),public.submit_competition_final_attempt(text,smallint,text,uuid,uuid,integer,boolean,integer,integer,text),public.set_competition_final_entry_status(uuid,text,text,integer),public.check_competition_final_entry(uuid,integer),public.set_competition_live_display(text,text,jsonb,text,integer),public.save_competition_live_notice(text,uuid,text,text,boolean,boolean,boolean,timestamptz,boolean),public.get_competition_live(text) from public,anon,authenticated;
grant execute on function public.get_competition_final_admin(text),public.set_competition_final_route(text,integer,text,integer),public.set_competition_final_exclusion(text,uuid,text,text),public.settle_competition_semifinal(text,uuid,uuid,text),public.enter_competition_semifinal_result(text,uuid,uuid,integer,text),public.publish_competition_final_class(text,text,text,uuid,smallint,integer),public.move_competition_final_entry(uuid,integer,integer),public.set_competition_final_phase(uuid,text,integer,text),public.set_competition_final_station(text,smallint,text),public.set_competition_final_entry_status(uuid,text,text,integer),public.check_competition_final_entry(uuid,integer),public.set_competition_live_display(text,text,jsonb,text,integer),public.save_competition_live_notice(text,uuid,text,text,boolean,boolean,boolean,timestamptz,boolean) to authenticated;
grant execute on function public.get_competition_final_station(text,smallint,text),public.submit_competition_final_attempt(text,smallint,text,uuid,uuid,integer,boolean,integer,integer,text),public.get_competition_live(text),public.get_competition_final_public(text) to anon,authenticated;
commit;
