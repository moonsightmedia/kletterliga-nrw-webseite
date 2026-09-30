-- Preserve original responses (survey_version 1) while accepting the deeper 2027-planning form.
alter table public.season_feedback_2026
  add column if not exists survey_version smallint not null default 1,
  add column if not exists details jsonb;

alter table public.season_feedback_2026
  alter column overall_rating drop not null,
  alter column best_aspect drop not null,
  alter column improve_aspect drop not null,
  alter column next_year drop not null;

alter table public.season_feedback_2026
  add constraint season_feedback_2026_version_check
    check (survey_version in (1, 2)),
  add constraint season_feedback_2026_details_check
    check (
      (survey_version = 1 and details is null)
      or (survey_version = 2 and jsonb_typeof(details) = 'object' and octet_length(details::text) <= 12000)
    );

comment on column public.season_feedback_2026.details is
  'Validated, versioned answers to the in-depth 2027 planning questionnaire; no participant identifiers.';
