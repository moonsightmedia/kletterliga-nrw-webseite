-- Read-only reporting. No response data, write permissions or retention changes.
begin;
create or replace function public.admin_ideas_survey_2027_report(
  p_status text default 'all', p_offset integer default 0,
  p_limit integer default 20, p_text_only boolean default false
) returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare result jsonb;
begin
  if not coalesce(public.is_league_admin(), false)
    or not exists(select 1 from public.profiles where id=auth.uid() and archived_at is null)
  then raise exception using errcode='42501', message='LEAGUE_ADMIN_REQUIRED'; end if;
  if p_status is null or p_status not in ('all','completed','partial')
    or p_offset is null or p_offset < 0 or p_offset > 1000000
    or p_limit is null or p_limit < 1 or p_limit > 50 or p_text_only is null
  then raise exception using errcode='22023', message='INVALID_SURVEY_REPORT_FILTER'; end if;

  with active as materialized (
    select submission_id,survey_version,answers,created_at,updated_at,completed
    from public.ideas_survey_2027
    where not withdrawn and public.ideas_survey_2027_is_open()
  ), scoped as materialized (
    select * from active where p_status='all' or completed=(p_status='completed')
  ), normalized as (
    -- Match the combined choices shown in the public questionnaire, not the
    -- internal yes/child storage. An unfinished yes is never a vote for a policy.
    select submission_id,answers,answers || jsonb_build_object(
      'team_mode',case when answers->>'team_mode'='yes' then coalesce(answers->>'team_scoring','yes_unspecified') else answers->>'team_mode' end,
      'shirt_interest',case when answers->>'shirt_interest'='yes' then coalesce(answers->>'shirt_policy','yes_unspecified') else answers->>'shirt_interest' end,
      'pro_league',case when answers->>'pro_league'='yes' then coalesce(answers->>'pro_rule','yes_unspecified') else answers->>'pro_league' end
    ) as display_answers from scoped
  ), fields(field) as (
    values ('digitalization'),('paper_cards'),('team_mode'),('team_size'),
      ('shirt_interest'),('pro_league'),('league_changes'),('qual_weight'),
      ('hall_model'),('hall_count'),('community_events'),('weighting')
  ), eligible as (
    select f.field,n.submission_id,n.display_answers from fields f cross join normalized n
    where f.field <> 'team_size' or n.answers->>'team_mode'='yes'
  ), selections as (
    select e.field,e.submission_id,v.value from eligible e
    cross join lateral jsonb_array_elements_text(
      case when e.field='league_changes' then coalesce(e.display_answers->e.field,'[]'::jsonb)
      when e.display_answers->>e.field is not null then jsonb_build_array(e.display_answers->>e.field)
      else '[]'::jsonb end
    ) v(value)
  ), option_counts as (
    select field,value,count(*) as votes from selections group by field,value
  ), question_reports as (
    select f.field,jsonb_build_object(
      'eligible',(select count(*) from eligible e where e.field=f.field),
      'answered',(select count(distinct s.submission_id) from selections s where s.field=f.field),
      'counts',coalesce((select jsonb_object_agg(c.value,c.votes) from option_counts c where c.field=f.field),'{}'::jsonb)
    ) as report from fields f
  ), detail_rows as (
    select * from scoped where not p_text_only
      or nullif(btrim(answers->>'league_idea'),'') is not null
      or nullif(btrim(answers->>'weighting_idea'),'') is not null
  ), page_rows as (
    select * from detail_rows order by updated_at desc,submission_id desc limit p_limit offset p_offset
  ) select jsonb_build_object(
    'total',(select count(*) from active),
    'completed',(select count(*) from active where completed),
    'partial',(select count(*) from active where not completed),
    'scoped_total',(select count(*) from scoped),
    'matched',(select count(*) from detail_rows),
    'latest_at',(select max(updated_at) from scoped),
    'fetched_at',current_timestamp,
    'questions',(select jsonb_object_agg(field,report) from question_reports),
    'entries',coalesce((select jsonb_agg(jsonb_build_object(
      'submission_id',submission_id,'survey_version',survey_version,'answers',answers,
      'created_at',created_at,'updated_at',updated_at,'completed',completed
    ) order by updated_at desc,submission_id desc) from page_rows),'[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_ideas_survey_2027_report(text,integer,integer,boolean) from public,anon;
grant execute on function public.admin_ideas_survey_2027_report(text,integer,integer,boolean) to authenticated;
comment on function public.admin_ideas_survey_2027_report(text,integer,integer,boolean) is
  'Active league admins only. All-response aggregates and bounded detail page from one snapshot. Status scopes charts; text-only scopes details only. Withdrawn/expired responses excluded. No write capabilities or consent receipts returned.';
commit;
