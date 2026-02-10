-- Add postal code (PLZ) to gyms
alter table public.gyms add column if not exists postal_code text;

comment on column public.gyms.postal_code is 'Postleitzahl (PLZ) der Halle';
