begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- No participant is silently marked present, including existing registrations.
create table public.competition_attendance (
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  status text not null check (status in ('expected','arrived','absent')),
  version integer not null default 0 check (version >= 0),
  checked_in_at timestamptz,
  actor_id uuid references public.profiles(id),
  actor_kind text not null check (actor_kind in ('admin','crew')),
  exclusion_created_at timestamptz,
  primary key(event_id,profile_id)
);
create table public.competition_attendance_access (
  event_id uuid primary key references public.competition_day_events(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default clock_timestamp()
);
create table public.competition_attendance_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  actor_id uuid references public.profiles(id),
  actor_kind text not null check (actor_kind in ('admin','crew')),
  action text not null,
  before_data jsonb not null,
  after_data jsonb not null,
  reason text,
  created_at timestamptz not null default clock_timestamp()
);
create table public.competition_attendance_requests (
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  request_id uuid not null,
  fingerprint text not null,
  response jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(event_id,request_id)
);
-- Narrow transaction-local permit for the existing registration trigger. No JWT
-- impersonation, registration-window extension or general trigger bypass.
create table public.competition_attendance_registration_permits (
  transaction_id bigint not null,
  profile_id uuid not null,
  season_year text not null,
  primary key(transaction_id,profile_id,season_year)
);
alter table public.competition_attendance enable row level security;
alter table public.competition_attendance_access enable row level security;
alter table public.competition_attendance_audit enable row level security;
alter table public.competition_attendance_requests enable row level security;
alter table public.competition_attendance_registration_permits enable row level security;
revoke all on public.competition_attendance,public.competition_attendance_access,
  public.competition_attendance_audit,public.competition_attendance_requests,
  public.competition_attendance_registration_permits from public,anon,authenticated;

create function public.has_competition_registration_permit(p_profile uuid,p_season text)
returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from public.competition_attendance_registration_permits
    where transaction_id=txid_current() and profile_id=p_profile and season_year=p_season);
$$;
revoke all on function public.has_competition_registration_permit(uuid,text) from public,anon,authenticated;
do $$ declare source text;
begin
  source:=pg_get_functiondef('public.guard_semifinal_registration_write()'::regprocedure);
  if position('  if auth.uid() is null then' in source)=0 then raise exception 'Registration guard has changed; review required'; end if;
  source:=replace(source,'  if auth.uid() is null then',
    E'  if tg_op <> ''DELETE'' and new.registration_status = ''registered'' and public.has_competition_registration_permit(new.profile_id,new.season_year) then\n    new.updated_at := statement_timestamp();\n    return new;\n  end if;\n  if auth.uid() is null then');
  execute source;
end $$;

create function public.verify_competition_attendance_access(p_event uuid,p_password text)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare stored text;
begin
  if public.is_league_admin() then return true; end if;
  if p_password is null or length(p_password)<12 or octet_length(p_password)>72 then
    raise exception using errcode='42501',message='ATTENDANCE_PASSWORD_INVALID';
  end if;
  select password_hash into stored from public.competition_attendance_access where event_id=p_event for share;
  if stored is null or extensions.crypt(p_password,stored) is distinct from stored then
    raise exception using errcode='42501',message='ATTENDANCE_PASSWORD_INVALID';
  end if;
  return false;
end $$;
revoke all on function public.verify_competition_attendance_access(uuid,text) from public,anon,authenticated;

create function public.set_competition_attendance_password(p_season text,p_password text)
returns void language plpgsql security definer set search_path=public,extensions as $$
declare ev uuid;
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  select id into ev from public.competition_day_events where season_year=p_season for update;
  if ev is null then raise exception 'Wettkampftag zuerst einrichten.'; end if;
  if p_password is null then
    delete from public.competition_attendance_access where event_id=ev;
  else
    if length(p_password)<12 or octet_length(p_password)>72 or p_password<>btrim(p_password) then
      raise exception 'Mindestens 12 Zeichen, höchstens 72 UTF-8-Bytes, keine äußeren Leerzeichen.';
    end if;
    insert into public.competition_attendance_access(event_id,password_hash)
    values(ev,extensions.crypt(p_password,extensions.gen_salt('bf',12)))
    on conflict(event_id) do update set password_hash=excluded.password_hash,updated_at=clock_timestamp();
  end if;
  insert into public.competition_final_audit(event_id,actor_id,action,reason)
    values(ev,auth.uid(),'attendance_access_changed',case when p_password is null then 'Einlasszugang widerrufen' else 'Einlasspasswort geändert' end);
