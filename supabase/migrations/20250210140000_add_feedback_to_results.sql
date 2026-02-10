-- Add feedback column to results table
-- Feedback is optional (nullable) and allows users to report issues with routes

alter table public.results add column if not exists feedback text;
