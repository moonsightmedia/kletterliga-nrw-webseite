-- Same published semifinal scores as the live display, independent of TV rotation.
-- No profile IDs, contact data, credentials, or write capabilities are exposed.
begin;
create function public.get_competition_semifinal_public(p_season text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $function$
declare v_event public.competition_day_events;
begin
  select * into v_event from public.competition_day_events where season_year=p_season;
  if v_event.id is null or v_event.phase='draft' then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(to_jsonb(q) order by q.league,q.class_label,q.rank,q.name) from (
    select e.league,e.class_label,concat_ws(' ',p.first_name,p.last_name) as name,
      coalesce(sum(x.points),0) as points,count(distinct x.route_id)::integer as completed_routes,
      rank() over(partition by e.league,e.class_label order by coalesce(sum(x.points),0) desc) as rank
    from public.semifinal_eligibility e join public.profiles p on p.id=e.profile_id
      join public.finale_registrations f on f.profile_id=p.id and f.season_year=e.season_year and f.registration_status='registered'
      left join public.competition_day_results x on x.event_id=v_event.id and x.profile_id=p.id
    where e.season_year=v_event.season_year and e.status='eligible' and e.league is not null and e.class_label is not null
      and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null
      and not exists(select 1 from public.competition_final_exclusions ex where ex.event_id=v_event.id and ex.profile_id=p.id and ex.status='dns')
    group by e.league,e.class_label,p.id,p.first_name,p.last_name
  ) q),'[]'::jsonb);
end;
$function$;
revoke all on function public.get_competition_semifinal_public(text) from public;
grant execute on function public.get_competition_semifinal_public(text) to anon, authenticated, service_role;
commit;
