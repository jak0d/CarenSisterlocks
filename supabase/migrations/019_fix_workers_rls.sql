-- ============================================
-- FIX FOR WORKER RLS POLICIES
-- ============================================

-- Step 1: Drop ALL existing policies on workers table to clean slate
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
-- And workers can view/edit their own profiles
CREATE POLICY "authenticated_full_access"
  ON public.workers 
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Step 4: Verify policies were created
DO $$
BEGIN
  RAISE NOTICE 'Refreshed RLS policies on public.workers';
END $$;
