-- Same trigger as live auth.users; invoke only in the isolated test database.
create trigger sync_profile_on_email_confirm
after update of email_confirmed_at on auth.users
for each row when (new.email_confirmed_at is not null and old.email_confirmed_at is null)
execute function public.sync_profile_from_user_metadata();
