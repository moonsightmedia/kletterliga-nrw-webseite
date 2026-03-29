alter table public.admin_settings
  add column if not exists account_creation_opens_at timestamptz,
  add column if not exists app_unlock_at timestamptz,
  add column if not exists force_account_creation_open boolean default false,
  add column if not exists force_participant_unlock boolean default false;

update public.admin_settings
set
  account_creation_opens_at = coalesce(account_creation_opens_at, '2026-04-01T00:00:00+02:00'::timestamptz),
  app_unlock_at = coalesce(app_unlock_at, '2026-05-01T00:00:00+02:00'::timestamptz),
  force_account_creation_open = coalesce(force_account_creation_open, false),
  force_participant_unlock = coalesce(force_participant_unlock, false)
where true;

create or replace function public.get_public_admin_settings()
returns table (
  id uuid,
  season_year text,
  account_creation_opens_at timestamptz,
  app_unlock_at timestamptz,
  force_account_creation_open boolean,
  force_participant_unlock boolean,
  qualification_start date,
  qualification_end date,
  stage_months text[],
  age_u16_max integer,
  age_u40_min integer,
  age_cutoff_date date,
  class_labels jsonb,
  finale_enabled boolean,
  finale_date date,
  finale_registration_deadline date,
  top_30_per_class integer,
  wildcards_per_class integer,
  preparation_start date,
  preparation_end date,
  stages jsonb,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    settings.id,
    settings.season_year,
    settings.account_creation_opens_at,
    settings.app_unlock_at,
    settings.force_account_creation_open,
    settings.force_participant_unlock,
    settings.qualification_start,
    settings.qualification_end,
    settings.stage_months,
    settings.age_u16_max,
    settings.age_u40_min,
    settings.age_cutoff_date,
    settings.class_labels,
    settings.finale_enabled,
    settings.finale_date,
    settings.finale_registration_deadline,
    settings.top_30_per_class,
    settings.wildcards_per_class,
    settings.preparation_start,
    settings.preparation_end,
    settings.stages,
    settings.updated_at
  from public.admin_settings as settings
  order by settings.updated_at desc
  limit 1;
$$;

revoke all on function public.get_public_admin_settings() from public;
grant execute on function public.get_public_admin_settings() to anon;
grant execute on function public.get_public_admin_settings() to authenticated;
