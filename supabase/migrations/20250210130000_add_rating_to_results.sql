-- Add rating column to results table
-- Rating is optional (nullable) and can be 1-5 stars

alter table public.results add column if not exists rating integer;

-- Add constraint to ensure rating is between 1 and 5 (or null)
alter table public.results drop constraint if exists results_rating_check;
alter table public.results add constraint results_rating_check check (rating is null or (rating >= 1 and rating <= 5));
