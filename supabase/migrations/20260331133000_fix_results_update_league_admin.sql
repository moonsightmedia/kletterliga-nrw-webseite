begin;

drop policy if exists "Results update league admin" on public.results;
create policy "Results update league admin" on public.results
  for update
  using (public.is_league_admin())
  with check (public.is_league_admin());

commit;
