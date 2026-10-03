-- Explicit, event-scoped read-only access; this does not grant staff privileges.
begin;
create table public.competition_rankings_viewers (
  event_id uuid not null references public.competition_day_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);
alter table public.competition_rankings_viewers enable row level security;
revoke all on public.competition_rankings_viewers from public, anon, authenticated;
grant select on public.competition_rankings_viewers to authenticated;
grant all on public.competition_rankings_viewers to service_role;
create policy ranking_viewer_read_own on public.competition_rankings_viewers
  for select to authenticated using (profile_id = auth.uid());

-- Preserve the currently deployed scoring, registration and DNS rules verbatim.
do $migration$
declare
  definition text := pg_get_functiondef('public.list_competition_standings(text)'::regprocedure);
  original_guard text := 'if not public.is_league_admin() and not exists(select 1 from public.competition_day_staff s join public.profiles p on p.id=s.profile_id where s.event_id=v_event.id and s.profile_id=auth.uid() and p.archived_at is null) then';
  viewer_guard text := ' and not exists(select 1 from public.competition_rankings_viewers rv join public.profiles p on p.id=rv.profile_id where rv.event_id=v_event.id and rv.profile_id=auth.uid() and p.archived_at is null) then';
begin
  if (length(definition) - length(replace(definition, original_guard, ''))) / length(original_guard) <> 1 then
    raise exception 'Unexpected standings authorization definition: no change applied';
  end if;
  execute replace(definition, original_guard, left(original_guard, length(original_guard) - 5) || viewer_guard);
end;
$migration$;
commit;
