-- COMPREHENSIVE FIX FOR WORKER ACCESS
-- Run this entire script in the Supabase SQL Editor

-- 1. Fix RLS Policies for Workers Table
-- Drop existing conflicting policies to be safe
DROP POLICY IF EXISTS "Workers can view their own profile" ON public.workers;
DROP POLICY IF EXISTS "Anyone can view active workers" ON public.workers;

-- Re-create the general view policy (for public/admins)
CREATE POLICY "Anyone can view active workers"
  ON public.workers FOR SELECT
  USING (is_active = TRUE);

-- Create the specific self-view policy (allows viewing even if inactive)
CREATE POLICY "Workers can view their own profile"
  ON public.workers FOR SELECT
  USING (user_id = auth.uid());

-- 2. Create/Update the Secure RPC Function
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
GRANT EXECUTE ON FUNCTION public.get_my_worker_status TO anon; -- Just in case

-- 3. Verify the fix
-- This query shows if the function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_my_worker_status';
