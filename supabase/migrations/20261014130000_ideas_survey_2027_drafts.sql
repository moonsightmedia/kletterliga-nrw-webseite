-- LOCAL ONLY: deploy together with the visible collection notice, privacy text
-- and approved lawful-basis/retention/hosting review. No public results access.
begin;
create or replace function public.valid_ideas_survey_2027_draft(a jsonb)
returns boolean language plpgsql immutable set search_path = public, pg_temp as $$
declare filled jsonb; child text; parent_field text;
begin
  if a is null or jsonb_typeof(a) <> 'object' then return false; end if;
  filled := '{"digitalization":"unsure","paper_cards":"unsure","team_mode":"unsure","shirt_interest":"unsure","pro_league":"unsure","qual_weight":"unsure","hall_model":"unsure","hall_count":"unsure","community_events":"unsure","weighting":"unsure","league_changes":["unsure"]}'::jsonb || a;
  if a->'league_changes' = '[]'::jsonb then filled := filled || '{"league_changes":["unsure"]}'::jsonb; end if;
  foreach child in array array['team_size','team_scoring','shirt_policy','pro_rule'] loop
    parent_field := case when child in ('team_size','team_scoring') then 'team_mode' when child = 'shirt_policy' then 'shirt_interest' else 'pro_league' end;
    if a ? child and (a->>parent_field is distinct from 'yes') then return false; end if;
    if filled->>parent_field = 'yes' and not (a ? child) then filled := filled || jsonb_build_object(child,'unsure'); end if;
  end loop;
  return public.valid_ideas_survey_2027_answers(filled);
end $$;
revoke all on function public.valid_ideas_survey_2027_draft(jsonb) from public, anon, authenticated;
grant execute on function public.valid_ideas_survey_2027_draft(jsonb) to service_role;

alter table public.ideas_survey_2027
  add column completed boolean not null default true,
  add column withdrawn boolean not null default false,
  add column revision integer not null default 0 check (revision between 0 and 10000),
  add column write_token_hash text check (write_token_hash ~ '^[a-f0-9]{64}$'),
  add column updated_at timestamptz not null default now(),
  add column consent_version integer,
  add column consent_recorded_at timestamptz,
  add constraint ideas_survey_2027_consent_check check (withdrawn or
    (consent_version is not null and consent_version = 2 and consent_recorded_at is not null)),
  drop constraint ideas_survey_2027_answers_check,
  add constraint ideas_survey_2027_answers_check check (
    case when withdrawn then answers = '{}'::jsonb and not completed
    when completed then public.valid_ideas_survey_2027_answers(answers)
    else public.valid_ideas_survey_2027_draft(answers) end
  );
-- Only the service role can call this atomic capability-checked writer. It does
-- not get raw table UPDATE/DELETE privileges. UUID alone never grants ownership.
create or replace function public.save_ideas_survey_2027(
  p_id uuid, p_token_hash text, p_revision integer, p_mode text, p_answers jsonb,
  p_consent_version integer default null
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.ideas_survey_2027%rowtype;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_revision is null or p_revision < 1 or p_revision > 10000
    or p_id is null or p_mode is null or p_mode not in ('draft','complete','delete') or p_answers is null then return false; end if;
  if p_mode = 'complete' and not public.valid_ideas_survey_2027_answers(p_answers) then return false; end if;
  if p_mode = 'draft' and (not public.valid_ideas_survey_2027_draft(p_answers) or p_answers = '{}'::jsonb) then return false; end if;
  if p_mode = 'delete' and p_answers <> '{}'::jsonb then return false; end if;
  if p_mode <> 'delete' and p_consent_version is distinct from 2 then return false; end if;
  if not public.ideas_survey_2027_is_open() then
    perform public.purge_ideas_survey_2027();
    return p_mode = 'delete';
  end if;
  insert into public.ideas_survey_2027(submission_id,answers,completed,withdrawn,revision,write_token_hash,consent_version,consent_recorded_at)
    values(p_id,p_answers,p_mode='complete',p_mode='delete',p_revision,p_token_hash,
      case when p_mode <> 'delete' then p_consent_version end,
      case when p_mode <> 'delete' then clock_timestamp() end) on conflict (submission_id) do nothing;
  select * into r from public.ideas_survey_2027 where submission_id=p_id for update;
  if r.write_token_hash is distinct from p_token_hash then return false; end if;
  -- Withdrawal dominates any answer revision, including the maximum revision.
  if p_mode = 'delete' then
    if not r.withdrawn then
      update public.ideas_survey_2027 set answers='{}'::jsonb,completed=false,withdrawn=true,
        revision=greatest(r.revision,p_revision),updated_at=now() where submission_id=p_id;
    end if;
    return true;
  end if;
  if r.revision = p_revision then
    return r.answers = p_answers and r.completed = (p_mode='complete') and r.withdrawn = (p_mode='delete');
  end if;
  -- Deletion is a redacted tombstone: late queued writes cannot resurrect answers.
  if r.withdrawn or p_revision < r.revision or (r.completed and p_mode <> 'delete') then return false; end if;
  update public.ideas_survey_2027 set answers=p_answers, completed=p_mode='complete', withdrawn=p_mode='delete', revision=p_revision, updated_at=now()
    where submission_id=p_id;
  return true;
end $$;
revoke all on function public.save_ideas_survey_2027(uuid,text,integer,text,jsonb,integer) from public, anon, authenticated;
grant execute on function public.save_ideas_survey_2027(uuid,text,integer,text,jsonb,integer) to service_role;

create or replace function public.admin_ideas_survey_2027(p_offset integer default 0, p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  if not coalesce(public.is_league_admin(), false) or not exists(select 1 from public.profiles where id=auth.uid() and archived_at is null)
    then raise exception using errcode='42501', message='LEAGUE_ADMIN_REQUIRED'; end if;
  if p_offset is null or p_offset < 0 or p_offset > 1000000 or p_limit is null or p_limit < 1 or p_limit > 50
    then raise exception using errcode='22023', message='INVALID_SURVEY_PAGE'; end if;
  with active as (select * from public.ideas_survey_2027 where not withdrawn and public.ideas_survey_2027_is_open()), page_rows as (
    select submission_id,survey_version,answers,created_at,updated_at,completed from active
    order by updated_at desc, submission_id desc limit p_limit offset p_offset
  ) select jsonb_build_object(
    'total',(select count(*) from active),
    'completed',(select count(*) from active where completed),
    'partial',(select count(*) from active where not completed),
    'latest_at',(select max(updated_at) from active),
    'entries',coalesce((select jsonb_agg(jsonb_build_object('submission_id',submission_id,'survey_version',survey_version,'answers',answers,'created_at',created_at,'updated_at',updated_at,'completed',completed) order by updated_at desc,submission_id desc) from page_rows),'[]'::jsonb)
  ) into result;
  return result;
end $$;
-- Existing admin grants remain; neither capability nor its hash is returned.
comment on table public.ideas_survey_2027 is '2027 planning responses, including clearly marked partial answers. Random write capability, no account linkage; technical hosting data may exist. UUID is not a unique-person guarantee. Retention review required before launch.';
commit;
