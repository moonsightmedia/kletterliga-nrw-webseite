begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Keep legacy columns and RPC signatures for compatibility, but reject any
-- new Flash bonus/configuration or result. NOT VALID preserves existing rows.
alter table public.competition_day_events
  add constraint competition_day_events_no_flash_bonus check (flash_bonus = 0) not valid;

alter table public.competition_day_results
  add constraint competition_day_results_no_flash check (flash = false) not valid;

commit;
