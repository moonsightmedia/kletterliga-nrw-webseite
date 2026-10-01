-- V4 separates awareness, season participation and semifinal eligibility.
-- Existing V1–V3 answers remain unchanged and readable.
alter table public.season_feedback_2026
  drop constraint if exists season_feedback_2026_participation_check,
  drop constraint if exists season_feedback_2026_version_check,
  drop constraint if exists season_feedback_2026_details_check;

alter table public.season_feedback_2026
  add constraint season_feedback_2026_participation_check
    check (participation in ('active', 'followed', 'not_participated', 'spectator')),
  add constraint season_feedback_2026_version_check
    check (survey_version in (1, 2, 3, 4)),
  add constraint season_feedback_2026_details_check
    check (
      (survey_version = 1 and details is null)
      or (survey_version in (2, 3) and jsonb_typeof(details) = 'object' and octet_length(details::text) <= 16000)
      or (survey_version = 4 and jsonb_typeof(details) = 'object' and octet_length(details::text) <= 40000)
    );
