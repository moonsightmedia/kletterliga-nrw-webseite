begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Isolated competition-day data. No qualification or signup rows are touched.
create table public.competition_day_events (
  id uuid primary key default gen_random_uuid(),
  season_year text not null unique check (length(btrim(season_year)) between 1 and 20),
  phase text not null default 'draft' check (phase in ('draft','open','closed')),
  zone_points jsonb not null default '[]'::jsonb,
  flash_bonus numeric not null default 0 check (flash_bonus between 0 and 1000000),
  opened_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);
create table public.competition_day_routes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  route_number integer not null check (route_number between 1 and 99),
  name text not null check (length(btrim(name)) between 1 and 100),
  grade text not null check (length(btrim(grade)) <= 40),
  color text not null check (length(btrim(color)) <= 40),
  qr_token text not null default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  unique (event_id, route_number), unique (event_id, id), unique (event_id, qr_token)
);
create table public.competition_day_classes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  league text not null check (league in ('toprope','lead')),
  class_label text not null check (length(btrim(class_label)) between 1 and 80),
  unique (event_id, league, class_label), unique (event_id, id)
);
create table public.competition_day_class_routes (
  event_id uuid not null,
  class_id uuid not null,
  route_id uuid not null,
  primary key (event_id, class_id, route_id),
  foreign key (event_id, class_id) references public.competition_day_classes(event_id,id) on delete cascade,
  foreign key (event_id, route_id) references public.competition_day_routes(event_id,id) on delete cascade
);
create table public.competition_day_staff (
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default statement_timestamp(),
  primary key (event_id, profile_id)
);
create table public.competition_day_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  route_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  zone smallint not null check (zone between 0 and 10),
  flash boolean not null,
  points numeric not null check (points between 0 and 2000000),
  created_at timestamptz not null default statement_timestamp(),
  unique (event_id, profile_id, route_id),
  foreign key (event_id, route_id) references public.competition_day_routes(event_id,id)
);
create table public.competition_day_result_audit (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.competition_day_results(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  before_data jsonb not null,
  after_data jsonb not null,
  created_at timestamptz not null default statement_timestamp()
);

alter table public.competition_day_events enable row level security;
alter table public.competition_day_routes enable row level security;
alter table public.competition_day_classes enable row level security;
alter table public.competition_day_class_routes enable row level security;
alter table public.competition_day_staff enable row level security;
alter table public.competition_day_results enable row level security;
alter table public.competition_day_result_audit enable row level security;
revoke all on public.competition_day_events, public.competition_day_routes,
  public.competition_day_classes, public.competition_day_class_routes,
  public.competition_day_staff, public.competition_day_results,
  public.competition_day_result_audit from public, anon, authenticated;

create or replace function public.get_competition_day(p_season text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_elig public.semifinal_eligibility;
  v_staff boolean := false; v_admin boolean := false; v_ok boolean := false;
begin
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
    'event', case when v_event.id is null then null else jsonb_build_object('id',v_event.id,'season_year',v_event.season_year,'phase',v_event.phase,'zone_points',v_event.zone_points,'flash_bonus',v_event.flash_bonus,'opened_at',v_event.opened_at) end,
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

create or replace function public.get_competition_staff_routes(p_season text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_staff boolean;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_event from public.competition_day_events where season_year=p_season;
  if v_event.id is null then return '[]'::jsonb; end if;
  v_staff := exists(select 1 from public.competition_day_staff s join public.profiles p on p.id=s.profile_id
    where s.event_id=v_event.id and s.profile_id=auth.uid() and p.archived_at is null);
  if not public.is_league_admin() and not v_staff then raise exception using errcode='42501',message='COMPETITION_STAFF_REQUIRED'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'number',route_number,'name',name,'grade',grade,'color',color,'qr_token',qr_token) order by route_number)
    from public.competition_day_routes where event_id=v_event.id),'[]'::jsonb);
end; $$;

