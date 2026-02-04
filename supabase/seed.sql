-- Seed data for gyms and routes (based on src/data/gyms.ts)
-- Run in Supabase SQL Editor after schema.sql

delete from public.routes;
delete from public.gyms;

insert into public.gyms (id, name, city, address, website)
values
  (gen_random_uuid(), 'Canyon Chorweiler', 'Köln', 'Weichselring 6a, 50765 Köln', 'https://www.canyon-chorweiler.de'),
  (gen_random_uuid(), '2T Lindlar', 'Lindlar', 'Bismarckstraße 1, 51789 Lindlar', 'https://www.2t-lindlar.de'),
  (gen_random_uuid(), 'DAV Alpinzentrum Bielefeld', 'Bielefeld', 'Meisenstraße 65, 33607 Bielefeld', 'https://www.alpenverein-bielefeld.de'),
  (gen_random_uuid(), 'Wupperwände Wuppertal', 'Wuppertal', 'Badische Straße 76, 42389 Wuppertal', 'https://www.wupperwaende.de'),
  (gen_random_uuid(), 'Chimpanzodrome Frechen', 'Frechen', 'Ernst-Heinrich-Geist-Straße 18, 50226 Frechen', 'https://www.chimpanzodrome.de'),
  (gen_random_uuid(), 'Kletterwelt Sauerland', 'Altena', 'Rosmarter Allee 12, 58762 Altena', 'https://www.kletterwelt-sauerland.de'),
  (gen_random_uuid(), 'DAV Kletterzentrum Siegerland', 'Siegen', 'Effertsufer 105, 57072 Siegen', 'https://www.dav-siegerland.de');

-- Simple route set per gym (T1/T2/V1)
with color_map as (
  select * from (values
    (1, 'weiß'),
    (2, 'gelb'),
    (3, 'grün'),
    (4, 'blau'),
    (5, 'rot'),
    (6, 'schwarz'),
    (7, 'lila'),
    (8, 'pink'),
    (9, 'orange'),
    (10, 'grau')
  ) as c(idx, color)
)
insert into public.routes (gym_id, discipline, code, name, setter, color, grade_range, active)
select g.id, 'toprope', 'T' || s, 'Route ' || 'T' || s, 'Routenbau Team', c.color, 'UIAA 5-9', true
from public.gyms g
cross join generate_series(1, 10) s
join color_map c on c.idx = s;

with color_map as (
  select * from (values
    (1, 'weiß'),
    (2, 'gelb'),
    (3, 'grün'),
    (4, 'blau'),
    (5, 'rot'),
    (6, 'schwarz'),
    (7, 'lila'),
    (8, 'pink'),
    (9, 'orange'),
    (10, 'grau')
  ) as c(idx, color)
)
insert into public.routes (gym_id, discipline, code, name, setter, color, grade_range, active)
select g.id, 'lead', 'V' || s, 'Route ' || 'V' || s, 'Routenbau Team', c.color, 'UIAA 5-10', true
from public.gyms g
cross join generate_series(1, 10) s
join color_map c on c.idx = s;
