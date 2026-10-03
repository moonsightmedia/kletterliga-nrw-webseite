begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Separate raffle audit. No registration, qualification or scoring writes.
-- Snapshot UUIDs deliberately have no profile FK: archiving/deleting a profile
-- must not alter a completed draw. Event deletion is restricted while draws exist.
create table public.competition_raffle_draws (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.competition_day_events(id),
  request_id uuid not null,
  scope text not null check (scope in ('all','semifinal','final')),
  present_only boolean not null,
  repeat_allowed boolean not null default false,
  prize text check (prize is null or length(btrim(prize)) between 1 and 120),
  profile_id uuid not null,
  winner_name text not null,
  tickets integer not null check (tickets between 1 and 9),
  total_tickets integer not null check (total_tickets >= tickets),
  pool_count integer not null check (pool_count > 0),
  selected_ticket integer not null check (selected_ticket > 0 and selected_ticket <= total_tickets),
  pool_snapshot jsonb not null check (jsonb_typeof(pool_snapshot)='object'),
  actor_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (event_id,request_id),
  check (scope <> 'all' or not present_only)
);
create index competition_raffle_winner_lookup
  on public.competition_raffle_draws(event_id,profile_id);
alter table public.competition_raffle_draws enable row level security;
revoke all on public.competition_raffle_draws from public,anon,authenticated;

create function public.guard_competition_raffle_immutable()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  raise exception using errcode='42501',message='RAFFLE_DRAW_IMMUTABLE';
end $$;
revoke all on function public.guard_competition_raffle_immutable() from public,anon,authenticated;
create trigger competition_raffle_immutable
  before update or delete on public.competition_raffle_draws
  for each row execute function public.guard_competition_raffle_immutable();

-- Four cryptographic bytes give a uniform unsigned 32-bit integer. Discard the
-- incomplete upper interval before modulo reduction to avoid modulo bias.
-- The bound is an integer, making 2^32 arithmetic safe in bigint.
create function public.competition_raffle_random_ticket(p_bound integer)
returns integer language plpgsql volatile set search_path=pg_catalog as $$
declare bytes bytea; sample bigint; acceptance_limit bigint;
begin
  if p_bound is null or p_bound < 1 then
    raise exception using errcode='22023',message='RAFFLE_INVALID_RANDOM_BOUND';
  end if;
  acceptance_limit := 4294967296::bigint - mod(4294967296::bigint,p_bound::bigint);
  loop
    bytes := extensions.gen_random_bytes(4);
    sample := get_byte(bytes,0)::bigint*16777216 + get_byte(bytes,1)::bigint*65536
      + get_byte(bytes,2)::bigint*256 + get_byte(bytes,3)::bigint;
    if sample < acceptance_limit then
      return (mod(sample,p_bound::bigint)+1)::integer;
    end if;
  end loop;
end $$;
revoke all on function public.competition_raffle_random_ticket(integer) from public,anon,authenticated;

