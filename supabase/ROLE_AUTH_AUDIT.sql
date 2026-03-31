-- Run before and after deploying the role-hardening migration.
-- This highlights mismatches between the canonical role source (public.profiles.role),
-- gym admin mappings, and any legacy role values still present in auth metadata.

select
  p.id,
  p.email,
  p.role as profile_role,
  exists (
    select 1
    from public.gym_admins ga
    where ga.profile_id = p.id
  ) as has_gym_admin_mapping,
  au.raw_user_meta_data ->> 'role' as legacy_user_metadata_role
from public.profiles p
left join auth.users au on au.id = p.id
where p.role = 'league_admin'
   or exists (
     select 1
     from public.gym_admins ga
     where ga.profile_id = p.id
   )
   or (au.raw_user_meta_data ? 'role')
order by
  case p.role
    when 'league_admin' then 0
    when 'gym_admin' then 1
    else 2
  end,
  p.email nulls last,
  p.id;
