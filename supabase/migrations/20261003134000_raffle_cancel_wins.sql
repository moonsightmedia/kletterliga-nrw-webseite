begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Immutable cancellation ledger: no draw is erased or changed.
create table public.competition_raffle_cancel_batches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.competition_day_events(id),
  request_id uuid not null,
  draw_ids uuid[] not null,
  reset_all boolean not null,
  cancelled_count integer not null check(cancelled_count>=0),
  actor_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(event_id,request_id)
);
create table public.competition_raffle_cancellations (
  draw_id uuid primary key references public.competition_raffle_draws(id),
  batch_id uuid not null references public.competition_raffle_cancel_batches(id)
);
alter table public.competition_raffle_cancel_batches enable row level security;
alter table public.competition_raffle_cancellations enable row level security;
revoke all on public.competition_raffle_cancel_batches,public.competition_raffle_cancellations from public,anon,authenticated;
create trigger competition_raffle_cancel_batches_immutable before update or delete on public.competition_raffle_cancel_batches
  for each row execute function public.guard_competition_raffle_immutable();
create trigger competition_raffle_cancellations_immutable before update or delete on public.competition_raffle_cancellations
  for each row execute function public.guard_competition_raffle_immutable();
create view public.competition_raffle_active_draws as
  select d.* from public.competition_raffle_draws d
  where not exists(select 1 from public.competition_raffle_cancellations c where c.draw_id=d.id);
revoke all on public.competition_raffle_active_draws from public,anon,authenticated;


create or replace function public.competition_raffle_pool(
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
  ), wins as (
    select d.profile_id,count(*)::integer used
    from public.competition_raffle_active_draws d where d.event_id=ev group by d.profile_id
  ), candidates as (
    select p.id profile_id,concat_ws(' ',p.first_name,p.last_name) name,
      coalesce(v.visits,0) visits,coalesce(w.used,0) wins,
      exists(select 1 from public.finale_registrations f where f.profile_id=p.id
        and f.season_year=p_season and f.registration_status='registered') final_registration
    from public.profiles p left join visits v on v.profile_id=p.id left join wins w on w.profile_id=p.id
    where p.role='participant' and p.participation_activated_at is not null and p.archived_at is null
      and (p_repeat_allowed or coalesce(w.used,0)=0)
      and (p_scope='all' or (
        -- "semifinal" remains the wire/audit value for the present-only UI.
        -- Presence, not sporting qualification or final registration, decides.
        (not p_present_only or exists(select 1 from public.competition_attendance a
          where a.event_id=ev and a.profile_id=p.id and a.status='arrived'))
        and (p_scope='semifinal' or (p_scope='final' and exists(
          select 1 from public.competition_final_entries fe
          join public.competition_final_classes fc on fc.id=fe.class_id
          where fc.event_id=ev and fc.phase<>'preparation' and fe.profile_id=p.id and fe.status='ready')))
      ))
  ), weighted as (
    select c.*,c.visits+case when c.final_registration then 1 else 0 end initial_tickets,
      greatest(0,c.visits+case when c.final_registration then 1 else 0 end-c.wins) tickets
    from candidates c
  )
  select coalesce(jsonb_agg(jsonb_build_object('profile_id',profile_id,'name',name,
    'visits',visits,'final_registration',final_registration,'tickets',tickets,
    'initial_tickets',initial_tickets,'wins',wins) order by profile_id),'[]'::jsonb),
    coalesce(sum(tickets),0),count(*)::integer
  into entries,total,participant_count from weighted where tickets>0;
  if total>2147483647 then
    raise exception using errcode='22023',message='RAFFLE_POOL_TOO_LARGE';
  end if;
  return jsonb_build_object('event_id',ev,'season',p_season,'scope',p_scope,
    'present_only',p_scope<>'all' and p_present_only,'repeat_allowed',p_repeat_allowed,
    'entries',entries,'pool_count',participant_count,'total_tickets',total,
    'qualification_start',settings.qualification_start,'qualification_end',settings.qualification_end,
    'weight_rule','distinct_climbed_gyms_max_8_plus_registered_final_1_minus_event_wins');
end $$;

create or replace function public.get_competition_raffle(
  p_season text,p_scope text default 'semifinal',p_present_only boolean default true,
  p_repeat_allowed boolean default false
)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare pool jsonb; history jsonb;
begin
  pool:=public.competition_raffle_pool(p_season,p_scope,p_present_only,p_repeat_allowed);
  select coalesce(jsonb_agg(public.competition_raffle_draw_json(row(d.*)::public.competition_raffle_draws) order by d.created_at desc,d.id),'[]'::jsonb)
    into history from public.competition_raffle_active_draws d where d.event_id=(pool->>'event_id')::uuid;
  return pool || jsonb_build_object('history',history);