-- Internal pool builder; callable only by the owner through the admin RPCs.
-- Results have no season column, so use the authoritative current settings and
-- inclusive German qualification dates. An old season must fail closed.
create function public.competition_raffle_pool(
  p_season text,p_scope text,p_present_only boolean,p_repeat_allowed boolean
)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare settings public.admin_settings; ev uuid; entries jsonb;
  total bigint; participant_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED';
  end if;
  if not public.is_league_admin() or not exists(select 1 from public.profiles
    where id=auth.uid() and role='league_admin' and archived_at is null) then
    raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED';
  end if;
  if p_season is null or p_season<>btrim(p_season) or length(p_season) not between 1 and 20
    or p_scope is null or p_scope not in ('all','semifinal','final')
    or p_present_only is null or p_repeat_allowed is null then
    raise exception using errcode='22023',message='RAFFLE_INVALID_OPTIONS';
  end if;
  select * into settings from public.admin_settings
    order by updated_at desc nulls last,id desc limit 1;
  if settings.season_year is distinct from p_season then
    raise exception using errcode='22023',message='RAFFLE_CURRENT_SEASON_REQUIRED';
  end if;
  if settings.qualification_start is null or settings.qualification_end is null
    or settings.qualification_end < settings.qualification_start then
    raise exception using errcode='22023',message='RAFFLE_QUALIFICATION_DATES_REQUIRED';
  end if;
  select id into ev from public.competition_day_events where season_year=p_season;
  if ev is null then
    raise exception using errcode='22023',message='RAFFLE_EVENT_REQUIRED';
  end if;

  with visits as (
    select r.profile_id,least(8,count(distinct rt.gym_id))::integer visits
    from public.results r join public.routes rt on rt.id=r.route_id
    where r.status='climbed'
      and r.created_at >= (settings.qualification_start::timestamp at time zone 'Europe/Berlin')
      and r.created_at < ((settings.qualification_end+1)::timestamp at time zone 'Europe/Berlin')
    group by r.profile_id
  ), candidates as (
    select p.id profile_id,concat_ws(' ',p.first_name,p.last_name) name,
      coalesce(v.visits,0) visits,
      exists(select 1 from public.finale_registrations f where f.profile_id=p.id
        and f.season_year=p_season and f.registration_status='registered') final_registration
    from public.profiles p left join visits v on v.profile_id=p.id
    where p.role='participant' and p.participation_activated_at is not null and p.archived_at is null
      and (p_repeat_allowed or not exists(select 1 from public.competition_raffle_draws d
        where d.event_id=ev and d.profile_id=p.id))
      and (p_scope='all' or (
        not exists(select 1 from public.competition_final_exclusions x
          where x.event_id=ev and x.profile_id=p.id and x.status in ('dns','withdrawn'))
        and (not p_present_only or exists(select 1 from public.competition_attendance a
          where a.event_id=ev and a.profile_id=p.id and a.status='arrived'))
        and (
          (p_scope='semifinal' and exists(select 1 from public.finale_registrations f
            where f.profile_id=p.id and f.season_year=p_season and f.registration_status='registered'))
          or (p_scope='final' and exists(select 1 from public.competition_final_entries fe
            join public.competition_final_classes fc on fc.id=fe.class_id
            where fc.event_id=ev and fc.phase<>'preparation' and fe.profile_id=p.id and fe.status='ready'))
        )
      ))
  ), weighted as (
    select c.*,c.visits+case when c.final_registration then 1 else 0 end tickets
    from candidates c
  )
  select coalesce(jsonb_agg(jsonb_build_object('profile_id',profile_id,'name',name,
    'visits',visits,'final_registration',final_registration,'tickets',tickets) order by profile_id),'[]'::jsonb),
    coalesce(sum(tickets),0),count(*)::integer
  into entries,total,participant_count from weighted where tickets>0;
  if total>2147483647 then
    raise exception using errcode='22023',message='RAFFLE_POOL_TOO_LARGE';
  end if;
  return jsonb_build_object('event_id',ev,'season',p_season,'scope',p_scope,
    'present_only',p_scope<>'all' and p_present_only,'repeat_allowed',p_repeat_allowed,
    'entries',entries,'pool_count',participant_count,'total_tickets',total,
    'qualification_start',settings.qualification_start,'qualification_end',settings.qualification_end,
    'weight_rule','distinct_climbed_gyms_max_8_plus_registered_final_1');
end $$;
revoke all on function public.competition_raffle_pool(text,text,boolean,boolean) from public,anon,authenticated;

-- Deliberately omit the full private pool snapshot and actor from UI responses.
create function public.competition_raffle_draw_json(p_draw public.competition_raffle_draws)
returns jsonb language sql immutable set search_path=pg_catalog as $$
  select jsonb_build_object('id',(p_draw).id,'request_id',(p_draw).request_id,
    'winner_name',(p_draw).winner_name,'profile_id',(p_draw).profile_id,'tickets',(p_draw).tickets,
    'total_tickets',(p_draw).total_tickets,'pool_count',(p_draw).pool_count,
    'scope',(p_draw).scope,'present_only',(p_draw).present_only,'repeat_allowed',(p_draw).repeat_allowed,
    'prize',(p_draw).prize,'created_at',(p_draw).created_at);
$$;
revoke all on function public.competition_raffle_draw_json(public.competition_raffle_draws) from public,anon,authenticated;

