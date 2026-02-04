-- Kletterliga NRW app schema (public)
-- Run in Supabase SQL Editor

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  avatar_url text,
  birth_date date,
  gender text,
  home_gym_id uuid,
  league text,
  role text default 'participant',
  created_at timestamp with time zone default now()
);

-- Profile migrations (safe re-run)
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists league text;
alter table public.profiles add column if not exists avatar_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_gender_check'
  ) then
    alter table public.profiles
      add constraint profiles_gender_check check (gender in ('m','w'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_league_check'
  ) then
    alter table public.profiles
      add constraint profiles_league_check check (league in ('toprope','lead'));
  end if;
end $$;

-- Gyms
create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  address text,
  website text,
  logo_url text,
  created_at timestamp with time zone default now()
);

-- Routes
create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete cascade,
  discipline text check (discipline in ('toprope','lead')),
  code text not null,
  name text,
  setter text,
  color text,
  grade_range text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

alter table public.routes add column if not exists setter text;
alter table public.routes add column if not exists color text;

-- Results
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  route_id uuid references public.routes(id) on delete cascade,
  points numeric not null default 0,
  flash boolean not null default false,
  status text,
  created_at timestamp with time zone default now()
);

-- Change requests
create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  email text,
  current_league text,
  current_gender text,
  requested_league text,
  requested_gender text,
  message text,
  status text default 'open',
  created_at timestamp with time zone default now()
);

-- Gym admins mapping
create table if not exists public.gym_admins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  gym_id uuid references public.gyms(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Gym codes
create table if not exists public.gym_codes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete cascade,
  code text unique not null,
  status text default 'available',
  redeemed_by uuid references public.profiles(id),
  redeemed_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Admin settings
create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  season_year text,
  qualification_start date,
  qualification_end date,
  stage_months text[],
  age_u16_max int,
  age_u40_min int,
  class_labels jsonb,
  finale_enabled boolean default false,
  updated_at timestamp with time zone default now()
);

-- Profile overrides (manual class/league)
create table if not exists public.profile_overrides (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  override_league text,
  override_gender text,
  override_class text,
  reason text,
  created_at timestamp with time zone default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.gyms enable row level security;
alter table public.routes enable row level security;
alter table public.results enable row level security;
alter table public.change_requests enable row level security;
alter table public.gym_codes enable row level security;
alter table public.gym_admins enable row level security;
alter table public.admin_settings enable row level security;
alter table public.profile_overrides enable row level security;

-- Policies: profiles
drop policy if exists "Profiles read own" on public.profiles;
create policy "Profiles read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Profiles read authenticated" on public.profiles;
create policy "Profiles read authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "Profiles insert own" on public.profiles;
create policy "Profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Profiles update own" on public.profiles;
create policy "Profiles update own" on public.profiles
  for update using (auth.uid() = id);

-- Policies: gyms (public read, gym_admin + league_admin update)
drop policy if exists "Gyms read" on public.gyms;
create policy "Gyms read" on public.gyms
  for select using (true);

drop policy if exists "Gyms update gym admin" on public.gyms;
create policy "Gyms update gym admin" on public.gyms
  for update
  using (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid()
        and gym_admins.gym_id = gyms.id
    )
  );

drop policy if exists "Gyms update league admin" on public.gyms;
create policy "Gyms update league admin" on public.gyms
  for update
  using ((auth.jwt() ->> 'role') = 'league_admin');

-- Policies: routes (public read)
drop policy if exists "Routes read" on public.routes;
create policy "Routes read" on public.routes
  for select using (true);

drop policy if exists "Routes insert own" on public.routes;
create policy "Routes insert own" on public.routes
  for insert
  with check (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid()
        and gym_admins.gym_id = routes.gym_id
    )
  );

drop policy if exists "Routes update own" on public.routes;
create policy "Routes update own" on public.routes
  for update
  using (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid()
        and gym_admins.gym_id = routes.gym_id
    )
  );

drop policy if exists "Routes delete own" on public.routes;
create policy "Routes delete own" on public.routes
  for delete
  using (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid()
        and gym_admins.gym_id = routes.gym_id
    )
  );

-- Policies: results (user owns)
drop policy if exists "Results read own" on public.results;
create policy "Results read own" on public.results
  for select using (auth.uid() = profile_id);

