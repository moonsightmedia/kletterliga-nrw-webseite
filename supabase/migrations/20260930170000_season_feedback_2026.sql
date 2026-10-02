-- Anonymous, voluntary feedback for the 2026 season. No participant identifiers.
create table if not exists public.season_feedback_2026 (
  id uuid primary key default gen_random_uuid(),
  participation text not null check (participation in ('active', 'followed', 'not_participated')),
  overall_rating smallint not null check (overall_rating between 1 and 5),
  best_aspect text not null check (best_aspect in ('halls', 'flexibility', 'ranking_app', 'community', 'other')),
  improve_aspect text not null check (improve_aspect in ('rules', 'communication', 'app', 'halls_routes', 'nothing', 'other')),
  next_year text not null check (next_year in ('yes', 'maybe', 'no')),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.season_feedback_2026 enable row level security;
revoke all on public.season_feedback_2026 from anon, authenticated;

comment on table public.season_feedback_2026 is
  'Voluntary anonymous 2026 season feedback. Only the Edge Function service role may write or read; remove after evaluation, no later than 2027-03-31.';
