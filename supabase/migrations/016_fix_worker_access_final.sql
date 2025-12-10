-- COMPREHENSIVE FIX FOR WORKER ACCESS
-- Run this entire script in the Supabase SQL Editor to fix the "Deactivate" button and worker access issues.

-- 1. Fix RLS Policies for Workers Table
-- Drop potentially conflicting or restrictive policies
DROP POLICY IF EXISTS "Workers can view their own profile" ON public.workers;
DROP POLICY IF EXISTS "Anyone can view active workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can manage workers" ON public.workers;
DROP POLICY IF EXISTS "Admins can manage workers" ON public.workers;

-- Policy 1: Public/Anon can view ACTIVE workers only
CREATE POLICY "Anyone can view active workers"
  ON public.workers FOR SELECT
  USING (is_active = TRUE);

-- Policy 2: Authenticated users (Admins, Workers) can view/edit ALL workers
-- This ensures Admins can see inactive workers to manage them.
-- It also allows workers to see other workers (which might be desired or acceptable).
-- If stricter privacy is needed, we can restrict this, but for now this fixes the "disappearing worker" issue.
CREATE POLICY "Authenticated users can manage workers"
  ON public.workers FOR ALL
  USING (auth.uid() IS NOT NULL);

-- 2. Create/Update the Secure RPC Function
-- This function is used by the application to securely check if a worker is active
-- bypassing RLS restrictions.
CREATE OR REPLACE FUNCTION public.get_my_worker_status()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  is_active_status BOOLEAN;
BEGIN
  -- Check if a worker profile exists for the current user
  SELECT is_active INTO is_active_status
  FROM public.workers
  WHERE user_id = auth.uid();
  
  -- Return the status (TRUE, FALSE, or NULL if not found)
  RETURN is_active_status;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_my_worker_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_worker_status TO anon;

-- 3. Verify the fix
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_my_worker_status';
