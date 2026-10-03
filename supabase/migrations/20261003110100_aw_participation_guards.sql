begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
-- AW is a scoring status, not an absence: preserve judge and arrival workflows.
do $$ declare def text; anchor text;
begin
  def:=pg_get_functiondef('public.get_competition_judge_routes(text,text)'::regprocedure);
  anchor:='ex.event_id=v_event.id and ex.profile_id=p.id)';
  if strpos(def,anchor)=0 then raise exception 'Judge availability guard changed'; end if;
  execute replace(def,anchor,'ex.event_id=v_event.id and ex.profile_id=p.id and ex.status<>''aw'')');
  def:=pg_get_functiondef('public.get_competition_attendance(text,text)'::regprocedure);
  anchor:='x.event_id=ev.id and x.profile_id=p.id)';
  if strpos(def,anchor)=0 then raise exception 'Attendance availability guard changed'; end if;
  execute replace(def,anchor,'x.event_id=ev.id and x.profile_id=p.id and x.status<>''aw'')');
  def:=pg_get_functiondef('public.set_competition_attendance(text,uuid,text,integer,uuid,text,text)'::regprocedure);
  anchor:='competition_final_exclusions where event_id=ev.id and profile_id=p_profile)';
  if strpos(def,anchor)=0 then raise exception 'Arrival guard changed'; end if;
  execute replace(def,anchor,'competition_final_exclusions where event_id=ev.id and profile_id=p_profile and status<>''aw'')');
end $$;
notify pgrst,'reload schema';
commit;
