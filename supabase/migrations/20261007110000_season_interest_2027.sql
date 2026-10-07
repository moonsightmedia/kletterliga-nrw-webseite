-- Voluntary interest signal, unrelated to registration. One random browser ID per vote.
create table public.season_interest_2027 (
  browser_id uuid primary key,
  created_at timestamptz not null default now()
);
alter table public.season_interest_2027 enable row level security;
revoke all on public.season_interest_2027 from anon, authenticated;
grant select, insert on public.season_interest_2027 to service_role;
comment on table public.season_interest_2027 is 'Nonbinding interest for 2027. Random browser IDs only; no names, emails or IP addresses. Delete after 2027 planning.';

create function public.admin_season_interest_2027_count()
returns bigint language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_league_admin() then
    raise exception 'League admin access required' using errcode = '42501';
  end if;
  return (select count(*) from public.season_interest_2027);
end;
$$;
revoke all on function public.admin_season_interest_2027_count() from public, anon;
grant execute on function public.admin_season_interest_2027_count() to authenticated;