end $$;
create function public.get_competition_attendance_access_status(p_season text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.is_league_admin() then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  return exists(select 1 from public.competition_attendance_access a join public.competition_day_events e on e.id=a.event_id where e.season_year=p_season);
end $$;

create function public.get_competition_attendance(p_season text,p_password text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; admin_access boolean;
begin
  select * into ev from public.competition_day_events where season_year=p_season;
  admin_access:=public.verify_competition_attendance_access(ev.id,p_password);
  if ev.id is null then raise exception 'Wettkampftag zuerst einrichten.'; end if;
  return jsonb_build_object('season',p_season,'phase',case when ev.phase='open' and ev.submission_deadline_at<=clock_timestamp() then 'closed' else ev.phase end,
    'deadline',ev.submission_deadline_at,'rows',coalesce((select jsonb_agg(jsonb_build_object(
      'profile_id',p.id,'name',concat_ws(' ',p.first_name,p.last_name),'league',e.league,'class_label',e.class_label,
      'registered',coalesce(f.registration_status='registered',false),
      'eligible',p.role='participant' and p.archived_at is null and p.participation_activated_at is not null and e.status='eligible' and e.league is not null and e.class_label is not null,
      'status',coalesce(a.status,'expected'),'version',coalesce(a.version,0),'checked_in_at',a.checked_in_at,
      'route_count',(select count(*) from public.competition_day_classes c join public.competition_day_class_routes cr on cr.class_id=c.id where c.event_id=ev.id and c.league=e.league and c.class_label=e.class_label),
      'can_late_register',ev.phase in ('draft','open') and (ev.submission_deadline_at is null or ev.submission_deadline_at>clock_timestamp())
        and p.role='participant' and p.archived_at is null and p.participation_activated_at is not null and e.status='eligible'
        and not exists(select 1 from public.competition_final_exclusions x where x.event_id=ev.id and x.profile_id=p.id)
        and not exists(select 1 from public.competition_final_classes fc where fc.event_id=ev.id and fc.league=e.league and fc.class_label=e.class_label and fc.phase<>'preparation')
        and (select count(*) from public.competition_day_classes c join public.competition_day_class_routes cr on cr.class_id=c.id where c.event_id=ev.id and c.league=e.league and c.class_label=e.class_label)=5
    ) order by p.last_name,p.first_name,p.id)
    from public.profiles p join public.semifinal_eligibility e on e.profile_id=p.id and e.season_year=p_season
    left join public.finale_registrations f on f.profile_id=p.id and f.season_year=p_season
    left join public.competition_attendance a on a.event_id=ev.id and a.profile_id=p.id
    where (f.registration_status='registered' or (p.role='participant' and p.archived_at is null and p.participation_activated_at is not null and e.status='eligible'))),'[]'::jsonb));
end $$;

create function public.set_competition_attendance(p_season text,p_profile uuid,p_action text,
  p_version integer,p_request_id uuid,p_reason text default null,p_password text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ev public.competition_day_events; attendance public.competition_attendance; eligibility public.semifinal_eligibility;
  admin_access boolean; registered boolean; prior_registered boolean; new_status text; new_version integer;
  before_value jsonb; response_value jsonb; fingerprint_value text; saved public.competition_attendance_requests;
  exclusion_time timestamptz; actor_kind_value text;
begin
  select * into ev from public.competition_day_events where season_year=p_season for update;
  admin_access:=public.verify_competition_attendance_access(ev.id,p_password);
  if ev.id is null then raise exception 'Wettkampftag zuerst einrichten.'; end if;
  actor_kind_value:=case when admin_access then 'admin' else 'crew' end;
  if p_request_id is null or p_profile is null or p_version is null or p_version<0 or p_action is null or p_action not in ('arrive','late-register','undo','absent') then raise exception 'Ungültige Einlassaktion.'; end if;
  if p_reason is not null and length(p_reason)>500 then raise exception 'Begründung maximal 500 Zeichen.'; end if;
  if p_action in ('undo','absent') and not admin_access then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  if p_action in ('undo','absent') and length(btrim(coalesce(p_reason,'')))=0 then raise exception 'Begründung erforderlich.'; end if;
  fingerprint_value:=md5(jsonb_build_array(p_profile,p_action,p_version,p_reason,actor_kind_value,case when admin_access then auth.uid() else null end)::text);
  select * into saved from public.competition_attendance_requests where event_id=ev.id and request_id=p_request_id;
  if found then
    if saved.fingerprint is distinct from fingerprint_value then raise exception using errcode='40001',message='ATTENDANCE_REQUEST_CONFLICT'; end if;
    return saved.response;
  end if;
  select * into eligibility from public.semifinal_eligibility where profile_id=p_profile and season_year=p_season;
  if eligibility.status is distinct from 'eligible' or eligibility.league is null or eligibility.class_label is null
    or not exists(select 1 from public.profiles where id=p_profile and role='participant' and participation_activated_at is not null and archived_at is null) then
    raise exception using errcode='42501',message='COMPETITION_NOT_ELIGIBLE';
  end if;
  if exists(select 1 from public.competition_final_classes where event_id=ev.id and league=eligibility.league and class_label=eligibility.class_label and phase<>'preparation') then
    raise exception using errcode='42501',message='ATTENDANCE_CLASS_LOCKED';
  end if;
  select * into attendance from public.competition_attendance where event_id=ev.id and profile_id=p_profile for update;
  if coalesce(attendance.version,0) is distinct from p_version then raise exception using errcode='40001',message='ATTENDANCE_CONFLICT'; end if;
  registered:=exists(select 1 from public.finale_registrations where season_year=p_season and profile_id=p_profile and registration_status='registered');
  prior_registered:=registered;
  before_value:=jsonb_build_object('status',coalesce(attendance.status,'expected'),'registered',registered,'version',coalesce(attendance.version,0));
  exclusion_time:=attendance.exclusion_created_at;
  if p_action='late-register' then
    if registered then raise exception 'Bereits angemeldet; Anwesenheit bestätigen.'; end if;
    if ev.phase not in ('draft','open') or ev.submission_deadline_at<=clock_timestamp() then raise exception using errcode='42501',message='COMPETITION_DEADLINE_REACHED'; end if;
    if (select count(*) from public.competition_day_classes c join public.competition_day_class_routes cr on cr.class_id=c.id where c.event_id=ev.id and c.league=eligibility.league and c.class_label=eligibility.class_label)<>5 then raise exception using errcode='42501',message='ATTENDANCE_ROUTES_MISSING'; end if;
    if exists(select 1 from public.competition_final_exclusions where event_id=ev.id and profile_id=p_profile) then raise exception using errcode='42501',message='COMPETITION_ABSENT'; end if;
    insert into public.competition_attendance_registration_permits values(txid_current(),p_profile,p_season);
    insert into public.finale_registrations(profile_id,season_year,registration_status) values(p_profile,p_season,'registered')
      on conflict(profile_id,season_year) do update set registration_status='registered';
    delete from public.competition_attendance_registration_permits where transaction_id=txid_current() and profile_id=p_profile and season_year=p_season;
    registered:=true;
    new_status:='arrived';
  else
    if not registered then raise exception using errcode='42501',message='ATTENDANCE_NOT_REGISTERED'; end if;
    if p_action='arrive' then
      if attendance.status='absent' or exists(select 1 from public.competition_final_exclusions where event_id=ev.id and profile_id=p_profile) then raise exception using errcode='42501',message='COMPETITION_ABSENT'; end if;
      new_status:='arrived';
    else
      if exists(select 1 from public.competition_day_results where event_id=ev.id and profile_id=p_profile) then raise exception using errcode='42501',message='ATTENDANCE_RESULTS_EXIST'; end if;
      if p_action='absent' then
        if exists(select 1 from public.competition_final_exclusions where event_id=ev.id and profile_id=p_profile and (exclusion_time is null or created_at is distinct from exclusion_time)) then raise exception 'Teilnahmestatus bereits separat geklärt.'; end if;
        exclusion_time:=clock_timestamp();
        insert into public.competition_final_exclusions(event_id,profile_id,status,reason,actor_id,created_at)
          values(ev.id,p_profile,'dns',btrim(p_reason),auth.uid(),exclusion_time)
          on conflict(event_id,profile_id) do update set status='dns',reason=excluded.reason,actor_id=excluded.actor_id,created_at=excluded.created_at;
        new_status:='absent';
      else
        delete from public.competition_final_exclusions where event_id=ev.id and profile_id=p_profile and status='dns' and created_at=exclusion_time;
        exclusion_time:=null;
        new_status:='expected';
      end if;
    end if;
  end if;
  new_version:=coalesce(attendance.version,0)+1;
  insert into public.competition_attendance(event_id,profile_id,status,version,checked_in_at,actor_id,actor_kind,exclusion_created_at)
    values(ev.id,p_profile,new_status,new_version,case when new_status='arrived' then coalesce(attendance.checked_in_at,clock_timestamp()) else null end,
      case when admin_access then auth.uid() else null end,actor_kind_value,exclusion_time)
    on conflict(event_id,profile_id) do update set status=excluded.status,version=excluded.version,checked_in_at=excluded.checked_in_at,actor_id=excluded.actor_id,actor_kind=excluded.actor_kind,exclusion_created_at=excluded.exclusion_created_at;
  response_value:=jsonb_build_object('profile_id',p_profile,'status',new_status,'registered',registered,'version',new_version,
    'checked_in_at',(select checked_in_at from public.competition_attendance where event_id=ev.id and profile_id=p_profile));
  insert into public.competition_attendance_requests values(ev.id,p_request_id,fingerprint_value,response_value,clock_timestamp());
  insert into public.competition_attendance_audit(event_id,profile_id,actor_id,actor_kind,action,before_data,after_data,reason)
    values(ev.id,p_profile,case when admin_access then auth.uid() else null end,actor_kind_value,p_action,before_value,response_value,nullif(btrim(p_reason),''));
  return response_value;
end $$;

-- Same attendance rule applies before QR validation and before an idempotent
-- participant result replay. Administrative corrections retain their own RPC.
do $$ declare source text; anchor text;
begin
  source:=pg_get_functiondef('public.submit_competition_result(text,uuid,integer,boolean,text)'::regprocedure);
  anchor:='  select r.* into v_route from public.competition_day_routes';
  if position(anchor in source)=0 then raise exception 'Result RPC has changed; review required'; end if;
  source:=replace(source,anchor,E'  if not exists(select 1 from public.competition_attendance where event_id=v_event.id and profile_id=auth.uid() and status=''arrived'') then\n    if exists(select 1 from public.competition_attendance where event_id=v_event.id and profile_id=auth.uid() and status=''absent'') then raise exception using errcode=''42501'',message=''COMPETITION_ABSENT''; end if;\n    raise exception using errcode=''42501'',message=''COMPETITION_CHECK_IN_REQUIRED'';\n  end if;\n' || anchor);
  execute source;
  source:=pg_get_functiondef('public.get_competition_day(text)'::regprocedure);
  anchor:='''eligible'',v_ok,';
  if position(anchor in source)=0 then raise exception 'Participant read RPC has changed; review required'; end if;
  source:=replace(source,anchor,anchor || E'''check_in'',jsonb_build_object(''required'',true,''status'',coalesce((select status from public.competition_attendance where event_id=v_event.id and profile_id=auth.uid()),''expected''),''checked_in_at'',(select checked_in_at from public.competition_attendance where event_id=v_event.id and profile_id=auth.uid())),');
  execute source;
end $$;

revoke all on function public.get_competition_attendance(text,text),public.set_competition_attendance(text,uuid,text,integer,uuid,text,text),
 public.set_competition_attendance_password(text,text),public.get_competition_attendance_access_status(text) from public,anon,authenticated;
grant execute on function public.get_competition_attendance(text,text),public.set_competition_attendance(text,uuid,text,integer,uuid,text,text) to anon,authenticated;
grant execute on function public.set_competition_attendance_password(text,text),public.get_competition_attendance_access_status(text) to authenticated;
notify pgrst,'reload schema';
commit;