drop policy if exists "Results read authenticated" on public.results;
create policy "Results read authenticated" on public.results
  for select using (auth.role() = 'authenticated');

drop policy if exists "Results insert own" on public.results;
create policy "Results insert own" on public.results
  for insert with check (auth.uid() = profile_id);

drop policy if exists "Results update own" on public.results;
create policy "Results update own" on public.results
  for update using (auth.uid() = profile_id);

-- Policies: change requests
drop policy if exists "Change requests read own" on public.change_requests;
create policy "Change requests read own" on public.change_requests
  for select using (auth.uid() = profile_id);

drop policy if exists "Change requests read authenticated" on public.change_requests;
create policy "Change requests read authenticated" on public.change_requests
  for select using (auth.role() = 'authenticated');

drop policy if exists "Change requests insert own" on public.change_requests;
create policy "Change requests insert own" on public.change_requests
  for insert with check (auth.uid() = profile_id);

-- Policies: gym codes
drop policy if exists "Gym codes read own" on public.gym_codes;
create policy "Gym codes read own" on public.gym_codes
  for select
  using (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid()
        and gym_admins.gym_id = gym_codes.gym_id
    )
  );

drop policy if exists "Gym codes insert own" on public.gym_codes;
create policy "Gym codes insert own" on public.gym_codes
  for insert
  with check (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid()
        and gym_admins.gym_id = gym_codes.gym_id
    )
  );

drop policy if exists "Gym codes update own" on public.gym_codes;
create policy "Gym codes update own" on public.gym_codes
  for update
  using (
    exists (
      select 1 from public.gym_admins
      where gym_admins.profile_id = auth.uid()
        and gym_admins.gym_id = gym_codes.gym_id
    )
  );

drop policy if exists "Gym codes redeem" on public.gym_codes;
create policy "Gym codes redeem" on public.gym_codes
  for update
  using (redeemed_by is null)
  with check (redeemed_by = auth.uid());

create index if not exists gym_codes_gym_id_idx on public.gym_codes (gym_id);
create index if not exists gym_codes_code_idx on public.gym_codes (code);
create index if not exists gym_codes_redeemed_by_idx on public.gym_codes (redeemed_by);

-- Policies: gym_admins
drop policy if exists "Gym admins read own" on public.gym_admins;
create policy "Gym admins read own" on public.gym_admins
  for select using (auth.uid() = profile_id);

drop policy if exists "Gym admins insert own" on public.gym_admins;
create policy "Gym admins insert own" on public.gym_admins
  for insert with check (auth.uid() = profile_id);

create index if not exists gym_admins_profile_id_idx on public.gym_admins (profile_id);
create index if not exists gym_admins_gym_id_idx on public.gym_admins (gym_id);

-- Policies: admin settings
drop policy if exists "Admin settings read" on public.admin_settings;
create policy "Admin settings read" on public.admin_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "Admin settings write league" on public.admin_settings;
create policy "Admin settings write league" on public.admin_settings
  for insert with check (auth.jwt() ->> 'role' = 'league_admin');

drop policy if exists "Admin settings update league" on public.admin_settings;
create policy "Admin settings update league" on public.admin_settings
  for update using (auth.jwt() ->> 'role' = 'league_admin');

-- Policies: profile overrides
drop policy if exists "Profile overrides read league" on public.profile_overrides;
create policy "Profile overrides read league" on public.profile_overrides
  for select using (auth.jwt() ->> 'role' = 'league_admin');

drop policy if exists "Profile overrides write league" on public.profile_overrides;
create policy "Profile overrides write league" on public.profile_overrides
  for insert with check (auth.jwt() ->> 'role' = 'league_admin');

drop policy if exists "Profile overrides update league" on public.profile_overrides;
create policy "Profile overrides update league" on public.profile_overrides
  for update using (auth.jwt() ->> 'role' = 'league_admin');

-- Storage policies: avatars bucket
drop policy if exists "Avatar upload own" on storage.objects;
create policy "Avatar upload own" on storage.objects
  for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Avatar update own" on storage.objects;
create policy "Avatar update own" on storage.objects
  for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Avatar read public" on storage.objects;
create policy "Avatar read public" on storage.objects
  for select
  using (bucket_id = 'avatars');
