-- A confirmed no-show has no sporting semifinal rank. Preserve unresolved
-- registrations, explicit zero results and withdrawn competitors' earned scores.
begin;
set local lock_timeout='5s';
do $$
declare definition text; anchor text; guard text; target record;
begin
  for target in select * from (values
    ('public.list_competition_standings(text)',
     'group by e.league,e.class_label,p.id,p.first_name,p.last_name','v_event.id'),
    ('public.get_competition_live(text)',
     'group by el.league,el.class_label,p.id,p.first_name,p.last_name','ev.id')
  ) as targets(function_name,group_anchor,event_expression)
  loop
    definition:=pg_get_functiondef(target.function_name::regprocedure);
    anchor:=target.group_anchor;
    if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then
      raise exception 'Semifinal ranking selection has changed: %; review required',target.function_name;
    end if;
    guard:='and not exists(select 1 from public.competition_final_exclusions ex '
      ||'where ex.event_id='||target.event_expression||' and ex.profile_id=p.id and ex.status=''dns'') ';
    if position(guard in definition)>0 then raise exception 'No-show filter already installed: %',target.function_name; end if;
    execute replace(definition,anchor,guard||anchor);
  end loop;
end $$;
-- Existing RPC grants, preparation privacy, final standings, notice publication
-- and field selection stay intact; no attendance metadata becomes public.
notify pgrst,'reload schema';
commit;