create or replace function public.save_competition_config(p_season text,p_config jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_routes jsonb; v_assign jsonb; v_points jsonb; v_flash numeric;
  x jsonb; y jsonb; v_class uuid; v_route uuid; v_count integer;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  if length(btrim(coalesce(p_season,''))) not between 1 and 20 then raise exception 'Die Saisonangabe ist ungültig.'; end if;
  if jsonb_typeof(p_config->'routes') is distinct from 'array' or jsonb_array_length(p_config->'routes') not between 5 and 30
    or jsonb_typeof(p_config->'assignments') is distinct from 'array' or jsonb_typeof(p_config->'zone_points') is distinct from 'array'
    or jsonb_array_length(p_config->'zone_points')<>11 then raise exception 'Es werden 5 bis 30 Routen, Klassen-Zuordnungen und genau 11 Zonenwerte benötigt.'; end if;
  v_routes:=p_config->'routes'; v_assign:=p_config->'assignments'; v_points:=p_config->'zone_points';
  begin v_flash:=(p_config->>'flash_bonus')::numeric; exception when others then raise exception 'Der Flash-Bonus muss eine gültige Zahl sein.'; end;
  if v_flash is null or v_flash<0 or v_flash>1000 then raise exception 'Der Flash-Bonus muss zwischen 0 und 1.000 liegen.'; end if;
  for v_count in 0..10 loop
    if jsonb_typeof(v_points->v_count) is distinct from 'number' or (v_points->>v_count)::numeric<0 or (v_points->>v_count)::numeric>1000
      or (v_count>0 and (v_points->>v_count)::numeric<(v_points->>(v_count-1))::numeric) then raise exception 'Zonenpunkte müssen 11 nichtnegative, aufsteigende Werte enthalten.'; end if;
  end loop;
  if (v_points->>0)::numeric<>0 or (v_points->>10)::numeric<=0 then raise exception 'Zone 0 muss null Punkte haben und Zone 10 muss mindestens einen Punkt wert sein.'; end if;
  if exists(select 1 from jsonb_array_elements(v_routes) q where jsonb_typeof(q)<>'object'
    or nullif(btrim(q->>'name'),'') is null or length(q->>'name')>100 or length(coalesce(q->>'grade',''))>40
    or length(coalesce(q->>'color',''))>40 or (q->>'number') !~ '^[0-9]+$'
    or case when (q->>'number') ~ '^[0-9]+$' then (q->>'number')::integer not between 1 and 99 else true end) then raise exception 'Jede Route benötigt eine Nummer von 1 bis 99 sowie Name, Grad und Farbe.'; end if;
  if (select count(distinct (q->>'number')::integer) from jsonb_array_elements(v_routes) q)<>jsonb_array_length(v_routes) then raise exception 'Routennummern müssen eindeutig sein.'; end if;
  if exists(select 1 from jsonb_array_elements(v_assign) q where coalesce(q->>'league','') not in ('toprope','lead')
    or nullif(btrim(q->>'class_label'),'') is null or length(q->>'class_label')>80
    or jsonb_typeof(q->'route_numbers') is distinct from 'array' or jsonb_array_length(q->'route_numbers')<>5) then raise exception 'Jede Klasse benötigt genau fünf Routenzuordnungen.'; end if;
  if exists(select 1 from jsonb_array_elements(v_assign) q cross join lateral jsonb_array_elements(q->'route_numbers') n
    where jsonb_typeof(n) is distinct from 'number' or (n#>>'{}') !~ '^[0-9]+$'
      or case when jsonb_typeof(n)='number' and (n#>>'{}') ~ '^[0-9]+$' then not exists(select 1 from jsonb_array_elements(v_routes) r where (r->>'number')::integer=(n#>>'{}')::integer) else true end) then raise exception 'Eine Klassen-Zuordnung verweist auf eine nicht angelegte Route.'; end if;
  if exists(select 1 from jsonb_array_elements(v_assign) q cross join lateral jsonb_array_elements(q->'route_numbers') n group by q->>'league',q->>'class_label',n#>>'{}' having count(*)>1) then raise exception 'Eine Route darf innerhalb einer Klasse nur einmal zugeordnet sein.'; end if;
  insert into public.competition_day_events(season_year) values(p_season) on conflict(season_year) do nothing;
  select * into v_event from public.competition_day_events where season_year=p_season for update;
  if v_event.opened_at is not null then raise exception using errcode='42501',message='COMPETITION_CONFIG_LOCKED'; end if;
  update public.competition_day_events set zone_points=v_points,flash_bonus=v_flash,updated_at=statement_timestamp() where id=v_event.id;
  -- Keep IDs and QR secrets stable for unchanged route numbers.
  for x in select value from jsonb_array_elements(v_routes) loop
    insert into public.competition_day_routes(event_id,route_number,name,grade,color)
      values(v_event.id,(x->>'number')::integer,btrim(x->>'name'),coalesce(btrim(x->>'grade'),''),coalesce(btrim(x->>'color'),''))
      on conflict(event_id,route_number) do update set name=excluded.name,grade=excluded.grade,color=excluded.color;
  end loop;
  delete from public.competition_day_routes r where r.event_id=v_event.id and not exists(select 1 from jsonb_array_elements(v_routes) route_item where (route_item->>'number')::integer=r.route_number);
  delete from public.competition_day_classes where event_id=v_event.id;
  for x in select value from jsonb_array_elements(v_assign) loop
    insert into public.competition_day_classes(event_id,league,class_label) values(v_event.id,x->>'league',btrim(x->>'class_label')) returning id into v_class;
    for y in select value from jsonb_array_elements(x->'route_numbers') loop
      select id into v_route from public.competition_day_routes where event_id=v_event.id and route_number=(y#>>'{}')::integer;
      insert into public.competition_day_class_routes(event_id,class_id,route_id) values(v_event.id,v_class,v_route);
    end loop;
  end loop;
end; $$;

create or replace function public.get_competition_admin(p_season text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into v_event from public.competition_day_events where season_year=p_season;
  if v_event.id is null then return jsonb_build_object('config',jsonb_build_object('routes','[]'::jsonb,'assignments','[]'::jsonb,'zone_points','[0,0,0,0,0,0,0,0,0,0,0]'::jsonb,'flash_bonus',0),'staff','[]'::jsonb,'results','[]'::jsonb); end if;
  return jsonb_build_object(
    'config',jsonb_build_object(
      'routes',coalesce((select jsonb_agg(jsonb_build_object('number',route_number,'name',name,'grade',grade,'color',color) order by route_number) from public.competition_day_routes where event_id=v_event.id),'[]'::jsonb),
      'assignments',coalesce((select jsonb_agg(jsonb_build_object('league',c.league,'class_label',c.class_label,'route_numbers',(select jsonb_agg(r.route_number order by r.route_number) from public.competition_day_class_routes cr join public.competition_day_routes r on r.id=cr.route_id where cr.class_id=c.id))) from public.competition_day_classes c where c.event_id=v_event.id),'[]'::jsonb),
      'zone_points',v_event.zone_points,'flash_bonus',v_event.flash_bonus),
    'staff',coalesce((select jsonb_agg(jsonb_build_object('profile_id',p.id,'name',concat_ws(' ',p.first_name,p.last_name)) order by p.last_name,p.first_name) from public.competition_day_staff s join public.profiles p on p.id=s.profile_id where s.event_id=v_event.id),'[]'::jsonb),
    'results',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'route_id',x.route_id,'profile_id',x.profile_id,'zone',x.zone,'flash',x.flash,'points',x.points,'created_at',x.created_at,'name',concat_ws(' ',p.first_name,p.last_name),'league',e.league,'class_label',e.class_label) order by e.league,e.class_label,p.last_name,p.first_name,r.route_number)
      from public.competition_day_results x join public.profiles p on p.id=x.profile_id join public.semifinal_eligibility e on e.profile_id=p.id and e.season_year=v_event.season_year join public.competition_day_routes r on r.id=x.route_id where x.event_id=v_event.id),'[]'::jsonb));
end; $$;

create or replace function public.set_competition_staff(p_season text,p_profile_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select * into v_event from public.competition_day_events where season_year=p_season for update;
  if v_event.id is null then raise exception 'Für diese Saison ist noch kein Wettkampftag angelegt.'; end if;
  if p_enabled is null or p_profile_id is null then raise exception 'Der Staff-Status oder das Profil fehlt.'; end if;
  if p_enabled and not exists(select 1 from public.profiles where id=p_profile_id and role in ('participant','gym_admin','league_admin') and archived_at is null) then raise exception 'Das aktive Staff-Profil existiert nicht.'; end if;
  if p_enabled then insert into public.competition_day_staff(event_id,profile_id) values(v_event.id,p_profile_id) on conflict do nothing;
  else delete from public.competition_day_staff where event_id=v_event.id and profile_id=p_profile_id; end if;
end; $$;

create or replace function public.set_competition_phase(p_season text,p_phase text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_need integer; v_bad integer;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  if p_phase is null or p_phase not in ('open','closed') then raise exception 'Der Wettkampftag kann nur geöffnet oder geschlossen werden.'; end if;
  select * into v_event from public.competition_day_events where season_year=p_season for update;
  if v_event.id is null then raise exception 'Für diese Saison ist noch kein Wettkampftag konfiguriert.'; end if;
  if p_phase='open' then
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

create or replace function public.submit_competition_result(p_season text,p_route_id uuid,p_zone integer,p_flash boolean,p_qr_token text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_profile public.profiles; v_elig public.semifinal_eligibility; v_route public.competition_day_routes; v_points numeric; v_result public.competition_day_results;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_event from public.competition_day_events where season_year=p_season for update;
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

create or replace function public.correct_competition_result(p_result_id uuid,p_zone integer,p_flash boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_result public.competition_day_results; v_event public.competition_day_events; v_before jsonb; v_after jsonb;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Bitte einen Korrekturgrund mit maximal 500 Zeichen angeben.'; end if;
  select e.* into v_event from public.competition_day_events e join public.competition_day_results r on r.event_id=e.id where r.id=p_result_id for update of e;
  if v_event.id is null then raise exception 'Das Ergebnis wurde nicht gefunden.'; end if;
  select * into v_result from public.competition_day_results where id=p_result_id and event_id=v_event.id for update;
  if p_zone is null or p_flash is null or p_zone not between 0 and 10 or (p_flash and p_zone<>10) then raise exception 'Zone muss zwischen 0 und 10 liegen; Flash ist nur mit Zone 10 möglich.'; end if;
  v_before:=to_jsonb(v_result);
  update public.competition_day_results set zone=p_zone,flash=p_flash,points=(v_event.zone_points->>p_zone)::numeric+case when p_flash then v_event.flash_bonus else 0 end where id=p_result_id returning * into v_result;
  v_after:=to_jsonb(v_result);
  insert into public.competition_day_result_audit(result_id,actor_profile_id,reason,before_data,after_data) values(p_result_id,auth.uid(),btrim(p_reason),v_before,v_after);
  return v_after;
end; $$;

create or replace function public.list_competition_standings(p_season text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_event from public.competition_day_events where season_year=p_season;
  if v_event.id is null then return '[]'::jsonb; end if;
  if not public.is_league_admin() and not exists(select 1 from public.competition_day_staff s join public.profiles p on p.id=s.profile_id where s.event_id=v_event.id and s.profile_id=auth.uid() and p.archived_at is null) then
    if not exists(select 1 from public.profiles p join public.semifinal_eligibility e on e.profile_id=p.id where p.id=auth.uid() and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null and e.season_year=p_season and e.status='eligible' and exists(select 1 from public.finale_registrations f where f.profile_id=p.id and f.season_year=p_season and f.registration_status='registered')) then raise exception using errcode='42501',message='COMPETITION_NOT_ELIGIBLE'; end if;
  end if;
  return coalesce((select jsonb_agg(to_jsonb(q) order by q.league,q.class_label,q.rank,q.name) from (
    select e.league,e.class_label,p.id as profile_id,concat_ws(' ',p.first_name,p.last_name) as name,
      coalesce(sum(x.points),0) as points,count(distinct x.route_id)::integer as completed_routes,
      rank() over(partition by e.league,e.class_label order by coalesce(sum(x.points),0) desc) as rank
    from public.semifinal_eligibility e join public.profiles p on p.id=e.profile_id
      join public.finale_registrations f on f.profile_id=p.id and f.season_year=e.season_year and f.registration_status='registered'
      left join public.competition_day_results x on x.event_id=v_event.id and x.profile_id=p.id
    where e.season_year=v_event.season_year and e.status='eligible' and e.league is not null and e.class_label is not null
      and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null
    group by e.league,e.class_label,p.id,p.first_name,p.last_name
  ) q),'[]'::jsonb);
end; $$;

revoke all on function public.get_competition_day(text), public.get_competition_staff_routes(text), public.save_competition_config(text,jsonb), public.get_competition_admin(text), public.set_competition_staff(text,uuid,boolean), public.set_competition_phase(text,text), public.submit_competition_result(text,uuid,integer,boolean,text), public.correct_competition_result(uuid,integer,boolean,text), public.list_competition_standings(text) from public, anon;
grant execute on function public.get_competition_day(text), public.get_competition_staff_routes(text), public.save_competition_config(text,jsonb), public.get_competition_admin(text), public.set_competition_staff(text,uuid,boolean), public.set_competition_phase(text,text), public.submit_competition_result(text,uuid,integer,boolean,text), public.correct_competition_result(uuid,integer,boolean,text), public.list_competition_standings(text) to authenticated;

commit;
