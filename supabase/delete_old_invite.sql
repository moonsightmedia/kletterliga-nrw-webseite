-- Delete old invite for paulineannalioba@gmail.com
-- This allows creating a new invite with the correct URL

DELETE FROM gym_invites 
WHERE email = 'paulineannalioba@gmail.com' 
AND used_at IS NULL;
