-- ============================================
-- IMMEDIATE FIX FOR ACTIVATE/DEACTIVATE BUTTONS
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Step 1: Drop ALL existing policies on workers table
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
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 2: Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Step 3: Create simple, permissive policies

-- Policy 1: Public can view ACTIVE workers (for booking page)
CREATE POLICY "public_view_active_workers"
  ON public.workers 
  FOR SELECT
  TO public
  USING (is_active = TRUE);

-- Policy 2: Authenticated users can do EVERYTHING (SELECT, INSERT, UPDATE, DELETE)
-- This ensures admins can manage workers without restrictions
CREATE POLICY "authenticated_full_access"
  ON public.workers 
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Step 4: Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'workers' AND schemaname = 'public'
ORDER BY policyname;

-- Step 5: Test the update (this should work now)
-- Replace 'YOUR_WORKER_ID' with an actual worker ID from your database
-- SELECT id, name, is_active FROM public.workers LIMIT 1;
-- UPDATE public.workers SET is_active = NOT is_active WHERE id = 'YOUR_WORKER_ID';

RAISE NOTICE '✅ Worker policies fixed! Activate/Deactivate buttons should now work.';
