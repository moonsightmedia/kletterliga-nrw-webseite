-- Tabelle für Kontaktformular-Nachrichten (ohne externes E-Mail-Tool)
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz default now()
);

alter table public.contact_requests enable row level security;

-- Kein Zugriff für anon/authenticated (nur Edge Function mit service_role schreibt)
create policy "No public access"
  on public.contact_requests
  for all
  using (false)
  with check (false);

comment on table public.contact_requests is 'Kontaktformular-Nachrichten; nur über Edge Function (service_role) beschreibbar, Lesen im Dashboard mit service_role.';
