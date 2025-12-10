-- ============================================
-- RESOLVE WORKER MANAGEMENT ISSUES
-- ============================================

-- This script fixes two major issues:
-- 1. RLS Policies preventing Admin from managing workers
-- 2. User ID mismatches causing workers to see "Deactivated" even when Active

-- SECTION 1: FIX RLS POLICIES
-- Clean up existing policies to avoid conflicts
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

-- Allow public to view active workers (for booking page)
CREATE POLICY "public_view_active_workers"
  ON public.workers 
  FOR SELECT
  TO public
  USING (is_active = TRUE);

-- Allow authenticated users full control
CREATE POLICY "authenticated_full_access"
  ON public.workers 
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- SECTION 2: FIX DATA CONSISTENCY
-- Sync user_ids: Update workers table to point to the correct auth.users ID based on email
-- This fixes the issue where a worker logs in but their worker profile is linked to an old/different ID
UPDATE public.workers w
SET user_id = u.id
FROM auth.users u
WHERE w.email = u.email
AND w.user_id != u.id;

-- Ensure public.users profiles have the correct 'worker' role
UPDATE public.users pu
SET role = 'worker'
FROM public.workers pw
WHERE pu.id = pw.user_id
AND pu.role != 'worker';

-- Force sync is_active state for consistency checks if needed
-- (Optional, but RLS fix above ensures updates work going forward)

DO $$
BEGIN
  RAISE NOTICE 'Worker system fixed: RLS updated and User IDs synced.';
END $$;
