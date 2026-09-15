# Post-qualification database gate

## Registration release verification (2026-09-15)

The Orga has now approved all 148 activated participants, including six without
results, and the strict under-15 cutoff at 2026-05-01. Reviewed operational SQL
is in `scripts/approve-semifinal-2026.sql` and `scripts/open-semifinal-2026.sql`;
default rollback, explicit `-v apply=true` required. No birthdate or result is
rewritten. One implausible birthday remains a documented data-quality follow-up.

The additional actual HTTP E2E test was run with dedicated tagged synthetic
Auth accounts against the real backend and local UI, not a separate staging
GoTrue/PostgREST deployment. Before any real participant approval, it temporarily
tested the enabled phase, then restored closed registration in `finally`.
Real password login, signup/reload/cancel/re-register, duplicate protection,
league-admin UI cancellation, RLS negatives and audit passed (24 checks).
Both synthetic accounts were deleted with exact ID/marker ownership checks;
221 existing profiles, 4,047 results and 160 routes have identical SHA256 hashes.
No email was sent. Reproduce only deliberately with
`node scripts/qa-semifinal-live.mjs preapproval http://127.0.0.1:3492` while no
real eligibility exists, or `open` after release. Never print credentials or
enable debug traces. The underlying 66 isolated SQL checks remain the evidence
for transactional edge cases. See `docs/post-qualification-release.md` for the
current release status; the following section records the earlier backend-only
rollout and original gate, not an assertion that HTTP E2E remains untested.

## Earlier backend-only rollout

Migration: `20260914170000_close_qualification_and_guard_semifinal.sql`.
Applied to production on 2026-09-15 at approximately 08:55 Europe/Berlin after
explicit user authorization and isolated SQL verification. Consent Function v9
was deployed first. `finale_enabled`, season dates, results, ranks, ages and
existing profiles remain unchanged; no real participant was approved.

All 21 pre-existing public tables have identical before/after row counts and
full-row fingerprints. Encrypted backup and verification evidence are recorded
in `docs/post-qualification-release.md` and the device-specific handoff.

## Rollout procedure and registration-opening gate

1. Apply the migration to an isolated Supabase-compatible staging database using
   the current schema/migrations. Snapshot/backup the target before migration.
2. Run `psql "$LOCAL_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/post_qualification.sql`.
   This suite uses synthetic `.invalid` accounts and ends with `ROLLBACK`.
   Do not run it against production even though fixtures are transaction-scoped.
3. Verify participant, gym-admin, league-admin, anonymous and service identities.
   The 2026-09-15 release exercises their actual SQL roles/RLS and the Auth admin
   SQL identity on the freshly restored schema. Admin change-request service
   writes and Auth-delete FK cascades are covered. Before opening registration,
   additionally run the complete HTTP end-to-end flow in isolated staging;
   this local runtime does not include GoTrue/PostgREST HTTP services.
4. Deploy the `participant-email-consent` Edge Function create-only profile fix
   **before or together with the database guard**. Its old service-role upsert
   could overwrite existing competition fields from user-editable auth metadata
   through `initialize`/resend. The new `ignoreDuplicates: true` preserves existing
   profiles atomically and still creates missing profiles. Re-deploying only the
   database is not sufficient to close this bypass. Then deploy the database guard
   before the participant UI: old clients get an explicit rejection instead of
   being able to bypass the hidden editing UI.
5. Confirm the eligibility list and class snapshots with the Orga. While logged
   in as a league admin, call `set_semifinal_eligibility` for each deliberately
   approved athlete. Parameters: `p_profile_id`, `p_status` (`pending`, `eligible`,
   `not_eligible`), `p_league` (`toprope`, `lead`), `p_class_label` (approved display
   label). Active/nonarchived participant accounts are required. No bulk
   eligibility decision, automatic ranking derivation or age-rule change occurs.
6. Enable registration only after an end-to-end test and the team's go-ahead.

## Behavior and compatibility