create function public.get_competition_raffle(
  p_season text,p_scope text default 'semifinal',p_present_only boolean default true,
  p_repeat_allowed boolean default false
)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare pool jsonb; history jsonb;
begin
  pool:=public.competition_raffle_pool(p_season,p_scope,p_present_only,p_repeat_allowed);
  select coalesce(jsonb_agg(public.competition_raffle_draw_json(d) order by d.created_at desc,d.id),'[]'::jsonb)
    into history from public.competition_raffle_draws d where d.event_id=(pool->>'event_id')::uuid;
  return pool || jsonb_build_object('history',history);
end $$;

create function public.draw_competition_raffle(
  p_season text,p_scope text,p_present_only boolean,p_request_id uuid,
  p_prize text default null,p_repeat_allowed boolean default false
)
returns jsonb language plpgsql volatile security definer set search_path=pg_catalog as $$
declare ev uuid; pool jsonb; previous public.competition_raffle_draws;
  selected integer; cumulative integer:=0; candidate jsonb; winner jsonb;
  normalized_prize text; effective_present boolean;
begin
  if auth.uid() is null then
    raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED';
  end if;
  if not public.is_league_admin() or not exists(select 1 from public.profiles
    where id=auth.uid() and role='league_admin' and archived_at is null) then
    raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED';
  end if;
  if p_request_id is null or p_scope is null or p_scope not in ('all','semifinal','final')
    or p_present_only is null or p_repeat_allowed is null or p_season is null
    or p_season<>btrim(p_season) or length(p_season) not between 1 and 20 then
    raise exception using errcode='22023',message='RAFFLE_INVALID_OPTIONS';
  end if;
  normalized_prize:=nullif(btrim(p_prize),'');
  if length(normalized_prize)>120 then
    raise exception using errcode='22023',message='RAFFLE_PRIZE_TOO_LONG';
  end if;
  effective_present:=p_scope<>'all' and p_present_only;
  -- All draws and filter switches serialize on the same season event row.
  -- No retry, double-click or parallel display may select two copies of a person.
  select id into ev from public.competition_day_events where season_year=p_season for update;
  if ev is null then
    raise exception using errcode='22023',message='RAFFLE_EVENT_REQUIRED';
  end if;
  select * into previous from public.competition_raffle_draws where event_id=ev and request_id=p_request_id;
  if previous.id is not null then
    if previous.scope is distinct from p_scope or previous.present_only is distinct from effective_present
      or previous.prize is distinct from normalized_prize or previous.repeat_allowed is distinct from p_repeat_allowed then
      raise exception using errcode='22023',message='RAFFLE_REQUEST_CONFLICT';
    end if;
    return public.competition_raffle_draw_json(previous);
  end if;
  -- Build a fresh pool only after the previous concurrent draw has committed.
  pool:=public.competition_raffle_pool(p_season,p_scope,effective_present,p_repeat_allowed);
  if (pool->>'total_tickets')::integer=0 then
    raise exception using errcode='22023',message='RAFFLE_POOL_EMPTY';
  end if;
  selected:=public.competition_raffle_random_ticket((pool->>'total_tickets')::integer);
  for candidate in select value from jsonb_array_elements(pool->'entries') loop
    cumulative:=cumulative+(candidate->>'tickets')::integer;
    if selected<=cumulative then winner:=candidate; exit; end if;
  end loop;
  if winner is null then raise exception 'RAFFLE_INVALID_POOL'; end if;
  insert into public.competition_raffle_draws(event_id,request_id,scope,present_only,repeat_allowed,
    prize,profile_id,winner_name,tickets,total_tickets,pool_count,selected_ticket,pool_snapshot,actor_id)
  values(ev,p_request_id,p_scope,effective_present,p_repeat_allowed,normalized_prize,
    (winner->>'profile_id')::uuid,winner->>'name',(winner->>'tickets')::integer,
    (pool->>'total_tickets')::integer,(pool->>'pool_count')::integer,selected,pool,auth.uid())
  returning * into previous;
  return public.competition_raffle_draw_json(previous);
end $$;

revoke all on function public.get_competition_raffle(text,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.draw_competition_raffle(text,text,boolean,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.get_competition_raffle(text,text,boolean,boolean) to authenticated;
grant execute on function public.draw_competition_raffle(text,text,boolean,uuid,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
