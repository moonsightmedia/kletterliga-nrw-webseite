begin;
set local lock_timeout='3s';
set local statement_timeout='30s';

alter table public.competition_final_exclusions drop constraint competition_final_exclusions_status_check;
alter table public.competition_final_exclusions add constraint competition_final_exclusions_status_check
  check (status in ('dns','withdrawn','aw'));

-- Central scoring projection: display by points, official rank without AW/DNS.
-- Private IDs/exclusion reasons remain accessible only through authorized wrappers.
create function public.competition_semifinal_rows(p_event uuid)
returns table(profile_id uuid,name text,league text,class_label text,points numeric,
  completed_routes integer,rank bigint,is_out_of_competition boolean,excluded text)
language sql stable security definer set search_path=public as $rows$
  with scores as (
    select p.id profile_id,concat_ws(' ',p.first_name,p.last_name) name,e.league,e.class_label,
      coalesce(sum(r.points),0) points,count(distinct r.route_id)::integer completed_routes,
      ex.status excluded
    from public.competition_day_events ev
      join public.semifinal_eligibility e on e.season_year=ev.season_year
      join public.profiles p on p.id=e.profile_id
      join public.finale_registrations f on f.profile_id=p.id and f.season_year=e.season_year and f.registration_status='registered'
      left join public.competition_day_results r on r.event_id=ev.id and r.profile_id=p.id
      left join public.competition_final_exclusions ex on ex.event_id=ev.id and ex.profile_id=p.id
    where ev.id=p_event and e.status='eligible' and e.league is not null and e.class_label is not null
      and p.role='participant' and p.participation_activated_at is not null and p.archived_at is null
    group by p.id,p.first_name,p.last_name,e.league,e.class_label,ex.status
  )
  select s.profile_id,s.name,s.league,s.class_label,s.points,s.completed_routes,
    case when coalesce(s.excluded,'') in ('aw','dns') then null else
      rank() over(partition by s.league,s.class_label,(coalesce(s.excluded,'') in ('aw','dns')) order by s.points desc)
    end as rank,coalesce(s.excluded='aw',false) as is_out_of_competition,s.excluded
  from scores s;
$rows$;
revoke all on function public.competition_semifinal_rows(uuid) from public,anon,authenticated;

-- Preserve live authorization and deadline guards; replace only scoring projections.
do $migration$
declare def text; start_at integer; end_at integer; replacement text;
begin
  def:=pg_get_functiondef('public.list_competition_standings(text)'::regprocedure);
  start_at:=strpos(def,'  return coalesce(');
  if start_at=0 or strpos(def,'COMPETITION_NOT_ELIGIBLE')=0 then raise exception 'Unexpected protected standings definition'; end if;
  def:=left(def,start_at-1)||$tail$
  return coalesce((select jsonb_agg(to_jsonb(q)-'excluded' order by q.league,q.class_label,q.points desc,q.name)
    from public.competition_semifinal_rows(v_event.id) q where q.excluded is distinct from 'dns'),'[]'::jsonb);
end;
$function$
$tail$;
  execute def;

  def:=pg_get_functiondef('public.get_competition_semifinal_public(text)'::regprocedure);
  start_at:=strpos(def,'  return coalesce(');
  if start_at=0 or strpos(def,'v_event.phase=''draft''')=0 then raise exception 'Unexpected public standings definition'; end if;
  def:=left(def,start_at-1)||$tail$
  return coalesce((select jsonb_agg(to_jsonb(q)-'profile_id'-'excluded' order by q.league,q.class_label,q.points desc,q.name)
    from public.competition_semifinal_rows(v_event.id) q where q.excluded is distinct from 'dns'),'[]'::jsonb);