- Qualification days and the registration deadline are inclusive **Europe/Berlin**
  calendar dates. `registration_deadline` in the new state RPC is the exclusive
  next-midnight instant; subtract a millisecond when displaying the last day.
- Missing/reversed qualification settings deny participant writes. Outside the
  qualification window, result inserts, updates and deletes are blocked at the
  database, not just via UI. Reads/RLS remain unchanged.
- Participant birth date, gender, league and archival fields are locked after
  closure (or invalid season configuration). Normal profile edits still work.
- Profile INSERT cannot bootstrap an administrator role, activation or archive
  privileges. Email confirmation creates only a missing participant and never
  imports the editable metadata role or rewrites an existing official profile.
- Auth admin account-deletion cascades retain their original behavior through
  a narrowly scoped `session_user = 'supabase_auth_admin'` plus FK-trigger-depth
  exception for DELETE. A JWT/user_metadata role cannot impersonate that SQL
  session. No production account was deleted during verification or rollout.
- Trusted DB league admins and server service credentials retain correction
  ability. User-editable metadata never grants a bypass. Existing result/profile
  audit triggers remain; service-originated actions may have a null actor as in
  the existing implementation.
- Registration requires explicit approval, an active nonarchived participant,
  `finale_enabled`, the end of qualification, and a valid unexpired deadline.
- `get_semifinal_registration_state`, `register_for_semifinal` and
  `cancel_semifinal_registration` take no user identity from the browser.
  Duplicate RPC registration is idempotent. Legacy direct writes are guarded too.
- Registration rows gain `season_year`, `registration_status` and `updated_at`.
  RPC cancellation retains a `cancelled` row. The updated admin list now filters
  explicitly by current season + `registered` and displays the approved class/
  league snapshot (no mutable birthday-based class calculation). Missing schema
  or failed queries show an error, not a misleading zero. Orga cancellation uses
  the DB role-checked `admin_cancel_semifinal_registration(p_registration_id)` RPC,
  retains the row/audit, and works after the participant deadline. No email is
  promised. Old direct DELETE operations remain audited.
- Approval snapshots and registration changes have a separate admin-readable
  audit. Participants may read only their own eligibility; no new cross-user
  result/profile visibility is added.
- Revoking eligibility prevents subsequent registration but does not silently
  erase an existing registration. The Orga must explicitly cancel it, preserving
  the audit trail.
- The new frontend fails closed if the new RPC is not available. No confirmation
  email is promised or sent by these functions.
- Direct code redemption endpoints are not disabled by this migration. Redemption
  alone cannot bypass the result lock or explicit semifinal eligibility. If all
  post-qualification code redemption should stop, that is a separate operation.
- Result write gates currently use the configured global season window. Before
  switching settings to 2027, bind historical result protection to immutable season
  ownership; do not assume this migration alone permanently freezes older seasons
  while a subsequent season is open.

## Verification boundary

The prepared baseline was tested with portable PostgreSQL 17.11 against a fresh
production public-schema dump (no real rows). SQL auth helpers and the live
confirmation trigger are supplied by `local_auth_bootstrap.sql` and
`local_auth_trigger.sql`. `post_qualification.sql` and
`post_qualification_auth.sql` pass 61 assertions. The before/after preservation
scripts pass five further assertions for synthetic existing records.

Reproduce with `scripts/test-post-qualification-db.ps1 -SchemaSnapshot <schema>`
while the approved portable local server runs on 127.0.0.1:54329. The runner
cannot target a remote host and creates a uniquely named synthetic database.
Report includes the tested migration and source-schema SHA256 hashes. The live
schema snapshot, encrypted archive and operational scripts are intentionally
Git-ignored; never commit participant exports or connection secrets.

33 focused TypeScript/consent regression tests passed again during rollout.
Production migration history, enabled triggers, permissions, closed settings,
read-only authenticated state and non-mutating HTTP responses were verified.
No real production signup, registration, cancellation or account deletion was
used as a test. Full participant HTTP E2E remains a prerequisite for later
opening, not a claim of this closed-registration backend release. Do not remove
database guards to roll back a UI release; repair the UI separately.
