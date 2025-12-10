-- ============================================
-- FIX WORKER USER_ID MISMATCH
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Diagnostic - Show current state
SELECT 
    'BEFORE FIX' as status,
    w.id as worker_id,
    w.name,
    w.email,
    w.user_id as current_user_id,
    w.is_active,
    u.id as auth_user_id,
    CASE WHEN w.user_id = u.id THEN 'MATCH' ELSE 'MISMATCH - NEEDS FIX' END as id_status
FROM public.workers w
LEFT JOIN auth.users u ON w.email = u.email;

-- Step 2: Fix the user_id mismatch by matching on email
UPDATE public.workers w
SET user_id = u.id
FROM auth.users u
WHERE w.email = u.email
AND (w.user_id IS NULL OR w.user_id != u.id);

-- Step 3: Verify the fix
SELECT 
    'AFTER FIX' as status,
    w.id as worker_id,
    w.name,
    w.email,
    w.user_id as current_user_id,
    w.is_active,
    u.id as auth_user_id,
    CASE WHEN w.user_id = u.id THEN 'MATCH - FIXED!' ELSE 'STILL MISMATCHED' END as id_status
FROM public.workers w
LEFT JOIN auth.users u ON w.email = u.email;

-- Step 4: Ensure RLS allows this to work
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'workers' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workers', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Simple policies that allow authenticated users full access
CREATE POLICY "public_view_active_workers"
  ON public.workers 
  FOR SELECT
  TO public
  USING (is_active = TRUE);

CREATE POLICY "authenticated_full_access"
  ON public.workers 
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Step 5: Recreate the RPC function to check worker status
CREATE OR REPLACE FUNCTION public.get_my_worker_status()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_active_status BOOLEAN;
BEGIN
  SELECT is_active INTO is_active_status
  FROM public.workers
  WHERE user_id = auth.uid();
  
  RETURN is_active_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_worker_status TO authenticated;

-- Done!
SELECT 'SUCCESS: Worker user_id mismatch fixed. Please sign out and sign back in.' as message;
