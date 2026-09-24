begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- A season-scoped, high-entropy shared code grants read-only access to route
-- QR codes and local timers. It does not grant a Supabase identity or writes.
create table public.competition_day_judge_access (
  event_id uuid primary key references public.competition_day_events(id) on delete cascade,
  salt text not null,
  password_hash text not null,
  updated_at timestamptz not null default statement_timestamp()
);
alter table public.competition_day_judge_access enable row level security;
revoke all on public.competition_day_judge_access from public, anon, authenticated;

create function public.get_competition_judge_access_status(p_season text)
returns boolean language plpgsql security definer set search_path = public
as $$
declare v_event_id uuid;
begin
  if not public.is_league_admin() then
    raise exception using errcode='42501', message='LEAGUE_ADMIN_REQUIRED';
  end if;
  select id into v_event_id from public.competition_day_events where season_year=p_season;
  return exists(select 1 from public.competition_day_judge_access where event_id=v_event_id);
end; $$;

create function public.set_competition_judge_password(p_season text, p_password text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_event_id uuid; v_salt text;
begin
  if not public.is_league_admin() then
    raise exception using errcode='42501', message='LEAGUE_ADMIN_REQUIRED';
  end if;
  -- Generated in the admin UI with crypto.getRandomValues; arbitrary short
  -- passwords are deliberately rejected because this RPC is callable by anon.
  if p_password is null or p_password !~ '^[A-Za-z0-9]{24}$' then
    raise exception 'Der Schiedsrichter-Code muss 24 Buchstaben/Ziffern enthalten.';
  end if;
  select id into v_event_id from public.competition_day_events where season_year=p_season for update;
  if v_event_id is null then raise exception 'Für diese Saison ist noch kein Wettkampftag angelegt.'; end if;
  v_salt := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.competition_day_judge_access(event_id, salt, password_hash)
    values(v_event_id, v_salt, encode(sha256(convert_to(v_salt || p_password, 'UTF8')), 'hex'))
    on conflict(event_id) do update set
      salt=excluded.salt, password_hash=excluded.password_hash, updated_at=statement_timestamp();
end; $$;

create function public.get_competition_judge_routes(p_season text, p_password text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.competition_day_events; v_access public.competition_day_judge_access;
begin
  -- A single generic failure avoids disclosing whether a season/code exists.
  if p_season is null or length(p_season) > 20 or p_password is null
    or p_password !~ '^[A-Za-z0-9]{24}$' then
    raise exception using errcode='42501', message='COMPETITION_JUDGE_PASSWORD_INVALID';
  end if;
  select * into v_event from public.competition_day_events where season_year=p_season;
  select * into v_access from public.competition_day_judge_access where event_id=v_event.id;
  if v_access.event_id is null or
    v_access.password_hash <> encode(sha256(convert_to(v_access.salt || p_password, 'UTF8')), 'hex') then
    raise exception using errcode='42501', message='COMPETITION_JUDGE_PASSWORD_INVALID';
  end if;
  return jsonb_build_object(
    'event', jsonb_build_object('id',v_event.id,'phase',v_event.phase),
    'routes', coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'number',r.route_number,'name',r.name,'grade',r.grade,
      'color',r.color,'qr_token',r.qr_token) order by r.route_number)
      from public.competition_day_routes r where r.event_id=v_event.id), '[]'::jsonb));
end; $$;

revoke all on function public.get_competition_judge_access_status(text),
  public.set_competition_judge_password(text,text),
  public.get_competition_judge_routes(text,text) from public, anon, authenticated;
grant execute on function public.get_competition_judge_access_status(text),
  public.set_competition_judge_password(text,text) to authenticated;
grant execute on function public.get_competition_judge_routes(text,text) to anon, authenticated;

commit;
