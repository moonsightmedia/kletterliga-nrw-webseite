begin;

create table public.hallenrunde_2027_halls (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 1 and 160),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  enabled boolean not null default true
);

create table public.hallenrunde_2027_replies (
  hall_id uuid primary key references public.hallenrunde_2027_halls(id) on delete cascade,
  reply jsonb not null check (
    jsonb_typeof(reply) = 'object'
    and coalesce(reply->>'decision' in ('yes', 'later', 'no'), false)
    and octet_length(reply::text) <= 14000
  ),
  saved_at timestamptz not null default now()
);

create table public.hallenrunde_2027_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  hall_id uuid not null references public.hallenrunde_2027_halls(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null default (now() + interval '8 hours')
);
create index hallenrunde_2027_sessions_expiry on public.hallenrunde_2027_sessions(expires_at);

create table public.hallenrunde_2027_attempts (
  bucket text primary key check (bucket ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null
);

alter table public.hallenrunde_2027_halls enable row level security;
alter table public.hallenrunde_2027_replies enable row level security;
alter table public.hallenrunde_2027_sessions enable row level security;
alter table public.hallenrunde_2027_attempts enable row level security;
revoke all on public.hallenrunde_2027_halls, public.hallenrunde_2027_replies,
  public.hallenrunde_2027_sessions, public.hallenrunde_2027_attempts from public, anon, authenticated, service_role;

create function public.hallenrunde_2027_access(p_code text, p_token text, p_previous text, p_bucket text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  attempts integer;
  hall public.hallenrunde_2027_halls%rowtype;
  saved jsonb;
begin
  delete from public.hallenrunde_2027_attempts where window_start < now() - interval '2 minutes';
  insert into public.hallenrunde_2027_attempts as a (bucket, window_start, attempts)
    values (p_bucket, now(), 1)
    on conflict (bucket) do update set
      attempts = case when a.window_start <= now() - interval '1 minute' then 1 else least(a.attempts, 13) + 1 end,
      window_start = case when a.window_start <= now() - interval '1 minute' then now() else a.window_start end
    returning a.attempts into attempts;
  if attempts > 12 then return jsonb_build_object('status', 'rate_limited'); end if;

  select * into hall from public.hallenrunde_2027_halls where enabled and code_hash = p_code;
  if not found then return jsonb_build_object('status', 'invalid_code'); end if;

  delete from public.hallenrunde_2027_sessions where expires_at <= now() or token_hash = p_previous;
  insert into public.hallenrunde_2027_sessions(token_hash, hall_id, code_hash)
    values(p_token, hall.id, hall.code_hash);
  select jsonb_build_object('reply', r.reply, 'savedAt', r.saved_at) into saved
    from public.hallenrunde_2027_replies r where r.hall_id = hall.id;
  return jsonb_build_object('status', 'ok', 'hall', hall.name, 'saved', saved);
end;
$$;

create function public.hallenrunde_2027_save(p_token text, p_reply jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_hall uuid;
  saved jsonb;
begin
  select s.hall_id into v_hall
    from public.hallenrunde_2027_sessions s
    join public.hallenrunde_2027_halls h on h.id = s.hall_id and h.enabled and h.code_hash = s.code_hash
    where s.token_hash = p_token and s.expires_at > now();
  if not found then return null; end if;
  insert into public.hallenrunde_2027_replies as r(hall_id, reply)
    values (v_hall, p_reply)
    on conflict(hall_id) do update set reply = excluded.reply, saved_at = now()
    returning jsonb_build_object('reply', r.reply, 'savedAt', r.saved_at) into saved;
  return saved;
end;
$$;

create function public.hallenrunde_2027_leave(p_token text)
returns void language sql security definer set search_path = '' as $$
  delete from public.hallenrunde_2027_sessions where token_hash = p_token;
$$;

create function public.admin_hallenrunde_2027_report()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not coalesce(public.is_league_admin(), false)
    or not exists(select 1 from public.profiles where id = auth.uid() and archived_at is null)
  then raise exception using errcode = '42501', message = 'LEAGUE_ADMIN_REQUIRED'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', h.id, 'hall', h.name, 'enabled', h.enabled,
    'saved', case when r.hall_id is null then null else jsonb_build_object('reply', r.reply, 'savedAt', r.saved_at) end
  ) order by h.name), '[]'::jsonb) into result
    from public.hallenrunde_2027_halls h
    left join public.hallenrunde_2027_replies r on r.hall_id = h.id;
  return result;
end;
$$;

revoke all on function public.hallenrunde_2027_access(text,text,text,text), public.hallenrunde_2027_save(text,jsonb),
  public.hallenrunde_2027_leave(text), public.admin_hallenrunde_2027_report() from public, anon, authenticated, service_role;
grant execute on function public.hallenrunde_2027_access(text,text,text,text), public.hallenrunde_2027_save(text,jsonb),
  public.hallenrunde_2027_leave(text) to service_role;
grant execute on function public.admin_hallenrunde_2027_report() to authenticated;

commit;
