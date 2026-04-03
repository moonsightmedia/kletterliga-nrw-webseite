create table if not exists public.profile_consents (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  participation_terms_version text,
  participation_terms_accepted_at timestamptz,
  privacy_notice_version text,
  privacy_notice_acknowledged_at timestamptz,
  marketing_email_scope text,
  marketing_email_status text not null default 'not_subscribed',
  marketing_email_requested_at timestamptz,
  marketing_email_confirmed_at timestamptz,
  marketing_email_revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profile_consents
  add column if not exists participation_terms_version text;
alter table public.profile_consents
  add column if not exists participation_terms_accepted_at timestamptz;
alter table public.profile_consents
  add column if not exists privacy_notice_version text;
alter table public.profile_consents
  add column if not exists privacy_notice_acknowledged_at timestamptz;
alter table public.profile_consents
  add column if not exists marketing_email_scope text;
alter table public.profile_consents
  add column if not exists marketing_email_status text not null default 'not_subscribed';
alter table public.profile_consents
  add column if not exists marketing_email_requested_at timestamptz;
alter table public.profile_consents
  add column if not exists marketing_email_confirmed_at timestamptz;
alter table public.profile_consents
  add column if not exists marketing_email_revoked_at timestamptz;
alter table public.profile_consents
  add column if not exists created_at timestamptz default now();
alter table public.profile_consents
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profile_consents_marketing_email_status_check'
  ) then
    alter table public.profile_consents
      add constraint profile_consents_marketing_email_status_check
      check (marketing_email_status in ('not_subscribed','pending','subscribed','unsubscribed'));
  end if;
end $$;

create table if not exists public.marketing_opt_in_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  token_type text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.marketing_opt_in_tokens
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade;
alter table public.marketing_opt_in_tokens
  add column if not exists token_hash text;
alter table public.marketing_opt_in_tokens
  add column if not exists token_type text;
alter table public.marketing_opt_in_tokens
  add column if not exists expires_at timestamptz;
alter table public.marketing_opt_in_tokens
  add column if not exists consumed_at timestamptz;
alter table public.marketing_opt_in_tokens
  add column if not exists created_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'marketing_opt_in_tokens_token_type_check'
  ) then
    alter table public.marketing_opt_in_tokens
      add constraint marketing_opt_in_tokens_token_type_check
      check (token_type in ('confirm','unsubscribe'));
  end if;
end $$;

create index if not exists profile_consents_marketing_email_status_idx
  on public.profile_consents (marketing_email_status);
create index if not exists marketing_opt_in_tokens_profile_id_idx
  on public.marketing_opt_in_tokens (profile_id);
create unique index if not exists marketing_opt_in_tokens_token_hash_idx
  on public.marketing_opt_in_tokens (token_hash);

alter table public.profile_consents enable row level security;
alter table public.marketing_opt_in_tokens enable row level security;

drop policy if exists "Profile consents read own" on public.profile_consents;
create policy "Profile consents read own" on public.profile_consents
  for select using (auth.uid() = profile_id);

drop policy if exists "Profile consents insert own" on public.profile_consents;
create policy "Profile consents insert own" on public.profile_consents
  for insert with check (auth.uid() = profile_id);

drop policy if exists "Profile consents update own" on public.profile_consents;
create policy "Profile consents update own" on public.profile_consents
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "Profile consents read league" on public.profile_consents;
create policy "Profile consents read league" on public.profile_consents
  for select using (public.is_league_admin());
