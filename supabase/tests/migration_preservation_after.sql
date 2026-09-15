do $$ declare v_entity text; v_same boolean; begin
  foreach v_entity in array array['results','profiles','settings','registrations'] loop
    with current_rows as (
      select 'results'::text as entity,to_jsonb(r) as original from public.results r
      union all select 'profiles',to_jsonb(p) from public.profiles p
      union all select 'settings',to_jsonb(s) from public.admin_settings s
      union all select 'registrations',to_jsonb(f)-'season_year'-'registration_status'-'updated_at' from public.finale_registrations f
    )
    select not exists (
      (select original from preserved_before where entity=v_entity except all select original from current_rows where entity=v_entity)
      union all
      (select original from current_rows where entity=v_entity except all select original from preserved_before where entity=v_entity)
    ) into v_same;
    if not v_same then raise exception 'FAIL: migration changed legacy % data',v_entity; end if;
    raise notice 'PASS: all legacy % fields and rows preserved',v_entity;
  end loop;
  if not exists(select 1 from public.finale_registrations where season_year='LEGACY-TEST' and registration_status='registered') then
    raise exception 'FAIL: legacy registration not assigned to preserved season';
  end if;
  if exists(select 1 from public.semifinal_eligibility) then raise exception 'FAIL: migration auto-approved athlete'; end if;
  raise notice 'PASS: legacy registration preserved, no automatic eligibility';
end $$;