end;
$function$
$tail$;
  execute def;

  def:=pg_get_functiondef('public.get_competition_live(text)'::regprocedure);
  start_at:=strpos(def,'    else coalesce(');
  end_at:=strpos(def,'''notices'',coalesce(');
  if start_at=0 or end_at<=start_at then raise exception 'Unexpected TV scoring projection'; end if;
  replacement:=$tv$
    else coalesce((select jsonb_agg(jsonb_build_object('key',q.league||'|'||q.class_label,'league',q.league,'class_label',q.class_label,'entries',q.entries) order by q.league,q.class_label)
      from (select r.league,r.class_label,jsonb_agg(jsonb_build_object('name',r.name,'rank',r.rank,'points',r.points,'completed',r.completed_routes,'is_out_of_competition',r.is_out_of_competition)
        order by r.points desc,r.name) entries from public.competition_semifinal_rows(ev.id) r
        where r.excluded is distinct from 'dns' group by r.league,r.class_label) q),'[]'::jsonb) end,
    $tv$;
  execute left(def,start_at-1)||replacement||substring(def from end_at);

  def:=pg_get_functiondef('public.get_competition_final_admin(text)'::regprocedure);
  start_at:=strpos(def,'''semifinal'',coalesce(');
  end_at:=strpos(def,'''semifinal_results'',coalesce(');
  if start_at=0 or end_at<=start_at then raise exception 'Unexpected admin scoring projection'; end if;
  replacement:=$admin$
    'semifinal',coalesce((select jsonb_agg(jsonb_build_object('profile_id',q.profile_id,'name',q.name,'league',q.league,'class_label',q.class_label,'points',q.points,'completed',q.completed_routes,'rank',q.rank,'is_out_of_competition',q.is_out_of_competition,'excluded',q.excluded,
      'missing',coalesce((select jsonb_agg(jsonb_build_object('route_id',cr.route_id,'number',r.route_number,'settled',st.route_id is not null) order by r.route_number)
        from public.competition_day_classes c join public.competition_day_class_routes cr on cr.class_id=c.id
          join public.competition_day_routes r on r.id=cr.route_id
          left join public.competition_day_results rx on rx.event_id=ev.id and rx.profile_id=q.profile_id and rx.route_id=cr.route_id
          left join public.competition_semifinal_settlements st on st.event_id=ev.id and st.profile_id=q.profile_id and st.route_id=cr.route_id
        where c.event_id=ev.id and c.league=q.league and c.class_label=q.class_label and rx.id is null),'[]'::jsonb))
      order by q.league,q.class_label,q.points desc,q.name) from public.competition_semifinal_rows(ev.id) q),'[]'::jsonb),
    $admin$;
  execute left(def,start_at-1)||replacement||substring(def from end_at);

  def:=pg_get_functiondef('public.publish_competition_final_class(text,text,text,uuid,smallint,integer)'::regprocedure);
  start_at:=strpos(def,'with scores as (');
  end_at:=strpos(def,', available as (');
  if start_at=0 or end_at<=start_at or strpos(def,'ex.status in (''dns'',''withdrawn'')')=0 then raise exception 'Unexpected final selection definition'; end if;
  replacement:=$selection$with ranked as (select r.profile_id,r.points,r.rank as semifinal_rank
    from public.competition_semifinal_rows(ev.id) r where r.league=p_league and r.class_label=p_label
      and not r.is_out_of_competition and r.excluded is distinct from 'dns')$selection$;
  def:=left(def,start_at-1)||replacement||substring(def from end_at);
  def:=replace(def,'ex.status in (''dns'',''withdrawn'')','ex.status in (''dns'',''withdrawn'',''aw'')');
  execute def;

  def:=pg_get_functiondef('public.set_competition_final_exclusion(text,uuid,text,text)'::regprocedure);
  if strpos(def,'p_status not in (''dns'',''withdrawn'')')=0 then raise exception 'Unexpected exclusion setter'; end if;
  execute replace(def,'p_status not in (''dns'',''withdrawn'')','p_status not in (''dns'',''withdrawn'',''aw'')');
end;
$migration$;
commit;
