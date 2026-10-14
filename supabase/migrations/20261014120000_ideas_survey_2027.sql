-- 2027 ideas survey: anonymous preference responses, deliberately separate from
-- 2026 feedback. No account, name, email, device identifier or IP address.
begin;

create or replace function public.valid_ideas_survey_2027_answers(a jsonb)
returns boolean
language plpgsql immutable
set search_path = public, pg_temp
as $$
declare
  k text;
  v text;
  choices text[];
  parent_field text;
  changes jsonb;
begin
  if a is null or jsonb_typeof(a) <> 'object' then return false; end if;
  for k in select jsonb_object_keys(a) loop
    if k not in ('digitalization','paper_cards','team_mode','team_size','team_scoring',
      'shirt_interest','shirt_policy','pro_league','pro_rule','league_changes',
      'qual_weight','hall_model','hall_count','community_events','weighting','league_idea','weighting_idea') then return false; end if;
  end loop;
  foreach k in array array['digitalization','paper_cards','team_mode','shirt_interest','pro_league',
    'qual_weight','hall_model','hall_count','community_events','weighting'] loop
    if not (a ? k) or jsonb_typeof(a->k) <> 'string' then return false; end if;
    v := a->>k;
    choices := case k
      when 'qual_weight' then array['stronger','controlled_only','same','unsure']
      when 'hall_model' then array['all','regions','choose','unsure']
      when 'hall_count' then array['4','6','8','10','unsure']
      when 'community_events' then array['kickoff','during','both','none','unsure']
      when 'weighting' then array['none','drop_one','double_one','both','unsure']
      else array['yes','no','unsure'] end;
    if not (v = any(choices)) then return false; end if;
  end loop;
  foreach k in array array['team_size','team_scoring','shirt_policy','pro_rule'] loop
    parent_field := case when k in ('team_size','team_scoring') then 'team_mode'
      when k = 'shirt_policy' then 'shirt_interest' else 'pro_league' end;
    if a->>parent_field = 'yes' then
      if not (a ? k) or jsonb_typeof(a->k) <> 'string' then return false; end if;
      choices := case k
        when 'team_size' then array['two','four','either','unsure']
        when 'team_scoring' then array['team_only','both','unsure']
        when 'shirt_policy' then array['mandatory','optional','unsure']
        else array['squad_required','voluntary','unsure'] end;
      if not ((a->>k) = any(choices)) then return false; end if;
    elsif a ? k then
      -- Canonical storage never contains hidden children (not even empty).
      return false;
    end if;
  end loop;
  changes := a->'league_changes';
  if changes is null or jsonb_typeof(changes) <> 'array' then return false; end if;
  if jsonb_array_length(changes) < 1 or jsonb_array_length(changes) > 8 then return false; end if;
  if exists (select 1 from jsonb_array_elements(changes) item where jsonb_typeof(item) <> 'string') then return false; end if;
  if exists (select 1 from jsonb_array_elements_text(changes) item
    where item not in ('keep','skill_classes','age_middle','age_more','age_classes','fewer_classes','other','unsure')) then return false; end if;
  if (select count(distinct item) from jsonb_array_elements_text(changes) item) <> jsonb_array_length(changes) then return false; end if;
  if (changes ? 'keep' or changes ? 'unsure') and jsonb_array_length(changes) <> 1 then return false; end if;
  foreach k in array array['league_idea','weighting_idea'] loop
    if a ? k then
      if jsonb_typeof(a->k) <> 'string' or char_length(a->>k) > 500 then return false; end if;
      if regexp_replace(a->>k, E'[\t\n\r]', '', 'g') ~ '[[:cntrl:]]' then return false; end if;
    end if;
  end loop;
  return true;
end;
$$;

revoke all on function public.valid_ideas_survey_2027_answers(jsonb) from public, anon, authenticated;
grant execute on function public.valid_ideas_survey_2027_answers(jsonb) to service_role;

create table public.ideas_survey_2027 (
  submission_id uuid primary key,
  survey_version smallint not null default 1 check (survey_version = 1),
  answers jsonb not null check (public.valid_ideas_survey_2027_answers(answers)),
  created_at timestamptz not null default now(),
  constraint ideas_survey_submission_uuid_v4 check (
    submission_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  constraint ideas_survey_answers_size check (octet_length(answers::text) <= 8192)
);
create index ideas_survey_2027_created_at_idx on public.ideas_survey_2027 (created_at desc, submission_id desc);
alter table public.ideas_survey_2027 enable row level security;
revoke all on public.ideas_survey_2027 from public, anon, authenticated;
revoke all on public.ideas_survey_2027 from service_role;
grant select, insert on public.ideas_survey_2027 to service_role;
comment on table public.ideas_survey_2027 is
  'Anonymous 2027 planning preferences; submission UUID is a random idempotency key, NOT proof of a unique person. No account linkage or IP storage. Retention must be agreed before launch.';

create or replace function public.admin_ideas_survey_2027(p_offset integer default 0, p_limit integer default 20)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if not coalesce(public.is_league_admin(), false)
    or not exists (select 1 from public.profiles where id = auth.uid() and archived_at is null)
  then raise exception using errcode = '42501', message = 'LEAGUE_ADMIN_REQUIRED'; end if;
  if p_offset is null or p_offset < 0 or p_offset > 1000000 or p_limit is null or p_limit < 1 or p_limit > 50
  then raise exception using errcode = '22023', message = 'INVALID_SURVEY_PAGE'; end if;
  with page_rows as (
    select submission_id, survey_version, answers, created_at from public.ideas_survey_2027
    order by created_at desc, submission_id desc limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from public.ideas_survey_2027),
    'latest_at', (select max(created_at) from public.ideas_survey_2027),
    'entries', coalesce((select jsonb_agg(jsonb_build_object(
      'submission_id', submission_id, 'survey_version', survey_version,
      'answers', answers, 'created_at', created_at
    ) order by created_at desc, submission_id desc) from page_rows), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_ideas_survey_2027(integer,integer) from public, anon;
grant execute on function public.admin_ideas_survey_2027(integer,integer) to authenticated;
comment on function public.admin_ideas_survey_2027(integer,integer) is
  'Private paginated response access for active league admins only; no public vote counts.';

commit;