end $$;

create or replace function public.export_competition_raffle_winners(p_season text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare ev uuid; exported jsonb;
begin
  if auth.uid() is null or not public.is_league_admin() or not exists(
    select 1 from public.profiles where id=auth.uid() and role='league_admin' and archived_at is null
  ) then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  if p_season is null or p_season<>btrim(p_season) or length(p_season) not between 1 and 20 then
    raise exception using errcode='22023',message='RAFFLE_INVALID_OPTIONS';
  end if;
  select id into ev from public.competition_day_events where season_year=p_season;
  if ev is null then raise exception using errcode='22023',message='RAFFLE_EVENT_REQUIRED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'profile_id',d.profile_id,
    'winner_name',d.winner_name,'email',p.email,'prize',d.prize,'created_at',d.created_at,
    'scope',d.scope) order by d.created_at,d.id),'[]'::jsonb)
  into exported from public.competition_raffle_active_draws d left join public.profiles p on p.id=d.profile_id
  where d.event_id=ev;
  return exported;
end $$;

create or replace function public.draw_competition_raffle(
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
    if exists(select 1 from public.competition_raffle_cancellations c where c.draw_id=previous.id) then
      raise exception using errcode='22023',message='RAFFLE_DRAW_CANCELLED';
    end if;
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

create function public.cancel_competition_raffle_wins(
  p_season text,p_draw_ids uuid[],p_reset_all boolean,p_request_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path=pg_catalog as $$
declare ev uuid; ids uuid[]; active_ids uuid[]; batch public.competition_raffle_cancel_batches;
  affected integer;
begin
  if auth.uid() is null or not public.is_league_admin() or not exists(
    select 1 from public.profiles where id=auth.uid() and role='league_admin' and archived_at is null
  ) then raise exception using errcode='42501',message='LEAGUE_ADMIN_REQUIRED'; end if;
  if p_season is null or p_season<>btrim(p_season) or length(p_season) not between 1 and 20
    or p_reset_all is null or p_request_id is null or p_draw_ids is null
    or cardinality(p_draw_ids) not between 1 and 10000
    or array_position(p_draw_ids,null) is not null
    or (not p_reset_all and cardinality(p_draw_ids)<>1) then
    raise exception using errcode='22023',message='RAFFLE_INVALID_OPTIONS';
  end if;
  select array_agg(distinct id order by id) into ids from unnest(p_draw_ids) id;
  if cardinality(ids)<>cardinality(p_draw_ids) then
    raise exception using errcode='22023',message='RAFFLE_INVALID_OPTIONS';
  end if;
  -- Same season lock as drawing: resetting cannot race a new win.
  select id into ev from public.competition_day_events where season_year=p_season for update;
  if ev is null then raise exception using errcode='22023',message='RAFFLE_EVENT_REQUIRED'; end if;
  select * into batch from public.competition_raffle_cancel_batches where event_id=ev and request_id=p_request_id;
  if batch.id is not null then
    if batch.draw_ids is distinct from ids or batch.reset_all is distinct from p_reset_all then
      raise exception using errcode='22023',message='RAFFLE_REQUEST_CONFLICT';
    end if;
    return jsonb_build_object('cancelled_count',batch.cancelled_count);
  end if;
  if (select count(*) from public.competition_raffle_draws where event_id=ev and id=any(ids))<>cardinality(ids) then
    raise exception using errcode='22023',message='RAFFLE_DRAW_NOT_FOUND';
  end if;
  if p_reset_all then
    select coalesce(array_agg(id order by id),'{}'::uuid[]) into active_ids
      from public.competition_raffle_active_draws where event_id=ev;
    if active_ids is distinct from ids then
      raise exception using errcode='22023',message='RAFFLE_HISTORY_CHANGED';
    end if;
  end if;
  select count(*) into affected from public.competition_raffle_active_draws where event_id=ev and id=any(ids);
  insert into public.competition_raffle_cancel_batches(event_id,request_id,draw_ids,reset_all,cancelled_count,actor_id)
    values(ev,p_request_id,ids,p_reset_all,affected,auth.uid()) returning * into batch;
  insert into public.competition_raffle_cancellations(draw_id,batch_id)
    select id,batch.id from public.competition_raffle_active_draws where event_id=ev and id=any(ids)
    on conflict(draw_id) do nothing;
  return jsonb_build_object('cancelled_count',affected);
end $$;
revoke all on function public.cancel_competition_raffle_wins(text,uuid[],boolean,uuid) from public,anon,authenticated;
grant execute on function public.cancel_competition_raffle_wins(text,uuid[],boolean,uuid) to authenticated;
notify pgrst,'reload schema';
commit;

