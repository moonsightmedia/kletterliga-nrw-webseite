begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Extend the existing password-protected read RPC with anonymous aggregates.
-- No participant identities, attendance details or additional writes are exposed.
create or replace function public.get_competition_judge_routes(p_season text, p_password text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_access public.competition_day_judge_access;
begin
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
  perform public.close_expired_competition_semifinal(p_season);
  select * into v_event from public.competition_day_events where id=v_event.id;

  return (
    with participants as (
      select p.id, e.league, e.class_label, a.status as attendance
      from public.semifinal_eligibility e
      join public.profiles p on p.id=e.profile_id
      join public.finale_registrations f on f.profile_id=p.id and f.season_year=e.season_year and f.registration_status='registered'
      left join public.competition_attendance a on a.event_id=v_event.id and a.profile_id=p.id
      where e.season_year=p_season and e.status='eligible'
        and p.role='participant' and p.archived_at is null and p.participation_activated_at is not null
        and a.status is distinct from 'absent'
        and not exists(select 1 from public.competition_final_exclusions ex where ex.event_id=v_event.id and ex.profile_id=p.id)
    ), class_counts as (
      select cr.route_id, c.league, c.class_label,
        count(p.id)::integer as total,
        count(p.id) filter(where x.id is not null or st.route_id is not null)::integer as completed,
        count(p.id) filter(where x.id is null and st.route_id is null)::integer as remaining,
        count(p.id) filter(where x.id is null and st.route_id is null and p.attendance is distinct from 'arrived')::integer as not_checked_in
      from public.competition_day_class_routes cr
      join public.competition_day_classes c on c.id=cr.class_id and c.event_id=cr.event_id
      left join participants p on p.league=c.league and p.class_label=c.class_label
      left join public.competition_day_results x on x.event_id=v_event.id and x.route_id=cr.route_id and x.profile_id=p.id
      left join public.competition_semifinal_settlements st on st.event_id=v_event.id and st.route_id=cr.route_id and st.profile_id=p.id
      where cr.event_id=v_event.id
      group by cr.route_id,c.id,c.league,c.class_label
    ), route_counts as (
      select route_id, jsonb_agg(jsonb_build_object('league',league,'class_label',class_label,'total',total,'completed',completed,'remaining',remaining,'not_checked_in',not_checked_in) order by league,class_label) as classes,
        jsonb_build_object('total',sum(total),'completed',sum(completed),'remaining',sum(remaining),'not_checked_in',sum(not_checked_in)) as progress
      from class_counts group by route_id
    )
    select jsonb_build_object(
      'event', jsonb_build_object('id',v_event.id,'phase',v_event.phase,'submission_deadline_at',v_event.submission_deadline_at),
      'routes', coalesce((select jsonb_agg(jsonb_build_object(
        'id',r.id,'number',r.route_number,'name',r.name,'grade',r.grade,'color',r.color,'qr_token',r.qr_token,
        'classes',coalesce(rc.classes,'[]'::jsonb),
        'progress',coalesce(rc.progress,jsonb_build_object('total',0,'completed',0,'remaining',0,'not_checked_in',0))) order by r.route_number)
        from public.competition_day_routes r left join route_counts rc on rc.route_id=r.id where r.event_id=v_event.id),'[]'::jsonb))
  );
end; $$;

revoke all on function public.get_competition_judge_routes(text,text) from public;
grant execute on function public.get_competition_judge_routes(text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
