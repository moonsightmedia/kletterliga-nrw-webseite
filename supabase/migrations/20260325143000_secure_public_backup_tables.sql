do $$
declare
  backup_table text;
begin
  foreach backup_table in array array[
    'gyms_backup_20260320',
    'gyms_backup_20260320_final',
    'routes_backup_20260320',
    'routes_backup_20260320_final'
  ]
  loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = backup_table
        and c.relkind = 'r'
    ) then
      execute format('alter table public.%I enable row level security', backup_table);
      execute format('alter table public.%I force row level security', backup_table);
    end if;
  end loop;
end $$;
