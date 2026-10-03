begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

-- Every persisted win consumes one ticket, across all filters and screens.
-- Existing immutable draw records and private audit snapshots remain untouched.
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
    from public.competition_raffle_draws d where d.event_id=ev group by d.profile_id
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

create or replace function public.competition_raffle_draw_json(p_draw public.competition_raffle_draws)
returns jsonb language sql immutable set search_path=pg_catalog as $$
  select jsonb_build_object('id',(p_draw).id,'request_id',(p_draw).request_id,
    'winner_name',(p_draw).winner_name,'profile_id',(p_draw).profile_id,'tickets',(p_draw).tickets,
    'remaining_tickets',case when (p_draw).pool_snapshot->>'weight_rule'='distinct_climbed_gyms_max_8_plus_registered_final_1_minus_event_wins'
      then greatest(0,(p_draw).tickets-1) else null end,
    'total_tickets',(p_draw).total_tickets,'pool_count',(p_draw).pool_count,
    'scope',(p_draw).scope,'present_only',(p_draw).present_only,'repeat_allowed',(p_draw).repeat_allowed,
    'prize',(p_draw).prize,'created_at',(p_draw).created_at);
$$;

-- Only an authenticated league admin can export contact information for dispatch.
-- The TV history itself does not receive email addresses.
create function public.export_competition_raffle_winners(p_season text)
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
  into exported from public.competition_raffle_draws d left join public.profiles p on p.id=d.profile_id
  where d.event_id=ev;
  return exported;
end $$;
revoke all on function public.export_competition_raffle_winners(text) from public,anon,authenticated;
grant execute on function public.export_competition_raffle_winners(text) to authenticated;
-- CREATE OR REPLACE retains the existing private helpers' revocations.
notify pgrst,'reload schema';
commit;
