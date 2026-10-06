-- Read-only feedback access for active league admins. The table stays private.
create or replace function public.admin_season_feedback_2026(
  p_participation text default null,
  p_topic text default null,
  p_next_year text default null,
  p_search text default null,
  p_offset integer default 0,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not coalesce(public.is_league_admin(), false)
    or not exists (select 1 from public.profiles where id = auth.uid() and archived_at is null)
  then
    raise exception using errcode = '42501', message = 'LEAGUE_ADMIN_REQUIRED';
  end if;

  if (p_participation is not null and p_participation not in ('active','followed','not_participated','spectator'))
    or (p_topic is not null and p_topic not in ('routes','halls','timing','scoring'))
    or (p_next_year is not null and p_next_year not in ('yes','maybe','no','unanswered'))
    or p_offset is null or p_offset < 0
    or p_limit is null or p_limit < 1 or p_limit > 50
    or char_length(coalesce(p_search, '')) > 200
  then
    raise exception using errcode = '22023', message = 'INVALID_FEEDBACK_FILTER';
  end if;

  with all_answers as (
    select f.*,
      case when survey_version = 4 then coalesce(details->'deep_dive_topics', '[]'::jsonb)
      else to_jsonb(array_remove(array[
        case when coalesce(details->>'route_quantity','') <> '' or coalesce(details->>'route_ideas','') <> '' then 'routes' end,
        case when coalesce(details->>'hall_quantity','') <> '' or coalesce(details->>'hall_choice','') <> '' or coalesce(details->>'hall_ideas','') <> '' then 'halls' end,
        case when coalesce(details->>'season_distribution','') <> '' or coalesce(details->>'distribution_ideas','') <> '' then 'timing' end,
        case when coalesce(details->>'drop_stations','') <> '' or coalesce(details->>'drop_stations_ideas','') <> '' then 'scoring' end
      ], null)) end as topics
    from public.season_feedback_2026 f
  ), filtered as (
    select * from all_answers
    where (p_participation is null or participation = p_participation)
      and (p_topic is null or topics ? p_topic)
      and (p_next_year is null or case when p_next_year = 'unanswered' then coalesce(next_year,'') = '' else next_year = p_next_year end)
      and (nullif(trim(p_search),'') is null or strpos(lower(concat_ws(' ', comment, details::text)), lower(trim(p_search))) > 0)
  ), page_rows as (
    select * from filtered order by created_at desc, id desc limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from all_answers),
    'matched', (select count(*) from filtered),
    'latest_at', (select max(created_at) from all_answers),
    'summary', (select jsonb_build_object(
      'perspectives', jsonb_build_object(
        'active', count(*) filter (where participation='active'),
        'followed', count(*) filter (where participation='followed'),
        'not_participated', count(*) filter (where participation='not_participated'),
        'spectator', count(*) filter (where participation='spectator')),
      'next_year', jsonb_build_object(
        'yes', count(*) filter (where next_year='yes'),
        'maybe', count(*) filter (where next_year='maybe'),
        'no', count(*) filter (where next_year='no'),
        'unanswered', count(*) filter (where coalesce(next_year,'')='')),
      'topics', jsonb_build_object(
        'routes', count(*) filter (where topics ? 'routes'),
        'halls', count(*) filter (where topics ? 'halls'),
        'timing', count(*) filter (where topics ? 'timing'),
        'scoring', count(*) filter (where topics ? 'scoring'))
    ) from all_answers),
    'entries', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'created_at', created_at, 'survey_version', survey_version,
      'participation', participation, 'next_year', next_year,
      'overall_rating', overall_rating, 'best_aspect', best_aspect,
      'improve_aspect', improve_aspect, 'comment', comment, 'details', details, 'topics', topics
    ) order by created_at desc, id desc) from page_rows), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.admin_season_feedback_2026(text,text,text,text,integer,integer) from public, anon;
grant execute on function public.admin_season_feedback_2026(text,text,text,text,integer,integer) to authenticated;
comment on function public.admin_season_feedback_2026(text,text,text,text,integer,integer) is
  'Read-only, paginated anonymous season feedback for active league admins; no direct table access or profile linkage.';
