-- Add unique constraint on (profile_id, route_id) to prevent duplicate results
-- First, remove duplicate entries, keeping the most recent one

-- Delete duplicate results, keeping only the most recent one per (profile_id, route_id)
DELETE FROM public.results
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY profile_id, route_id ORDER BY created_at DESC) as rn
    FROM public.results
  ) t
  WHERE rn > 1
);

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'results_profile_route_unique'
  ) THEN
    ALTER TABLE public.results
      ADD CONSTRAINT results_profile_route_unique 
      UNIQUE (profile_id, route_id);
  END IF;
END $$;
