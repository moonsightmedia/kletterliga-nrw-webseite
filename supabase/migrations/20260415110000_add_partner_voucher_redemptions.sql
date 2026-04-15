begin;

create table if not exists public.partner_voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  partner_slug text not null check (char_length(trim(partner_slug)) > 0),
  season_year text not null check (char_length(trim(season_year)) > 0),
  redeemed_at timestamptz not null default now(),
  scan_source text,
  created_at timestamptz not null default now()
);

create unique index if not exists partner_voucher_redemptions_profile_partner_season_uidx
  on public.partner_voucher_redemptions (profile_id, partner_slug, season_year);

create index if not exists partner_voucher_redemptions_partner_season_idx
  on public.partner_voucher_redemptions (partner_slug, season_year, redeemed_at desc);

create index if not exists partner_voucher_redemptions_profile_idx
  on public.partner_voucher_redemptions (profile_id);

alter table public.partner_voucher_redemptions enable row level security;

drop policy if exists "Partner voucher redemption read own" on public.partner_voucher_redemptions;
create policy "Partner voucher redemption read own" on public.partner_voucher_redemptions
  for select using (profile_id = auth.uid());

drop policy if exists "Partner voucher redemption read league admin" on public.partner_voucher_redemptions;
create policy "Partner voucher redemption read league admin" on public.partner_voucher_redemptions
  for select using (public.is_league_admin());

commit;
