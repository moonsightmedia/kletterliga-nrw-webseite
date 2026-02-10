-- Add updated_at column to results table
-- This allows sorting edited results to the top

alter table public.results add column if not exists updated_at timestamp with time zone;

-- Set updated_at for existing entries to created_at
update public.results set updated_at = created_at where updated_at is null;

-- Set default to now() for new inserts (will be overridden by explicit value if provided)
alter table public.results alter column updated_at set default now();

-- Create a function to set updated_at on INSERT (to created_at)
create or replace function set_updated_at_on_insert()
returns trigger as $$
begin
  new.updated_at = new.created_at;
  return new;
end;
$$ language plpgsql;

-- Create a function to update updated_at on UPDATE
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop triggers if they exist and create new ones
drop trigger if exists set_results_updated_at_on_insert on public.results;
create trigger set_results_updated_at_on_insert
  before insert on public.results
  for each row
  execute function set_updated_at_on_insert();

drop trigger if exists update_results_updated_at on public.results;
create trigger update_results_updated_at
  before update on public.results
  for each row
  execute function update_updated_at_column();
