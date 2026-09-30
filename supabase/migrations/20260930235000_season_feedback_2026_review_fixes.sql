-- V3 adds optional finale and technical follow-up answers in the existing details JSON.
-- V1/V2 responses and their readers remain valid during rollout.
alter table public.season_feedback_2026
  drop constraint if exists season_feedback_2026_version_check,
  drop constraint if exists season_feedback_2026_details_check;

alter table public.season_feedback_2026
  add constraint season_feedback_2026_version_check
    check (survey_version in (1, 2, 3)),
  add constraint season_feedback_2026_details_check
    check (
      (survey_version = 1 and details is null)
      or (survey_version in (2, 3) and jsonb_typeof(details) = 'object' and octet_length(details::text) <= 16000)
    );
